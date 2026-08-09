defmodule Vokazi.Repo.Migrations.AddReplyToIdToMessages do
  use Ecto.Migration

  # Self-referencing, nullable - a message either replies to another
  # message in the same room or it doesn't. on_delete: :nilify_all since
  # there's no message-delete feature today, but if one ever ships, a
  # reply should survive losing what it quoted rather than being
  # cascade-deleted itself.
  def change do
    alter table(:messages) do
      add :reply_to_id, references(:messages, on_delete: :nilify_all)
    end

    create index(:messages, [:reply_to_id])
  end
end
