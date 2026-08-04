defmodule Vokazi.Repo.Migrations.CreateBiziApplicationStageEvents do
  use Ecto.Migration

  # The real case-file timeline (bizi_verification_system.md §4) - every
  # stage transition, AI screening pass, automated reminder, and the
  # final decision writes one row here. performed_by_admin_id is
  # nullable on purpose: null means system-generated (AI/automation),
  # never a human misattributed as "the system" or vice versa.
  def change do
    create table(:bizi_application_stage_events) do
      add :bizi_application_id, references(:bizi_applications, on_delete: :delete_all), null: false
      add :kind, :string, null: false
      add :from_status, :string
      add :to_status, :string
      add :performed_by_admin_id, references(:users, on_delete: :nilify_all)
      add :comment, :text

      timestamps(updated_at: false)
    end

    create index(:bizi_application_stage_events, [:bizi_application_id])
  end
end
