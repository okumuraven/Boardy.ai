defmodule Vokazi.Scheduling.EventFinalizer do
  @moduledoc """
  Background step that runs once both sides have independently picked
  the same proposed slot: creates the real Google Calendar event on
  whichever side has a valid token, inviting the other person by email
  regardless of whether they personally connected Calendar. Triggered
  by `Vokazi.Scheduling`, never called synchronously from a controller.
  """

  require Logger
  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Notifications
  alias Vokazi.Scheduling.{IntroSchedule, CredentialStore, GoogleCalendarClient}

  def maybe_run(match, %{selected_slot_a: a, selected_slot_b: b} = schedule)
      when not is_nil(a) and not is_nil(b) do
    if a["start"] == b["start"] and a["end"] == b["end"] do
      Task.start(fn -> run(match, schedule) end)
    end
  end

  def maybe_run(_match, _schedule), do: :ok

  defp run(match, schedule) do
    {:ok, start_dt, _} = DateTime.from_iso8601(schedule.selected_slot_a["start"])
    {:ok, end_dt, _} = DateTime.from_iso8601(schedule.selected_slot_a["end"])

    user_a = Repo.get!(User, match.user_a_id)
    user_b = Repo.get!(User, match.user_b_id)

    case first_available_token([{:a, match.user_a_id}, {:b, match.user_b_id}]) do
      :none ->
        # Neither side connected Calendar (the fully-manual path) - there's
        # no Google event to create, but the two sides already agreed on a
        # real time, so still confirm it in-app rather than leaving the
        # intro stuck in "slot_proposed" forever with only a silent log
        # line. `google_meet_link` stays nil; the frontend already renders
        # the confirmed panel without a Join button in that case, and each
        # side's `contact_preference` (call/video/chat) covers how they
        # actually connect.
        finalize_without_calendar(schedule, start_dt, end_dt, match, user_a, user_b)

      {side, token} ->
        event_details = %{
          summary: "Vokazi Intro: #{user_a.full_name} <> #{user_b.full_name}",
          description: "Introduced via Vokazi's Trust-Gate matchmaking. Say hello!",
          start_time: start_dt,
          end_time: end_dt,
          attendee_emails: Enum.reject([user_a.email, user_b.email], &is_nil/1)
        }

        finalize_with_token(schedule, token, side, event_details, start_dt, end_dt, match, user_a, user_b)
    end
  end

  defp finalize_without_calendar(schedule, start_dt, end_dt, match, user_a, user_b) do
    schedule
    |> IntroSchedule.changeset(%{status: "confirmed", confirmed_start: start_dt, confirmed_end: end_dt})
    |> Repo.update!()

    notify_confirmed(match, user_a, user_b, start_dt)
  end

  defp finalize_with_token(schedule, token, side, event_details, start_dt, end_dt, match, user_a, user_b) do
    case GoogleCalendarClient.insert_event(token, event_details) do
      {:ok, %{event_id: event_id, meet_link: meet_link}} ->
        schedule
        |> IntroSchedule.changeset(%{
          status: "confirmed",
          confirmed_start: start_dt,
          confirmed_end: end_dt,
          google_meet_link: meet_link,
          google_event_id_a: if(side == :a, do: event_id, else: nil),
          google_event_id_b: if(side == :b, do: event_id, else: nil)
        })
        |> Repo.update!()

        notify_confirmed(match, user_a, user_b, start_dt)

      {:error, reason} ->
        Logger.error("Vokazi.Scheduling.EventFinalizer: event creation failed for match #{match.id}: #{inspect(reason)}")
    end
  end

  # No notification of any kind existed here before - a confirmed intro
  # meeting is exactly the kind of thing easy to miss if not checked
  # in-app, so this also drives the "calendar_slot" email (see
  # Vokazi.Notifications.notify/4's @email_types).
  defp notify_confirmed(match, user_a, user_b, start_dt) do
    nairobi_dt = DateTime.add(start_dt, 3 * 3600, :second)
    when_str = Calendar.strftime(nairobi_dt, "%B %d at %H:%M EAT")
    link = Jason.encode!(%{match_id: match.id})

    Notifications.notify(user_a.id, "calendar_slot", "📅 Your intro with #{other_name(user_b)} is confirmed for #{when_str}", link)
    Notifications.notify(user_b.id, "calendar_slot", "📅 Your intro with #{other_name(user_a)} is confirmed for #{when_str}", link)
  end

  defp other_name(%User{full_name: name}) when is_binary(name) and name != "", do: name
  defp other_name(_), do: "Someone"

  defp first_available_token([]), do: :none

  defp first_available_token([{side, user_id} | rest]) do
    case CredentialStore.token_for(user_id) do
      {:ok, token} -> {side, token}
      {:error, _} -> first_available_token(rest)
    end
  end
end
