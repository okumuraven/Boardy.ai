defmodule Vokazi.Repo.Migrations.AddAdminFieldsToUsers do
  use Ecto.Migration

  # All three nullable, none cast by any member-facing changeset (see
  # Vokazi.Accounts.User's admin_changeset/2, used exclusively by
  # Vokazi.Admin.* context modules and the mix admin.grant bootstrap task) -
  # there is no HTTP-reachable path that can ever set these on a regular
  # member's account. See "Admin panel.md" §3.
  def change do
    alter table(:users) do
      # nil | "superadmin" | "moderator" | "support" - nil means "not staff at all"
      add :admin_role, :string
      # nil | "active" | "suspended" - kept separate from admin_role so
      # suspending someone preserves their tier on record for reactivation
      add :admin_status, :string
      # staff-granted authenticity checkmark on a *member's* account -
      # distinct from admin_role, never self-service
      add :is_verified, :boolean, default: false, null: false
    end
  end
end
