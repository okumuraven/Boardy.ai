defmodule Vokazi.Repo.Migrations.CreatePersonalEvents do
  use Ecto.Migration

  def change do
    create table(:personal_events) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :title, :string, null: false
      add :date, :date, null: false
      add :start_time, :time, null: false
      add :end_time, :time, null: false

      timestamps()
    end

    create index(:personal_events, [:user_id])
  end
end
