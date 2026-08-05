defmodule Vokazi.Repo.Migrations.AddScheduledCallToBiziApplications do
  use Ecto.Migration

  # Phase D (bizi_verification_build_plan.md) needs the booked call as
  # real, queryable data - not just buried in a staff-only stage_event
  # comment string - so both the applicant's own Bizi tab and the
  # member Calendar tab can actually display it. Single most-recent
  # call, same "overwrite, don't keep history" choice already made for
  # interview transcripts - the stage_events audit trail is still the
  # permanent record of every booking, this is just the current one.
  def change do
    alter table(:bizi_applications) do
      add :scheduled_call_at, :utc_datetime
      add :scheduled_call_meet_link, :string
    end
  end
end
