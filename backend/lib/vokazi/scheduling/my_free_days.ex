defmodule Vokazi.Scheduling.MyFreeDays do
  @moduledoc """
  This user's own real free windows for the next few days, grouped by
  date - powers the assisted day-picker shown to a Calendar-connected
  user so they can explicitly choose which days to offer for this
  intro, instead of the system silently using every free minute.
  Scoped short and near-term on purpose: the first intro call should
  happen the same day or within 2-3 days of matching, not get lost
  somewhere a month out.
  """

  alias Vokazi.Repo
  alias Vokazi.PersonalEvents
  alias Vokazi.Scheduling.{CredentialStore, GoogleCalendarClient, IntroSchedule, SlotMatcher}

  @lookahead_days 4
  @business_start_hour 8
  @business_end_hour 18

  @doc """
  `{:ok, [%{date: "2026-07-20", windows: [...], other_offered: %{start:, end:} | nil}, ...]}`
  for the next #{@lookahead_days} days, `{:error, :calendar_not_connected}`
  if this user hasn't linked Calendar for this intro, or
  `{:error, :calendar_reauth_required}` if the stored token can't be used
  for a freebusy lookup (expired/revoked, or - as happened when this
  scope was widened after users had already connected - a stored token
  that predates a scope change). The fix is the same either way: send
  the user back through the consent screen.

  `other_offered` carries the window the other side has *already
  offered* on that date, if any - so the picker can steer this user
  toward days likely to actually overlap instead of two independently
  picked, disjoint sets. This never exposes anything beyond what the
  other side already chose to share.
  """
  def fetch(match, user_id) do
    with {:ok, access_token} <- CredentialStore.token_for(user_id) do
      range_start = DateTime.utc_now()
      range_end = DateTime.add(range_start, @lookahead_days * 24 * 3600, :second)

      case GoogleCalendarClient.freebusy(access_token, range_start, range_end) do
        {:ok, busy} ->
          all_busy = busy ++ personal_event_busy_ranges(user_id, range_start, range_end)
          windows = SlotMatcher.free_windows_from_busy(all_busy, range_start, range_end, @business_start_hour, @business_end_hour)
          {:ok, group_by_date(windows) |> annotate_with_other_offer(match, user_id)}

        {:error, _reason} ->
          {:error, :calendar_reauth_required}
      end
    else
      {:error, :not_connected} -> {:error, :calendar_not_connected}
    end
  end

  # Personal agenda items the user added themselves (Vokazi.PersonalEvents)
  # count as busy time too, same as Google Calendar - so a commitment
  # that isn't on Google (or that this user tracks manually) still keeps
  # this window off the list of days offered for a new intro.
  defp personal_event_busy_ranges(user_id, range_start, range_end) do
    first_date = DateTime.to_date(range_start)
    last_date = DateTime.to_date(range_end)

    user_id
    |> PersonalEvents.list_for_user()
    |> Enum.filter(&(Date.compare(&1.date, first_date) != :lt and Date.compare(&1.date, last_date) != :gt))
    |> Enum.map(fn event ->
      %{
        start: SlotMatcher.nairobi_wall_time_to_utc(event.date, event.start_time) |> DateTime.to_iso8601(),
        end: SlotMatcher.nairobi_wall_time_to_utc(event.date, event.end_time) |> DateTime.to_iso8601()
      }
    end)
  end

  defp group_by_date(windows) do
    windows
    |> Enum.group_by(&Date.to_iso8601(DateTime.to_date(&1.start)))
    |> Enum.map(fn {date, day_windows} ->
      %{
        date: date,
        windows: Enum.map(day_windows, &%{start: DateTime.to_iso8601(&1.start), end: DateTime.to_iso8601(&1.end)})
      }
    end)
    |> Enum.sort_by(& &1.date)
  end

  defp annotate_with_other_offer(days, match, user_id) do
    other_side = if match.user_a_id == user_id, do: :b, else: :a
    schedule = Repo.get_by(IntroSchedule, match_id: match.id)
    other_slots = if schedule, do: Map.get(schedule, :"manual_availability_#{other_side}"), else: []
    other_offered = Map.new(other_slots, &{&1["date"], to_iso_window(&1)})

    Enum.map(days, &Map.put(&1, :other_offered, Map.get(other_offered, &1.date)))
  end

  # Stored slots carry plain "HH:MM" clock strings, not full instants -
  # match the ISO-8601 shape every other timestamp in this response
  # already uses, so the frontend can treat all of them the same way.
  defp to_iso_window(%{"date" => date, "start" => start_time, "end" => end_time}) do
    parsed_date = Date.from_iso8601!(date)

    %{
      start: SlotMatcher.nairobi_wall_time_to_utc(parsed_date, Time.from_iso8601!(start_time <> ":00")) |> DateTime.to_iso8601(),
      end: SlotMatcher.nairobi_wall_time_to_utc(parsed_date, Time.from_iso8601!(end_time <> ":00")) |> DateTime.to_iso8601()
    }
  end
end
