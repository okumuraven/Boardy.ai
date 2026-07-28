defmodule Vokazi.Repo.Migrations.CreateFeedback do
  use Ecto.Migration

  def change do
    create table(:feedback) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :rating, :integer, null: false
      add :message, :text

      timestamps(updated_at: false)
    end

    create index(:feedback, [:user_id])
    create index(:feedback, [:inserted_at])
  end
end
