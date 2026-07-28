defmodule Vokazi.Repo.Migrations.AddFeedbackReminderSentAtToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :feedback_reminder_sent_at, :utc_datetime
    end
  end
end
