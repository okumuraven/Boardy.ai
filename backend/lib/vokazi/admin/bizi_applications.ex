defmodule Vokazi.Admin.BiziApplications do
  @moduledoc """
  The Bizi verification pipeline (bizi_verification_system.md) - staff
  review of real accelerator applications, staged to match Kuzana's own
  real process (bizi_verification.md). Every mutation is audit-logged
  atomically via Ecto.Multi, same convention as the rest of
  `Vokazi.Admin.*`. Tier enforcement (Moderator+ for most actions,
  Superadmin-only for the final decision) happens in the controller -
  this module trusts the caller already checked that.
  """

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Bizi.{Application, StageEvent, Reference, Document}
  alias Vokazi.Chat.ChatRoom
  alias Vokazi.Admin.AuditLog

  @per_page 25
  # An application idle in a non-terminal stage past this many days is
  # flagged "stuck" in the list view - mirrors the same concept already
  # built for Members (Vokazi.Admin.Members' :stuck filter).
  @stuck_after_days 5

  @doc "`opts` (all optional): :page."
  def list_applications(opts \\ %{}) do
    page = max(Map.get(opts, :page, 1), 1)

    base_query = from(a in Application)
    total_count = base_query |> select([a], count(a.id)) |> Repo.one()

    rows =
      base_query
      |> order_by([a], desc: a.inserted_at)
      |> limit(^@per_page)
      |> offset(^((page - 1) * @per_page))
      |> Repo.all()

    %{
      applications: Enum.map(rows, &to_summary/1),
      page: page,
      per_page: @per_page,
      total_count: total_count,
      total_pages: max(ceil(total_count / @per_page), 1)
    }
  end

  def get_application(id) do
    case Repo.get(Application, id) do
      nil -> {:error, :not_found}
      application -> {:ok, to_detail(application)}
    end
  end

  @doc """
  Moderator+ - moves an application to a new stage and writes the
  timeline entry in the same transaction. `comment` is staff-only
  narrative, never shown to the applicant (bizi_verification_system.md
  §5's boundary between this and the verification chat).
  """
  def advance_stage(admin_id, application_id, new_status, comment, opts \\ %{}) do
    case Repo.get(Application, application_id) do
      nil ->
        {:error, :not_found}

      application ->
        from_status = application.status
        # revenue_verified rides along here rather than getting its own
        # endpoint - it's a fact staff establish while working the
        # verification stage, not an independent workflow step.
        # Ecto.Changeset.cast/3 rejects a map with mixed atom/string keys
        # outright - "status" here, not :status, to match opts' string
        # keys (caught by actually running this, not by reading it).
        application_attrs =
          %{"status" => new_status}
          |> maybe_put("revenue_verified", Map.get(opts, "revenue_verified"))

        Ecto.Multi.new()
        |> Ecto.Multi.update(:application, Application.admin_changeset(application, application_attrs))
        |> Ecto.Multi.insert(:stage_event, fn _ ->
          StageEvent.changeset(%StageEvent{}, %{
            bizi_application_id: application.id,
            kind: "stage_change",
            from_status: from_status,
            to_status: new_status,
            performed_by_admin_id: admin_id,
            comment: comment
          })
        end)
        |> Ecto.Multi.insert(:audit_log, fn _ ->
          AuditLog.changeset(%AuditLog{}, %{
            admin_user_id: admin_id,
            action: "bizi_application.advance_stage",
            target_type: "bizi_application",
            target_id: application.id,
            metadata: %{"from" => from_status, "to" => new_status}
          })
        end)
        |> Repo.transaction()
        |> case do
          {:ok, %{application: updated}} -> {:ok, updated}
          {:error, _step, changeset, _changes} -> {:error, changeset}
        end
    end
  end

  @doc "Moderator+ - assigns a named owner (any Moderator can still act regardless; this is visibility, not an access lock)."
  def assign(admin_id, application_id, assignee_admin_id) do
    case Repo.get(Application, application_id) do
      nil ->
        {:error, :not_found}

      application ->
        Ecto.Multi.new()
        |> Ecto.Multi.update(:application, Application.admin_changeset(application, %{assigned_to_admin_id: assignee_admin_id}))
        |> Ecto.Multi.insert(:audit_log, fn _ ->
          AuditLog.changeset(%AuditLog{}, %{
            admin_user_id: admin_id,
            action: "bizi_application.assign",
            target_type: "bizi_application",
            target_id: application.id,
            metadata: %{"assigned_to_admin_id" => assignee_admin_id}
          })
        end)
        |> Repo.transaction()
        |> case do
          {:ok, %{application: updated}} -> {:ok, updated}
          {:error, _step, changeset, _changes} -> {:error, changeset}
        end
    end
  end

  @doc "Moderator+ - adds one reference (customer or creditor) to the checklist."
  def add_reference(admin_id, application_id, attrs) do
    %Reference{}
    |> Reference.changeset(Map.put(attrs, "bizi_application_id", application_id))
    |> Repo.insert()
    |> case do
      {:ok, reference} ->
        log_read_side_effect(admin_id, "bizi_application.add_reference", "bizi_application", application_id, %{
          "reference_id" => reference.id
        })

        {:ok, reference}

      error ->
        error
    end
  end

  @doc "Moderator+ - marks a reference contacted/verified, or edits notes."
  def update_reference(admin_id, reference_id, attrs) do
    case Repo.get(Reference, reference_id) do
      nil ->
        {:error, :not_found}

      reference ->
        reference
        |> Reference.changeset(attrs)
        |> Repo.update()
        |> case do
          {:ok, updated} ->
            log_read_side_effect(admin_id, "bizi_application.update_reference", "bizi_application", updated.bizi_application_id, %{
              "reference_id" => updated.id
            })

            {:ok, updated}

          error ->
            error
        end
    end
  end

  @doc """
  Get-or-create the one verification chat room for this application
  (Phase C, bizi_verification_build_plan.md) - the applicant on one
  side, any active admin on the other (`Vokazi.Chat.participant?/2`).
  Called both from here (admin detail view) and from the member-facing
  controller, so both sides always land in the same room.
  """
  def open_verification_chat(application_id) do
    case Repo.get_by(ChatRoom, bizi_application_id: application_id) do
      nil ->
        %ChatRoom{}
        |> ChatRoom.changeset(%{is_active: true, bizi_application_id: application_id})
        |> Repo.insert()

      room ->
        {:ok, room}
    end
  end

  @doc "Moderator+ - tags an attachment already sitting in the verification chat as one of Kuzana's real document types."
  def tag_document(admin_id, application_id, message_attachment_id, document_type) do
    %Document{}
    |> Document.changeset(%{
      bizi_application_id: application_id,
      message_attachment_id: message_attachment_id,
      document_type: document_type,
      tagged_by_admin_id: admin_id
    })
    |> Repo.insert()
    |> case do
      {:ok, document} ->
        log_read_side_effect(admin_id, "bizi_application.tag_document", "bizi_application", application_id, %{
          "document_type" => document_type
        })

        {:ok, document}

      error ->
        error
    end
  end

  defp list_documents(application_id) do
    Document
    |> where([d], d.bizi_application_id == ^application_id)
    |> order_by([d], desc: d.inserted_at)
    |> preload(:message_attachment)
    |> Repo.all()
    |> Enum.map(fn d ->
      %{
        id: d.id,
        document_type: d.document_type,
        attachment_id: d.message_attachment_id,
        filename: d.message_attachment.filename,
        tagged_by: admin_summary(d.tagged_by_admin_id),
        inserted_at: d.inserted_at
      }
    end)
  end

  @doc """
  Superadmin only (checked by the controller) - the one action that both
  writes a permanent board decision and, on approval, flips `is_bizi` on
  a real member's profile. Both happen atomically: an approval that
  somehow failed to flag the member would be worse than not approving at
  all.
  """
  def record_decision(admin_id, application_id, decision, reason) when decision in ["approved", "declined"] do
    do_record_decision(admin_id, application_id, decision, reason)
  end

  def record_decision(_admin_id, _application_id, _decision, _reason), do: {:error, :invalid_decision}

  defp do_record_decision(admin_id, application_id, decision, reason) do
    case Repo.get(Application, application_id) do
      nil ->
        {:error, :not_found}

      application ->
        now = DateTime.utc_now() |> DateTime.truncate(:second)

        Ecto.Multi.new()
        |> Ecto.Multi.update(
          :application,
          Application.admin_changeset(application, %{
            status: decision,
            board_decision_reason: reason,
            decided_by_admin_id: admin_id,
            decided_at: now
          })
        )
        |> Ecto.Multi.insert(:stage_event, fn _ ->
          StageEvent.changeset(%StageEvent{}, %{
            bizi_application_id: application.id,
            kind: "decision",
            from_status: application.status,
            to_status: decision,
            performed_by_admin_id: admin_id,
            comment: reason
          })
        end)
        |> maybe_flag_bizi(decision, application.user_id)
        |> Ecto.Multi.insert(:audit_log, fn _ ->
          AuditLog.changeset(%AuditLog{}, %{
            admin_user_id: admin_id,
            action: "bizi_application.decision",
            target_type: "bizi_application",
            target_id: application.id,
            metadata: %{"decision" => decision, "reason" => reason}
          })
        end)
        |> Repo.transaction()
        |> case do
          {:ok, %{application: updated}} -> {:ok, updated}
          {:error, _step, changeset, _changes} -> {:error, changeset}
        end
    end
  end

  defp maybe_flag_bizi(multi, "approved", user_id) do
    Ecto.Multi.update(multi, :user, fn _ ->
      user = Repo.get!(User, user_id)
      now = DateTime.utc_now() |> DateTime.truncate(:second)
      User.admin_changeset(user, %{is_bizi: true, bizi_approved_at: now})
    end)
  end

  defp maybe_flag_bizi(multi, _decision, _user_id), do: multi

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  defp log_read_side_effect(admin_id, action, target_type, target_id, metadata) do
    %AuditLog{}
    |> AuditLog.changeset(%{admin_user_id: admin_id, action: action, target_type: target_type, target_id: target_id, metadata: metadata})
    |> Repo.insert()
  end

  defp to_summary(application) do
    %{
      id: application.id,
      applicant: applicant_summary(application.user_id),
      company_name: application.company_name,
      track: application.track,
      batch_target: application.batch_target,
      status: application.status,
      assigned_to: admin_summary(application.assigned_to_admin_id),
      stuck: stuck?(application),
      inserted_at: application.inserted_at
    }
  end

  defp to_detail(application) do
    %{
      id: application.id,
      applicant: applicant_summary(application.user_id),
      preferred_name: application.preferred_name,
      other_names: application.other_names,
      email: application.email,
      whatsapp: application.whatsapp,
      company_name: application.company_name,
      business_description: application.business_description,
      track: application.track,
      heard_about_us: application.heard_about_us,
      referred_by: application.referred_by,
      eligibility: application.eligibility,
      question_for_us: application.question_for_us,
      batch_target: application.batch_target,
      status: application.status,
      assigned_to: admin_summary(application.assigned_to_admin_id),
      revenue_verified: application.revenue_verified,
      board_decision_reason: application.board_decision_reason,
      decided_by: admin_summary(application.decided_by_admin_id),
      decided_at: application.decided_at,
      stuck: stuck?(application),
      references: list_references(application.id),
      stage_events: list_stage_events(application.id),
      chat_room_id: verification_chat_room_id(application.id),
      documents: list_documents(application.id),
      inserted_at: application.inserted_at
    }
  end

  # get_application/1 is a plain read (this is a GET endpoint), but the
  # verification room genuinely needs to exist by the time the admin
  # detail view wants to embed it - get-or-create is idempotent and
  # never mutates anything once the room's there, same reasoning as any
  # other lazy-create-on-first-view pattern already in this codebase
  # (e.g. Vokazi.Chat.create_chat_room for a freshly-unlocked match).
  defp verification_chat_room_id(application_id) do
    {:ok, room} = open_verification_chat(application_id)
    room.id
  end

  defp list_references(application_id) do
    Reference
    |> where([r], r.bizi_application_id == ^application_id)
    |> order_by([r], asc: r.inserted_at)
    |> Repo.all()
    |> Enum.map(fn r ->
      %{id: r.id, reference_type: r.reference_type, name: r.name, phone: r.phone, contacted: r.contacted, verified: r.verified, notes: r.notes}
    end)
  end

  defp list_stage_events(application_id) do
    StageEvent
    |> where([e], e.bizi_application_id == ^application_id)
    |> order_by([e], desc: e.inserted_at)
    |> Repo.all()
    |> Enum.map(fn e ->
      %{
        id: e.id,
        kind: e.kind,
        from_status: e.from_status,
        to_status: e.to_status,
        performed_by: admin_summary(e.performed_by_admin_id),
        comment: e.comment,
        inserted_at: e.inserted_at
      }
    end)
  end

  @terminal_statuses ["approved", "declined"]

  defp stuck?(application) do
    if application.status in @terminal_statuses do
      false
    else
      last_event_at =
        StageEvent
        |> where([e], e.bizi_application_id == ^application.id)
        |> select([e], max(e.inserted_at))
        |> Repo.one()

      reference_time = last_event_at || application.updated_at
      DateTime.diff(DateTime.utc_now(), to_utc(reference_time), :day) >= @stuck_after_days
    end
  end

  defp to_utc(%NaiveDateTime{} = naive), do: DateTime.from_naive!(naive, "Etc/UTC")
  defp to_utc(%DateTime{} = dt), do: dt

  defp applicant_summary(user_id) do
    case Repo.get(User, user_id) do
      nil -> %{id: user_id, name: nil, email: nil}
      user -> %{id: user.id, name: user.full_name, email: user.email}
    end
  end

  defp admin_summary(nil), do: nil

  defp admin_summary(admin_id) do
    case Repo.get(User, admin_id) do
      nil -> nil
      admin -> %{id: admin.id, name: admin.full_name || admin.email}
    end
  end
end
