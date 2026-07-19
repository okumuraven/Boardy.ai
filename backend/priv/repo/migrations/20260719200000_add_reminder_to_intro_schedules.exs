defmodule Vokazi.Repo.Migrations.AddReminderToIntroSchedules do
  use Ecto.Migration

  def change do
    alter table(:intro_schedules) do
      # Rate-limits `Vokazi.Scheduling.send_reminder/2` so nudging the
      # other side stays a professional courtesy, not spam.
      add :last_reminder_sent_at, :utc_datetime
    end
  end
end
