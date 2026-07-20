defmodule Vokazi.Repo.Migrations.CreateNotifications do
  use Ecto.Migration

  def change do
    create table(:notifications) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :type, :string, null: false
      add :body, :text, null: false
      # Client-side route/state to jump to, e.g. "chat_room:3" - kept as
      # a plain string rather than structured data since Phase 1 only
      # ever needs to point back at a chat room.
      add :link, :string
      add :is_read, :boolean, default: false, null: false

      timestamps()
    end

    create index(:notifications, [:user_id, :is_read])
    create index(:notifications, [:user_id, :inserted_at])
  end
end
