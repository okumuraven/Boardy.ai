defmodule Vokazi.Scheduling.SlotMatcher do
  @moduledoc """
  Pure logic: turns each side's availability (Calendar free windows
  and/or manually-entered slots) into a ranked list of mutual candidate
  meeting times. No I/O, no persistence - kept separate from
  `Vokazi.Scheduling` so the interval math is trivially testable on its
  own.
  """

  @slot_duration_minutes 30
  @max_proposals 3

  # Kenya has no DST, so a fixed UTC+3 offset is safe for the app's
  # actual user base - a full per-user timezone system (a `timezone`
  # field on the user, an IANA tz database dependency) is more than this
  # needs right now. Every clock-face string in this module (manually
  # typed availability, business hours) is entered by an East African
  # user in their own local time, not UTC - treating it as literal UTC
  # (as this module used to) silently shifted every proposed slot by 3
  # hours from what either side actually meant.
  @nairobi_offset_seconds 3 * 3600

  @doc """
  `windows_a` and `windows_b` are each a list of `%{start: DateTime.t(),
  end: DateTime.t()}` free windows. Returns up to #{@max_proposals}
  candidate `%{start:, end:}` slots that fit inside an overlap on both
  sides, earliest first.
  """
  def propose_slots(windows_a, windows_b) do
    for a <- windows_a,
        b <- windows_b,
        overlap = overlap(a, b),
        not is_nil(overlap),
        DateTime.diff(overlap.end, overlap.start, :minute) >= @slot_duration_minutes do
      %{start: overlap.start, end: DateTime.add(overlap.start, @slot_duration_minutes * 60, :second)}
    end
    |> Enum.sort_by(& &1.start, DateTime)
    |> Enum.take(@max_proposals)
  end

  defp overlap(%{start: s1, end: e1}, %{start: s2, end: e2}) do
    start_at = if DateTime.compare(s1, s2) == :gt, do: s1, else: s2
    end_at = if DateTime.compare(e1, e2) == :lt, do: e1, else: e2

    if DateTime.compare(start_at, end_at) == :lt, do: %{start: start_at, end: end_at}, else: nil
  end

  @doc """
  Inverts Google's *busy* ranges into free windows within
  `[range_start, range_end]`, clipped to business hours each day so we
  never propose a 3am slot just because someone's calendar happened to
  be empty then.
  """
  def free_windows_from_busy(busy_ranges, range_start, range_end, business_start_hour \\ 8, business_end_hour \\ 18) do
    range_start
    |> business_hour_windows(range_end, business_start_hour, business_end_hour)
    |> subtract_busy(parse_busy(busy_ranges))
  end

  @doc """
  Builds free windows directly from manually-entered availability
  (`%{"date" => "2026-08-01", "start" => "14:00", "end" => "17:00"}`) -
  the fallback path when a user declines/lacks Calendar access.
  """
  def free_windows_from_manual(manual_slots) do
    Enum.map(manual_slots, fn slot ->
      date = Date.from_iso8601!(slot["date"])
      %{
        start: nairobi_wall_time_to_utc(date, Time.from_iso8601!(slot["start"] <> ":00")),
        end: nairobi_wall_time_to_utc(date, Time.from_iso8601!(slot["end"] <> ":00"))
      }
    end)
  end

  @doc """
  Converts a `Date` + `Time` that represents Africa/Nairobi wall-clock
  time into the real UTC `DateTime` it corresponds to. See the
  `@nairobi_offset_seconds` module note above for why this is a fixed
  offset rather than a full timezone lookup.
  """
  def nairobi_wall_time_to_utc(%Date{} = date, %Time{} = time) do
    date
    |> DateTime.new!(time, "Etc/UTC")
    |> DateTime.add(-@nairobi_offset_seconds, :second)
  end

  defp business_hour_windows(range_start, range_end, start_hour, end_hour) do
    # range_start/range_end are real UTC instants (e.g. "now" from a
    # Calendar freebusy query) - convert to the Nairobi-local date before
    # ranging over days, so a query made shortly after UTC midnight
    # doesn't start a day early relative to what's actually "today" in
    # Nairobi.
    first_date = range_start |> DateTime.add(@nairobi_offset_seconds, :second) |> DateTime.to_date()
    last_date = range_end |> DateTime.add(@nairobi_offset_seconds, :second) |> DateTime.to_date()

    Date.range(first_date, last_date)
    |> Enum.map(fn date ->
      %{
        start: nairobi_wall_time_to_utc(date, Time.new!(start_hour, 0, 0)),
        end: nairobi_wall_time_to_utc(date, Time.new!(end_hour, 0, 0))
      }
    end)
  end

  defp parse_busy(busy_ranges) do
    Enum.map(busy_ranges, fn %{start: s, end: e} ->
      {:ok, start_dt, _} = DateTime.from_iso8601(s)
      {:ok, end_dt, _} = DateTime.from_iso8601(e)
      %{start: start_dt, end: end_dt}
    end)
  end

  defp subtract_busy(windows, busy) do
    Enum.flat_map(windows, fn window -> Enum.reduce(busy, [window], &subtract_one/2) end)
  end

  defp subtract_one(busy, windows) do
    Enum.flat_map(windows, fn window ->
      case overlap(window, busy) do
        nil ->
          [window]

        %{start: os, end: oe} ->
          [
            if(DateTime.compare(window.start, os) == :lt, do: %{start: window.start, end: os}),
            if(DateTime.compare(oe, window.end) == :lt, do: %{start: oe, end: window.end})
          ]
          |> Enum.reject(&is_nil/1)
      end
    end)
  end
end
