defmodule Vokazi.BuddyPairings do
  @moduledoc """
  Member-facing side of the Bizi Buddy System (kuzana_playbook.md §6) -
  currently just the early-warning flag. Pairing itself is staff-only
  (`Vokazi.Admin.BuddyPairings`); this module is what a member can do
  about a pairing they're already in.
  """

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Matchmaking.Match
  alias Vokazi.Notifications
  alias Vokazi.BuddyPairings.BuddyConcern

  @doc """
  "Buddies raise real concerns to the Kuzana team if they observe risk
  to their partner's business" - visible only to Moderator+ staff, never
  to the other buddy, matching the Playbook's own confidentiality rule.
  Notifies every active Moderator+ admin so it doesn't sit unseen.
  """
  def flag_concern(match_id, reporter_id, message) do
    case Repo.get(Match, match_id) do
      nil ->
        {:error, :not_found}

      %Match{pairing_kind: "buddy"} = match when reporter_id in [match.user_a_id, match.user_b_id] ->
        %BuddyConcern{}
        |> BuddyConcern.changeset(%{match_id: match_id, reporter_id: reporter_id, message: message})
        |> Repo.insert()
        |> case do
          {:ok, concern} ->
            notify_moderators(match)
            {:ok, concern}

          {:error, changeset} ->
            {:error, changeset}
        end

      %Match{pairing_kind: "buddy"} ->
        {:error, :not_a_participant}

      _match ->
        {:error, :not_a_buddy_pairing}
    end
  end

  defp notify_moderators(_match) do
    from(u in User, where: not is_nil(u.admin_role) and u.admin_role in ["moderator", "superadmin"] and u.admin_status == "active")
    |> Repo.all()
    |> Enum.each(fn admin ->
      Notifications.notify(admin.id, "buddy_concern", "A buddy-pairing concern was raised - review it in the admin panel.", nil)
    end)
  end
end
