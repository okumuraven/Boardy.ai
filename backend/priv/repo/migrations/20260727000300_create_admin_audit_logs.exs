defmodule Vokazi.Repo.Migrations.CreateAdminAuditLogs do
  use Ecto.Migration

  # Every admin *mutation* is logged atomically alongside the change itself
  # (same Ecto.Multi transaction) - the data change cannot commit without
  # its audit row, or vice versa. Reads are NOT logged here (see
  # Vokazi.Admin.AuditLog moduledoc) - this table is for real decisions,
  # not routine browsing. See "Admin panel.md" §3.
  def change do
    create table(:admin_audit_logs) do
      add :admin_user_id, references(:users, on_delete: :nilify_all), null: false
      add :action, :string, null: false
      add :target_type, :string, null: false
      add :target_id, :integer
      add :reason, :text
      add :metadata, :map, default: %{}
      add :ip_address, :string

      timestamps(updated_at: false)
    end

    create index(:admin_audit_logs, [:admin_user_id])
    create index(:admin_audit_logs, [:target_type, :target_id])
  end
end
