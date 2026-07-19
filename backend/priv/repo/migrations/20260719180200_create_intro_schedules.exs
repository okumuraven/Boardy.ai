defmodule Vokazi.Repo.Migrations.CreateIntroSchedules do
  use Ecto.Migration

  def change do
    create table(:intro_schedules) do
      add :match_id, references(:matches, on_delete: :delete_all), null: false
      add :status, :string, default: "awaiting_consent", null: false

      # Per-intro consent to use a linked Google Calendar for *this*
      # introduction specifically - separate from whether the user has
      # ever granted Calendar OAuth at all, so a stale one-time grant is
      # never silently reused without asking again. Tri-state and left
      # nullable on purpose: nil = hasn't decided yet, true = connected
      # for this intro, false = explicitly declined (manual fallback).
      add :consent_a, :boolean
      add :consent_b, :boolean

      # Manual fallback when a side declines/lacks Calendar access - a
      # list of %{"date" => "2026-08-01", "start" => "14:00", "end" => "17:00"}.
      add :manual_availability_a, {:array, :map}, default: []
      add :manual_availability_b, {:array, :map}, default: []

      add :proposed_slots, {:array, :map}, default: []
      # Each side's chosen candidate slot - the event is only created
      # once both sides pick the same one.
      add :selected_slot_a, :map
      add :selected_slot_b, :map
      add :confirmed_start, :utc_datetime
      add :confirmed_end, :utc_datetime

      # Per-intro override of each user's default contact_preference
      # (profiles.contact_preference) - editing this never touches the
      # stored profile default.
      add :contact_override_a, :string
      add :contact_override_b, :string

      # Private, per-user AI-generated briefing about the *other* person -
      # never shown across the match.
      add :agenda_summary_a, :text
      add :agenda_summary_b, :text

      add :google_event_id_a, :string
      add :google_event_id_b, :string
      add :google_meet_link, :string

      timestamps()
    end

    create unique_index(:intro_schedules, [:match_id])
  end
end
