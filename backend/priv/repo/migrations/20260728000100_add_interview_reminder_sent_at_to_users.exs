defmodule Vokazi.Repo.Migrations.AddInterviewReminderSentAtToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :interview_reminder_sent_at, :utc_datetime
    end
  end
end
