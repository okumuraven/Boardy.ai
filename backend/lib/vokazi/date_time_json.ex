defmodule Vokazi.DateTimeJSON do
  @moduledoc """
  Every timestamp in this app is a naive `NaiveDateTime` (Ecto's default
  for `timestamps()`), but the actual wall-clock value stored is always
  UTC (Postgres/Ecto convention - never local time). A plain
  `NaiveDateTime` serializes to JSON with no timezone marker at all
  (e.g. "2026-07-24T09:48:30"), and every `new Date(...)` call on the
  frontend then silently treats that as *local* time (the JS spec's
  behavior for a date-time string with no offset), not UTC - shifting
  every displayed timestamp by the viewer's own UTC offset, and
  sometimes rolling the displayed date onto the wrong day entirely for
  anything that happened late at night. Call `utc/1` at every JSON
  serialization boundary instead of exposing the raw struct.
  """

  def utc(nil), do: nil
  def utc(%NaiveDateTime{} = naive), do: NaiveDateTime.to_iso8601(naive) <> "Z"
  def utc(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
end
