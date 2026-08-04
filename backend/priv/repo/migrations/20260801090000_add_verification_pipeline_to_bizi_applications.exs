defmodule Vokazi.Repo.Migrations.AddVerificationPipelineToBiziApplications do
  use Ecto.Migration

  # bizi_verification_build_plan.md Phase A. status keeps its existing
  # string column (validated against the expanded 7-stage pipeline in
  # the changeset, not a DB-level enum) - the new columns here are the
  # structured facts specific to staff-driven review, kept separate from
  # the narrative history in bizi_application_stage_events.
  def change do
    alter table(:bizi_applications) do
      add :assigned_to_admin_id, references(:users, on_delete: :nilify_all)
      add :revenue_verified, :boolean, default: false, null: false
      add :board_decision_reason, :text
      add :decided_by_admin_id, references(:users, on_delete: :nilify_all)
      add :decided_at, :utc_datetime
    end

    create index(:bizi_applications, [:assigned_to_admin_id])
  end
end
