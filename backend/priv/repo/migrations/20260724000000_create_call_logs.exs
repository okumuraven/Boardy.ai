defmodule Vokazi.Repo.Migrations.CreateCallLogs do
  use Ecto.Migration

  def change do
    create table(:call_logs) do
      add :match_id, references(:matches, on_delete: :delete_all), null: false
      add :caller_id, references(:users, on_delete: :delete_all), null: false
      add :callee_id, references(:users, on_delete: :delete_all), null: false
      add :status, :string, null: false, default: "ringing"
      add :duration_seconds, :integer

      timestamps()
    end

    # The history view queries "every call where I'm either side", and
    # the ring-timeout lookup needs to find one specific in-flight call
    # fast by id (already covered by the primary key).
    create index(:call_logs, [:caller_id])
    create index(:call_logs, [:callee_id])
  end
end
