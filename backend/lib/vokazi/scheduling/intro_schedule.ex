defmodule Vokazi.Scheduling.IntroSchedule do
  use Ecto.Schema
  import Ecto.Changeset

  # awaiting_consent -> awaiting_availability -> slot_proposed -> confirmed
  #                                                             -> declined (either side opts out of scheduling)
  @statuses ["awaiting_consent", "awaiting_availability", "slot_proposed", "confirmed", "declined"]
  @contact_modes ["call", "video", "chat"]

  schema "intro_schedules" do
    field :status, :string, default: "awaiting_consent"

    # Per-intro consent to use a linked Google Calendar for *this*
    # introduction specifically - separate from a one-time OAuth grant,
    # so a stale grant is never silently reused without being asked
    # again. Tri-state: nil = hasn't decided yet, true = connected for
    # this intro, false = explicitly declined (manual fallback).
    field :consent_a, :boolean
    field :consent_b, :boolean

    # Manual fallback availability when a side declines/lacks Calendar
    # access - a list of %{"date" => "2026-08-01", "start" => "14:00", "end" => "17:00"}.
    field :manual_availability_a, {:array, :map}, default: []
    field :manual_availability_b, {:array, :map}, default: []

    field :proposed_slots, {:array, :map}, default: []
    # Each side's chosen candidate slot (%{"start" => iso8601, "end" => iso8601}) -
    # the real event is only created once both sides pick the same one.
    field :selected_slot_a, :map
    field :selected_slot_b, :map
    field :confirmed_start, :utc_datetime
    field :confirmed_end, :utc_datetime

    # Per-intro override of each user's default contact_preference
    # (`Vokazi.Accounts.Profile.contact_preference`) - editing this never
    # touches the stored profile default, so a one-off "let's just call
    # today" doesn't silently become someone's permanent preference.
    field :contact_override_a, :string
    field :contact_override_b, :string

    # Private, per-user AI-generated briefing about the *other* person -
    # never shown across the match.
    field :agenda_summary_a, :string
    field :agenda_summary_b, :string

    field :google_event_id_a, :string
    field :google_event_id_b, :string
    field :google_meet_link, :string

    # Rate-limits `Vokazi.Scheduling.send_reminder/2`.
    field :last_reminder_sent_at, :utc_datetime

    belongs_to :match, Vokazi.Matchmaking.Match

    timestamps()
  end

  @doc false
  def changeset(schedule, attrs) do
    schedule
    |> cast(attrs, [
      :match_id,
      :status,
      :consent_a,
      :consent_b,
      :manual_availability_a,
      :manual_availability_b,
      :proposed_slots,
      :selected_slot_a,
      :selected_slot_b,
      :confirmed_start,
      :confirmed_end,
      :contact_override_a,
      :contact_override_b,
      :agenda_summary_a,
      :agenda_summary_b,
      :google_event_id_a,
      :google_event_id_b,
      :google_meet_link,
      :last_reminder_sent_at
    ])
    |> validate_required([:match_id, :status])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:contact_override_a, @contact_modes)
    |> validate_inclusion(:contact_override_b, @contact_modes)
    |> unique_constraint(:match_id)
  end
end
