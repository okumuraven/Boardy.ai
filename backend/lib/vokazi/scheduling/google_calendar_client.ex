defmodule Vokazi.Scheduling.GoogleCalendarClient do
  @moduledoc """
  Thin Google Calendar API wrapper (freebusy lookups + real event
  creation). Every call takes a fresh, valid access token; refreshing an
  expired one is the caller's job (`Vokazi.Scheduling.CredentialStore.token_for/1`),
  so this stays a pure HTTP client with no token-lifecycle concerns of
  its own - mirrors the "thin wrapper" style of `Vokazi.SocialProfiles.GithubClient`.
  """

  require Logger

  @freebusy_url "https://www.googleapis.com/calendar/v3/freeBusy"
  @events_url "https://www.googleapis.com/calendar/v3/calendars/primary/events"

  @doc """
  Busy ranges Google reports on the user's primary calendar between
  `time_min` and `time_max` (both `DateTime`). The caller inverts these
  into free windows (`Vokazi.Scheduling.SlotMatcher.free_windows_from_busy/5`).
  """
  def freebusy(access_token, time_min, time_max) do
    body = %{
      timeMin: DateTime.to_iso8601(time_min),
      timeMax: DateTime.to_iso8601(time_max),
      items: [%{id: "primary"}]
    }

    case Req.post(@freebusy_url, json: body, auth: {:bearer, access_token}, receive_timeout: 30_000) do
      {:ok, %Req.Response{status: 200, body: %{"calendars" => %{"primary" => %{"busy" => busy}}}}} ->
        {:ok, Enum.map(busy, &%{start: &1["start"], end: &1["end"]})}

      other ->
        Logger.error("Vokazi.Scheduling.GoogleCalendarClient: freebusy failed: #{inspect(other)}")
        {:error, :freebusy_failed}
    end
  end

  @doc """
  Creates the real calendar event with both people's Google emails as
  attendees and a Google Meet link auto-generated. Runs once, on
  whichever side's token we have - the other person still gets a real
  Google Calendar invite emailed to them as an attendee, even without
  their own token.
  """
  def insert_event(access_token, %{
        summary: summary,
        description: description,
        start_time: start_time,
        end_time: end_time,
        attendee_emails: attendee_emails
      }) do
    body = %{
      summary: summary,
      description: description,
      start: %{dateTime: DateTime.to_iso8601(start_time)},
      end: %{dateTime: DateTime.to_iso8601(end_time)},
      attendees: Enum.map(attendee_emails, &%{email: &1}),
      conferenceData: %{createRequest: %{requestId: Ecto.UUID.generate()}}
    }

    url = @events_url <> "?conferenceDataVersion=1&sendUpdates=all"

    case Req.post(url, json: body, auth: {:bearer, access_token}, receive_timeout: 30_000) do
      {:ok, %Req.Response{status: status, body: %{"id" => event_id} = resp}} when status in [200, 201] ->
        meet_link = get_in(resp, ["conferenceData", "entryPoints", Access.at(0), "uri"])
        {:ok, %{event_id: event_id, meet_link: meet_link}}

      other ->
        Logger.error("Vokazi.Scheduling.GoogleCalendarClient: insert_event failed: #{inspect(other)}")
        {:error, :event_creation_failed}
    end
  end
end
