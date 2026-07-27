defmodule Vokazi.Admin.Matches do
  @moduledoc """
  Match search/detail/outcome-recording for the bounty-evidence surface
  (`kuzana_playbook.md` §6's Strategy Board precedent, digitized). See
  "Admin panel.md" §7.
  """

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Matchmaking.Match
  alias Vokazi.Chat.{ChatRoom, Message}
  alias Vokazi.Admin.AuditLog

  @per_page 25
  # §7.2 - an unlocked match with fewer than this many messages exchanged
  # after this many days is a worklist candidate, not a firehose entry.
  @dormant_days 14
  @dormant_message_threshold 2

  @doc "`opts` (all optional): :status, :outcome_status, :created_by_admin (boolean), :page."
  def list_matches(opts \\ %{}) do
    page = max(Map.get(opts, :page, 1), 1)
    status = blank_to_nil(Map.get(opts, :status))
    outcome_status = blank_to_nil(Map.get(opts, :outcome_status))
    created_by_admin = Map.get(opts, :created_by_admin)

    base_query =
      from(m in Match)
      |> maybe_filter_status(status)
      |> maybe_filter_outcome(outcome_status)
      |> maybe_filter_created_by_admin(created_by_admin)

    total_count = base_query |> select([m], count(m.id)) |> Repo.one()

    rows =
      base_query
      |> order_by([m], desc: m.updated_at)
      |> limit(^@per_page)
      |> offset(^((page - 1) * @per_page))
      |> Repo.all()

    %{
      matches: Enum.map(rows, &to_summary/1),
      page: page,
      per_page: @per_page,
      total_count: total_count,
      total_pages: max(ceil(total_count / @per_page), 1)
    }
  end

  defp to_summary(match) do
    user_a = Repo.get(User, match.user_a_id)
    user_b = Repo.get(User, match.user_b_id)

    %{
      id: match.id,
      status: match.status,
      ai_score: match.ai_score,
      user_a: %{id: match.user_a_id, name: user_a && user_a.full_name},
      user_b: %{id: match.user_b_id, name: user_b && user_b.full_name},
      created_by_admin_id: match.created_by_admin_id,
      outcome_status: match.outcome_status,
      updated_at: match.updated_at,
      inserted_at: match.inserted_at
    }
    |> Map.merge(engagement_for(match))
  end

  # §7.2 - computed from existing chat_rooms/messages, no schema change.
  # nil for anything that isn't unlocked (no chat room can exist yet).
  defp engagement_for(%Match{status: "unlocked", id: match_id, updated_at: unlocked_at}) do
    case Repo.get_by(ChatRoom, match_id: match_id) do
      nil ->
        %{message_count: 0, last_message_at: nil, dormant: true}

      room ->
        message_count = Repo.aggregate(from(msg in Message, where: msg.chat_room_id == ^room.id), :count)

        last_message_at =
          Repo.one(
            from(msg in Message,
              where: msg.chat_room_id == ^room.id,
              order_by: [desc: msg.inserted_at],
              limit: 1,
              select: msg.inserted_at
            )
          )

        %{
          message_count: message_count,
          last_message_at: last_message_at,
          dormant: dormant?(last_message_at || unlocked_at, message_count)
        }
    end
  end

  defp engagement_for(_match), do: %{message_count: nil, last_message_at: nil, dormant: nil}

  defp dormant?(reference_time, message_count) do
    days_since = NaiveDateTime.diff(NaiveDateTime.utc_now(), reference_time, :day)
    days_since > @dormant_days and message_count < @dormant_message_threshold
  end

  def get_match(id) do
    case Repo.get(Match, id) do
      nil ->
        nil

      match ->
        user_a = Repo.get(User, match.user_a_id)
        user_b = Repo.get(User, match.user_b_id)

        %{
          match: match,
          user_a: user_a,
          user_b: user_b,
          engagement: engagement_for(match)
        }
    end
  end

  @doc """
  Moderator+ only (checked by the controller) - creates a `pending_consent`
  match directly between two chosen members, skipping the AI-validation
  floor entirely (this *is* the human judgment the floor exists to
  approximate when it fails). Still proceeds through the normal
  mutual-consent flow afterward. See "Admin panel.md" §7.3.
  """
  def create_manual_match(admin_id, user_a_id, user_b_id, creation_note) do
    cond do
      user_a_id == user_b_id ->
        {:error, :cannot_match_self}

      existing = find_existing_match(user_a_id, user_b_id) ->
        {:error, {:already_matched, existing}}

      true ->
        do_create_manual_match(admin_id, user_a_id, user_b_id, creation_note)
    end
  end

  # The unique index is on (user_a_id, user_b_id) in that exact order - it
  # doesn't by itself prevent a reverse-order duplicate, same reason
  # Vokazi.Matchmaking.request_match/2 checks both orderings explicitly.
  defp find_existing_match(id_a, id_b) do
    Repo.one(
      from(m in Match,
        where: (m.user_a_id == ^id_a and m.user_b_id == ^id_b) or (m.user_a_id == ^id_b and m.user_b_id == ^id_a),
        limit: 1
      )
    )
  end

  defp do_create_manual_match(admin_id, user_a_id, user_b_id, creation_note) do
    Ecto.Multi.new()
    |> Ecto.Multi.insert(
      :match,
      Match.changeset(%Match{}, %{
        user_a_id: user_a_id,
        user_b_id: user_b_id,
        similarity_score: 0.0,
        status: "pending_consent"
      })
    )
    |> Ecto.Multi.update(:match_admin_fields, fn %{match: match} ->
      Match.admin_changeset(match, %{created_by_admin_id: admin_id, creation_note: creation_note})
    end)
    |> Ecto.Multi.insert(:audit_log, fn %{match_admin_fields: match} ->
      AuditLog.changeset(%AuditLog{}, %{
        admin_user_id: admin_id,
        action: "match.create",
        target_type: "match",
        target_id: match.id,
        reason: creation_note,
        metadata: %{"user_a_id" => user_a_id, "user_b_id" => user_b_id}
      })
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{match_admin_fields: match}} -> {:ok, match}
      {:error, _step, changeset, _changes} -> {:error, changeset}
    end
  end

  @doc """
  Moderator+ only (checked by the controller) - the literal evidence
  trail for the bounty's "5 meaningful introductions verified as useful
  by both parties" requirement. Audit-logged atomically - the outcome
  cannot be recorded without its audit row, or vice versa. See
  "Admin panel.md" §7.1.
  """
  def record_outcome(match_id, admin_id, outcome_status, notes) do
    match = Repo.get!(Match, match_id)

    Ecto.Multi.new()
    |> Ecto.Multi.update(
      :match,
      Match.admin_changeset(match, %{
        outcome_status: outcome_status,
        outcome_notes: notes,
        outcome_recorded_by_id: admin_id,
        outcome_recorded_at: DateTime.utc_now() |> DateTime.truncate(:second)
      })
    )
    |> Ecto.Multi.insert(:audit_log, fn %{match: updated} ->
      AuditLog.changeset(%AuditLog{}, %{
        admin_user_id: admin_id,
        action: "match.record_outcome",
        target_type: "match",
        target_id: updated.id,
        reason: notes,
        metadata: %{"outcome_status" => outcome_status}
      })
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{match: updated}} -> {:ok, updated}
      {:error, _step, changeset, _changes} -> {:error, changeset}
    end
  end

  @doc """
  Aggregate `decline_reason` counts across every declined match - §7.4,
  a read-only rollup of data `Matchmaking.respond_to_match/4` already
  captures "for tuning future matching," never before surfaced in
  aggregate. Directly produces the bounty's "documentation of the
  matching logic and how it improves with more data" ask.
  """
  def decline_reasons do
    from(m in Match,
      where: m.status == "declined" and not is_nil(m.decline_reason),
      group_by: m.decline_reason,
      select: {m.decline_reason, count(m.id)},
      order_by: [desc: count(m.id)]
    )
    |> Repo.all()
    |> Enum.map(fn {reason, count} -> %{reason: reason, count: count} end)
  end

  defp blank_to_nil(nil), do: nil
  defp blank_to_nil(""), do: nil
  defp blank_to_nil(value), do: value

  defp maybe_filter_status(query, nil), do: query
  defp maybe_filter_status(query, status), do: where(query, [m], m.status == ^status)

  defp maybe_filter_outcome(query, nil), do: query
  defp maybe_filter_outcome(query, outcome), do: where(query, [m], m.outcome_status == ^outcome)

  defp maybe_filter_created_by_admin(query, nil), do: query
  defp maybe_filter_created_by_admin(query, true), do: where(query, [m], not is_nil(m.created_by_admin_id))
  defp maybe_filter_created_by_admin(query, false), do: where(query, [m], is_nil(m.created_by_admin_id))
end
