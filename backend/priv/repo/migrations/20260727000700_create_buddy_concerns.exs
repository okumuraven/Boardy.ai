defmodule Vokazi.Repo.Migrations.CreateBuddyConcerns do
  use Ecto.Migration

  def change do
    create table(:buddy_concerns) do
      add :match_id, references(:matches, on_delete: :delete_all), null: false
      add :reporter_id, references(:users, on_delete: :delete_all), null: false
      add :message, :text, null: false
      add :status, :string, null: false, default: "open"
      add :resolved_by_id, references(:users, on_delete: :nilify_all)
      add :resolved_at, :utc_datetime

      timestamps()
    end

    create index(:buddy_concerns, [:match_id])
    create index(:buddy_concerns, [:status])
  end
end
