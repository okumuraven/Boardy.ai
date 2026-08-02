defmodule Vokazi.Repo.Migrations.CreateBiziApplications do
  use Ecto.Migration

  # Apply + Rulebook only (bizi_flow.md) - built from the real live form
  # at form.kuzana.co/apply (kuzana_website.md §9). No unique constraint
  # on user_id: re-application is a normal, expected path (the real
  # form's own "Reapplication" lead-source option), not an edge case.
  def change do
    create table(:bizi_applications) do
      add :user_id, references(:users, on_delete: :delete_all), null: false

      add :preferred_name, :string, null: false
      add :other_names, :string
      add :email, :string, null: false
      add :whatsapp, :string, null: false
      add :company_name, :string, null: false
      add :business_description, :string, null: false
      add :track, :string, null: false
      add :heard_about_us, :string, null: false
      add :referred_by, :string
      # All 10 of Kuzana's real "must meet ALL" checklist items as a
      # single map (key -> boolean) rather than ten near-identical
      # columns - matches kuzana_playbook.md §9's own "use a type column,
      # not many similar tables/columns" database rule.
      add :eligibility, :map, null: false, default: %{}
      add :question_for_us, :text
      # Which batch this was submitted for (e.g. "Batch 4") - the real
      # form already shows a hard soft-deadline before applicants roll to
      # the next batch, so this is a real, time-sensitive fact worth
      # keeping on the record, not just derived from inserted_at later.
      add :batch_target, :string
      # Exactly one real value for now: "submitted" - see bizi_flow.md §7
      # for what's deliberately not built (reviewing/DD/board approval).
      add :status, :string, null: false, default: "submitted"

      timestamps()
    end

    create index(:bizi_applications, [:user_id])
    create index(:bizi_applications, [:status])
  end
end
