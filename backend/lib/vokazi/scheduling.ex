defmodule Vokazi.Scheduling do
  @moduledoc """
  The Escrow-Gated Google Calendar context.

  Only reachable once `Vokazi.Matchmaking`'s Avalanche Trust-Gate has
  already unlocked a match - this never runs ahead of that stake
  verification. From there:

    1. Per-intro consent - each side independently decides whether to
       connect Google Calendar *for this specific introduction*
       (`connect_calendar_url/2` -> `handle_oauth_callback/2`), or
       declines and falls back to manually-entered availability
       (`decline_calendar/2` + `submit_manual_availability/3`).
    2. Once both sides have resolved one way or the other,
       `Vokazi.Scheduling.SlotProposal` intersects their availability
       into mutual candidate times and generates a private AI briefing
       for each side about the *other* person - never shared across
       the match.
    3. Each side picks a candidate slot (`select_slot/3`); once both
       pick the *same* one, `Vokazi.Scheduling.EventFinalizer` creates
       the real Google Calendar event.
  """

  alias Vokazi.Repo
  alias Vokazi.Accounts.{User, Profile}
  alias Vokazi.Chat
  alias Vokazi.Matchmaking.Match
  alias Vokazi.Scheduling.{IntroSchedule, CredentialStore, SlotProposal, EventFinalizer}

  @reminder_cooldown_seconds 30 * 60

  @doc "Fetches (or creates) the `IntroSchedule` for this match, gated on the match already being unlocked."
  def get_or_create_schedule(match_id, user_id) do
    with {:ok, match} <- get_unlocked_match(match_id, user_id) do
      schedule =
        case Repo.get_by(IntroSchedule, match_id: match_id) do
          nil -> %IntroSchedule{} |> IntroSchedule.changeset(%{match_id: match_id}) |> Repo.insert!()
          existing -> existing
        end

      {:ok, view(schedule, match, user_id)}
    end
  end

  @doc "Read-only projection for polling - see `get_or_create_schedule/2`."
  def get_status(match_id, user_id) do
    with {:ok, match} <- get_unlocked_match(match_id, user_id),
         {:ok, schedule} <- fetch_schedule(match_id) do
      {:ok, view(schedule, match, user_id)}
    end
  end

  @doc """
  The Google consent URL to redirect this user's browser to, scoped to
  `calendar.events` for this specific match (see `Vokazi.Scheduling.GoogleOAuth`).
  """
  def connect_calendar_url(match_id, user_id) do
    with {:ok, _match} <- get_unlocked_match(match_id, user_id) do
      {:ok, Vokazi.Scheduling.GoogleOAuth.authorize_url(user_id, match_id)}
    end
  end

  @doc """
  Called from the OAuth callback controller after Google redirects back
  with a `code` + signed `state`. Stores the credential, marks this
  side's per-intro consent as granted, and (if the other side has also
  resolved) kicks off slot proposal in the background.
  """
  def handle_oauth_callback(code, state) do
    with {:ok, %{user_id: user_id, match_id: match_id}} <- Vokazi.Scheduling.GoogleOAuth.verify_state(state),
         {:ok, match} <- get_unlocked_match(match_id, user_id),
         {:ok, schedule} <- fetch_schedule(match_id),
         {:ok, tokens} <- Vokazi.Scheduling.GoogleOAuth.exchange_code(code) do
      CredentialStore.upsert(user_id, tokens)

      side = side_of(match, user_id)
      {:ok, updated} = update_schedule(schedule, %{consent_field(side) => true})
      SlotProposal.maybe_run(match, updated)

      {:ok, match_id}
    end
  end

  @doc "Declines Calendar access for this specific intro - manual availability follows."
  def decline_calendar(match_id, user_id) do
    with {:ok, match} <- get_unlocked_match(match_id, user_id),
         {:ok, schedule} <- fetch_schedule(match_id) do
      side = side_of(match, user_id)
      {:ok, updated} = update_schedule(schedule, %{consent_field(side) => false})
      SlotProposal.maybe_run(match, updated)
      {:ok, view(updated, match, user_id)}
    end
  end

  @doc """
  Manual fallback availability - `slots` is a list of
  `%{"date" => "2026-08-01", "start" => "14:00", "end" => "17:00"}`.
  """
  def submit_manual_availability(match_id, user_id, slots) do
    with {:ok, match} <- get_unlocked_match(match_id, user_id),
         {:ok, schedule} <- fetch_schedule(match_id) do
      side = side_of(match, user_id)
      {:ok, updated} = update_schedule(schedule, %{manual_field(side) => slots, consent_field(side) => false})
      SlotProposal.maybe_run(match, updated)
      {:ok, view(updated, match, user_id)}
    end
  end

  @doc """
  Per-intro override of this user's default contact preference (never
  touches their stored `Profile.contact_preference`).
  """
  def set_contact_override(match_id, user_id, mode) when mode in ["call", "video", "chat"] do
    with {:ok, match} <- get_unlocked_match(match_id, user_id),
         {:ok, schedule} <- fetch_schedule(match_id) do
      side = side_of(match, user_id)
      {:ok, updated} = update_schedule(schedule, %{contact_override_field(side) => mode})
      {:ok, view(updated, match, user_id)}
    end
  end

  @doc """
  Records this user's pick among `proposed_slots`. Once both sides have
  independently picked the *same* slot, the real Calendar event is
  created in the background.
  """
  def select_slot(match_id, user_id, slot) do
    with {:ok, match} <- get_unlocked_match(match_id, user_id),
         {:ok, schedule} <- fetch_schedule(match_id) do
      if slot in schedule.proposed_slots do
        side = side_of(match, user_id)
        {:ok, updated} = update_schedule(schedule, %{selected_slot_field(side) => slot})
        EventFinalizer.maybe_run(match, updated)
        {:ok, view(updated, match, user_id)}
      else
        {:error, :invalid_slot}
      end
    end
  end

  @doc """
  Nudges the other side with a real chat message (rate-limited to once
  per #{div(@reminder_cooldown_seconds, 60)} minutes so it stays a
  courtesy, not spam) - reuses the existing chat infrastructure rather
  than inventing a separate notification channel.
  """
  def send_reminder(match_id, user_id) do
    with {:ok, match} <- get_unlocked_match(match_id, user_id),
         {:ok, schedule} <- fetch_schedule(match_id) do
      if reminder_on_cooldown?(schedule) do
        {:error, :reminder_on_cooldown}
      else
        post_reminder_message(match_id, user_id)
        {:ok, updated} = update_schedule(schedule, %{last_reminder_sent_at: DateTime.utc_now() |> DateTime.truncate(:second)})
        {:ok, view(updated, match, user_id)}
      end
    end
  end

  defp reminder_on_cooldown?(%{last_reminder_sent_at: nil}), do: false

  defp reminder_on_cooldown?(%{last_reminder_sent_at: last}) do
    DateTime.diff(DateTime.utc_now(), last, :second) < @reminder_cooldown_seconds
  end

  defp post_reminder_message(match_id, user_id) do
    sender = Repo.get!(User, user_id)
    room = Chat.get_chat_room_by_match_id!(match_id)

    {:ok, message} =
      Chat.create_message(%{
        content: "🔔 Reminder from #{sender.full_name}: ready to lock in a time for our intro call?",
        sender_id: user_id,
        chat_room_id: room.id
      })

    VokaziWeb.Endpoint.broadcast!("chat_room:#{room.id}", "new_msg", %{
      id: message.id,
      content: message.content,
      sender_id: message.sender_id,
      sender_name: sender.full_name,
      inserted_at: message.inserted_at
    })
  end

  # --- Gate + lookups -------------------------------------------------

  defp get_unlocked_match(match_id, user_id) do
    case Repo.get(Match, match_id) do
      nil -> {:error, :not_found}
      match when user_id not in [match.user_a_id, match.user_b_id] -> {:error, :not_a_participant}
      match when match.status != "unlocked" -> {:error, :match_not_unlocked}
      match -> {:ok, match}
    end
  end

  defp fetch_schedule(match_id) do
    case Repo.get_by(IntroSchedule, match_id: match_id) do
      nil -> {:error, :schedule_not_found}
      schedule -> {:ok, schedule}
    end
  end

  defp update_schedule(schedule, attrs), do: schedule |> IntroSchedule.changeset(attrs) |> Repo.update()

  defp side_of(match, user_id) do
    cond do
      match.user_a_id == user_id -> :a
      match.user_b_id == user_id -> :b
    end
  end

  defp consent_field(:a), do: :consent_a
  defp consent_field(:b), do: :consent_b
  defp manual_field(:a), do: :manual_availability_a
  defp manual_field(:b), do: :manual_availability_b
  defp selected_slot_field(:a), do: :selected_slot_a
  defp selected_slot_field(:b), do: :selected_slot_b
  defp agenda_field(:a), do: :agenda_summary_a
  defp agenda_field(:b), do: :agenda_summary_b
  defp contact_override_field(:a), do: :contact_override_a
  defp contact_override_field(:b), do: :contact_override_b

  # --- Per-viewer projection --------------------------------------------

  defp view(schedule, match, user_id) do
    side = side_of(match, user_id)
    other_side = if side == :a, do: :b, else: :a
    other_user_id = if side == :a, do: match.user_b_id, else: match.user_a_id

    other_user = Repo.get(User, other_user_id)
    other_profile = Repo.get_by(Profile, user_id: other_user_id)
    my_profile = Repo.get_by(Profile, user_id: user_id)
    my_override = Map.get(schedule, contact_override_field(side))
    my_consent = Map.get(schedule, consent_field(side))

    %{
      schedule_id: schedule.id,
      status: schedule.status,
      created_at: schedule.inserted_at,
      my_consent: my_consent,
      # Resolved once either Calendar is connected, or manual
      # availability has actually been submitted (consent alone is
      # `false` the instant Calendar is declined, before the
      # availability form is filled in) - this is what the frontend
      # uses to decide "show the form" vs "show the waiting screen."
      my_resolved: my_consent == true or (my_consent == false and Map.get(schedule, manual_field(side)) != []),
      proposed_slots: schedule.proposed_slots,
      my_selected_slot: Map.get(schedule, selected_slot_field(side)),
      other_confirmed_own_slot: not is_nil(Map.get(schedule, selected_slot_field(other_side))),
      confirmed_start: schedule.confirmed_start,
      confirmed_end: schedule.confirmed_end,
      google_meet_link: schedule.google_meet_link,
      my_briefing: decode_briefing(Map.get(schedule, agenda_field(side))),
      my_contact_preference: my_override || (my_profile && my_profile.contact_preference) || "call",
      last_reminder_sent_at: schedule.last_reminder_sent_at,
      reminder_cooldown_seconds: @reminder_cooldown_seconds,
      other_user: %{
        name: other_user && other_user.full_name,
        default_contact_preference: other_profile && other_profile.contact_preference
      }
    }
  end

  defp decode_briefing(nil), do: nil
  defp decode_briefing(json), do: Jason.decode!(json)
end
