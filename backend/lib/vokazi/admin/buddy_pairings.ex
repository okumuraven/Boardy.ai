defmodule Vokazi.Admin.BuddyPairings do
  @moduledoc """
  Bizi Buddy System (kuzana_playbook.md §6) - Moderator+ staff pair two
  members as accountability buddies (cross-company, same-batch). A
  pairing reuses the existing Match + Chat infrastructure rather than a
  parallel system (see "things to add.md" #2): it IS a Match row, tagged
  `pairing_kind: "buddy"`, created straight into `"unlocked"` status
  with its chat room made immediately - staff already made the human
  judgment call here, the same reasoning manual match creation (§7.3)
  already uses to skip the AI floor, so there's no accept/decline dance
  layered on top of it.
  """

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Matchmaking.Match
  alias Vokazi.Chat
  alias Vokazi.Notifications
  alias Vokazi.Admin.AuditLog
  alias Vokazi.BuddyPairings.BuddyConcern

  @per_page 25

  @doc "`opts` (all optional): :page."
  def list_pairings(opts \\ %{}) do
    page = max(Map.get(opts, :page, 1), 1)

    base_query = from(m in Match, where: m.pairing_kind == "buddy")
    total_count = base_query |> select([m], count(m.id)) |> Repo.one()

    rows =
      base_query
      |> order_by([m], desc: m.inserted_at)
      |> limit(^@per_page)
      |> offset(^((page - 1) * @per_page))
      |> Repo.all()

    %{
      pairings: Enum.map(rows, &to_summary/1),
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
      user_a: %{id: match.user_a_id, name: user_a && user_a.full_name, batch: user_a && user_a.batch},
      user_b: %{id: match.user_b_id, name: user_b && user_b.full_name, batch: user_b && user_b.batch},
      creation_note: match.creation_note,
      created_by_admin_id: match.created_by_admin_id,
      inserted_at: match.inserted_at
    }
  end

  @doc """
  Pairs two members as accountability buddies. Blocks on the same
  company (the Playbook's explicit "different company" rule, when both
  have one on file) or a batch mismatch (the "same batch" rule) - unless
  neither has a batch set at all, in which case there's nothing to
  enforce yet.
  """
  def create_pairing(admin_id, user_a_id, user_b_id, note) do
    cond do
      user_a_id == user_b_id ->
        {:error, :cannot_pair_self}

      existing = find_existing_pairing(user_a_id, user_b_id) ->
        {:error, {:already_paired, existing}}

      true ->
        with {:ok, user_a, user_b} <- fetch_both(user_a_id, user_b_id),
             :ok <- validate_different_company(user_a, user_b),
             :ok <- validate_same_batch(user_a, user_b) do
          do_create_pairing(admin_id, user_a, user_b, note)
        end
    end
  end

  defp fetch_both(id_a, id_b) do
    case {Repo.get(User, id_a), Repo.get(User, id_b)} do
      {nil, _} -> {:error, :not_found}
      {_, nil} -> {:error, :not_found}
      {a, b} -> {:ok, a, b}
    end
  end

  defp validate_different_company(%{company: c}, %{company: c}) when not is_nil(c), do: {:error, :same_company}
  defp validate_different_company(_, _), do: :ok

  defp validate_same_batch(%{batch: nil}, %{batch: nil}), do: :ok
  defp validate_same_batch(%{batch: b}, %{batch: b}) when not is_nil(b), do: :ok
  defp validate_same_batch(_, _), do: {:error, :batch_mismatch}

  # The unique index on matches is (user_a_id, user_b_id) in that exact
  # order - doesn't by itself prevent a reverse-order duplicate, same
  # reason Vokazi.Admin.Matches.create_manual_match/4 checks both.
  defp find_existing_pairing(id_a, id_b) do
    Repo.one(
      from(m in Match,
        where:
          m.pairing_kind == "buddy" and
            ((m.user_a_id == ^id_a and m.user_b_id == ^id_b) or (m.user_a_id == ^id_b and m.user_b_id == ^id_a)),
        limit: 1
      )
    )
  end

  defp do_create_pairing(admin_id, user_a, user_b, note) do
    Ecto.Multi.new()
    |> Ecto.Multi.insert(
      :match,
      Match.changeset(%Match{}, %{
        user_a_id: user_a.id,
        user_b_id: user_b.id,
        similarity_score: 0.0,
        status: "unlocked",
        user_a_response: "accepted",
        user_b_response: "accepted"
      })
    )
    |> Ecto.Multi.update(:match_admin_fields, fn %{match: match} ->
      Match.admin_changeset(match, %{created_by_admin_id: admin_id, creation_note: note, pairing_kind: "buddy"})
    end)
    |> Ecto.Multi.run(:chat_room, fn _repo, %{match_admin_fields: match} ->
      Chat.create_chat_room(%{match_id: match.id, is_active: true})
    end)
    |> Ecto.Multi.insert(:audit_log, fn %{match_admin_fields: match} ->
      AuditLog.changeset(%AuditLog{}, %{
        admin_user_id: admin_id,
        action: "buddy.create_pairing",
        target_type: "match",
        target_id: match.id,
        reason: note,
        metadata: %{"user_a_id" => user_a.id, "user_b_id" => user_b.id}
      })
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{match_admin_fields: match}} ->
        notify_paired(match, user_a, user_b)
        {:ok, match}

      {:error, _step, changeset, _changes} ->
        {:error, changeset}
    end
  end

  defp notify_paired(match, user_a, user_b) do
    Notifications.notify(
      user_a.id,
      "buddy_paired",
      "You've been paired with #{user_b.full_name || "a member"} as an accountability buddy.",
      "/matches/#{match.id}"
    )

    Notifications.notify(
      user_b.id,
      "buddy_paired",
      "You've been paired with #{user_a.full_name || "a member"} as an accountability buddy.",
      "/matches/#{match.id}"
    )
  end

  @doc "Support+ read - every open concern, oldest first (worklist order)."
  def list_open_concerns do
    from(c in BuddyConcern, where: c.status == "open", order_by: [asc: c.inserted_at])
    |> Repo.all()
    |> Enum.map(&concern_summary/1)
  end

  defp concern_summary(concern) do
    match = Repo.get(Match, concern.match_id)
    reporter = Repo.get(User, concern.reporter_id)

    %{
      id: concern.id,
      match_id: concern.match_id,
      reporter: %{id: concern.reporter_id, name: reporter && reporter.full_name},
      other_user_id: match && other_user_id(match, concern.reporter_id),
      message: concern.message,
      status: concern.status,
      inserted_at: concern.inserted_at
    }
  end

  defp other_user_id(%{user_a_id: a, user_b_id: b}, reporter_id) when a == reporter_id, do: b
  defp other_user_id(%{user_a_id: a}, _reporter_id), do: a

  @doc """
  Moderator+ only (checked by the controller) - closes out a concern.
  Audit-logged like every other staff mutation; the reporter is never
  notified who resolved it or how, matching the Playbook's own
  confidentiality rule.
  """
  def resolve_concern(concern_id, admin_id) do
    case Repo.get(BuddyConcern, concern_id) do
      nil ->
        {:error, :not_found}

      concern ->
        Ecto.Multi.new()
        |> Ecto.Multi.update(
          :concern,
          BuddyConcern.resolve_changeset(concern, %{
            status: "resolved",
            resolved_by_id: admin_id,
            resolved_at: DateTime.utc_now() |> DateTime.truncate(:second)
          })
        )
        |> Ecto.Multi.insert(:audit_log, fn %{concern: updated} ->
          AuditLog.changeset(%AuditLog{}, %{
            admin_user_id: admin_id,
            action: "buddy.resolve_concern",
            target_type: "buddy_concern",
            target_id: updated.id
          })
        end)
        |> Repo.transaction()
        |> case do
          {:ok, %{concern: updated}} -> {:ok, updated}
          {:error, _step, changeset, _changes} -> {:error, changeset}
        end
    end
  end
end
