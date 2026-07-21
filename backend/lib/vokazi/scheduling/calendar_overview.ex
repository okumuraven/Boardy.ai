defmodule Vokazi.Scheduling.CalendarOverview do
  @moduledoc """
  Aggregates scheduling state *across* all of a user's matches - the
  source for the Calendar tab. Everywhere else in `Vokazi.Scheduling`
  operates on one match at a time; this is the one place that looks
  across all of them, kept separate so that single-match logic doesn't
  have to think about aggregation at all.
  """

  import Ecto.Query, warn: false
  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Matchmaking.Match
  alias Vokazi.Scheduling.IntroSchedule

  @doc """
  Every unlocked match's scheduling state for this user. Matches with
  no `IntroSchedule` row yet (nobody has opened the Schedule panel for
  them) come back as `status: "not_started"` rather than being
  omitted, so the Calendar view can prompt starting it instead of
  just going quiet about matches that haven't gotten there.
  """
  def list_for_user(user_id) do
    Match
    |> where([m], (m.user_a_id == ^user_id or m.user_b_id == ^user_id) and m.status == "unlocked")
    |> Repo.all()
    |> Enum.map(&summarize(&1, user_id))
    |> Enum.sort_by(&sort_key/1)
  end

  defp summarize(match, user_id) do
    other_user_id = if match.user_a_id == user_id, do: match.user_b_id, else: match.user_a_id
    other_user = Repo.get(User, other_user_id)
    schedule = Repo.get_by(IntroSchedule, match_id: match.id)

    %{
      match_id: match.id,
      other_user: %{name: other_user && other_user.full_name},
      status: (schedule && schedule.status) || "not_started",
      proposed_slots: (schedule && schedule.proposed_slots) || [],
      confirmed_start: schedule && schedule.confirmed_start,
      confirmed_end: schedule && schedule.confirmed_end,
      google_meet_link: schedule && schedule.google_meet_link
    }
  end

  # Confirmed calls first (soonest first), then anything still in
  # progress, then matches that haven't started scheduling at all.
  defp sort_key(%{status: "confirmed", confirmed_start: start}), do: {0, start}
  defp sort_key(%{status: "not_started"}), do: {2, nil}
  defp sort_key(_), do: {1, nil}
end
