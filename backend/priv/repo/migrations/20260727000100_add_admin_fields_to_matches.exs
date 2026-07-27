defmodule Vokazi.Repo.Migrations.AddAdminFieldsToMatches do
  use Ecto.Migration

  # Supports "Admin panel.md" §7 (manual match creation + outcome
  # verification, the Stage 2 bounty-evidence surface). All nullable, none
  # cast by the member-facing Match.changeset/2 - only ever written through
  # dedicated Vokazi.Admin.* context functions.
  def change do
    alter table(:matches) do
      # §7.3 - nil means "created by the normal AI pipeline"
      add :created_by_admin_id, references(:users), null: true
      add :creation_note, :text

      # §7.1 - the literal evidence trail for "5 meaningful introductions
      # verified as useful by both parties"
      add :outcome_status, :string
      add :outcome_notes, :text
      add :outcome_recorded_by_id, references(:users)
      add :outcome_recorded_at, :utc_datetime
    end

    create index(:matches, [:outcome_status])
    create index(:matches, [:created_by_admin_id])
  end
end
