defmodule Vokazi.Repo.Migrations.AddIsBiziToUsers do
  use Ecto.Migration

  # Deliberately its own field, not reused from is_verified (a generic
  # authenticity checkmark) or batch (scoped only to Bizi Buddy pairing) -
  # see bizi_verification_system.md §10. Set exactly once, atomically,
  # by the final Superadmin board decision.
  def change do
    alter table(:users) do
      add :is_bizi, :boolean, default: false, null: false
      add :bizi_approved_at, :utc_datetime
    end
  end
end
