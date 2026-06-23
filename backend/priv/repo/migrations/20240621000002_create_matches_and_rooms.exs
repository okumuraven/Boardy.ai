defmodule Boardy.Repo.Migrations.CreateMatchesAndRooms do
  use Ecto.Migration

  def change do
    create table(:matches) do
      add :user_a_id, references(:users, on_delete: :delete_all), null: false
      add :user_b_id, references(:users, on_delete: :delete_all), null: false
      add :similarity_score, :float, null: false

      # match_status: "pending", "staked_a", "staked_b", "unlocked", "slashed"
      add :status, :string, default: "pending"

      timestamps()
    end

    create unique_index(:matches, [:user_a_id, :user_b_id])

    create table(:chat_rooms) do
      add :match_id, references(:matches, on_delete: :delete_all), null: false
      add :is_active, :boolean, default: true

      timestamps()
    end

    create unique_index(:chat_rooms, [:match_id])

    create table(:messages) do
      add :chat_room_id, references(:chat_rooms, on_delete: :delete_all), null: false
      add :sender_id, references(:users, on_delete: :delete_all), null: false
      add :content, :text, null: false

      timestamps()
    end
  end
end
