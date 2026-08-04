defmodule Vokazi.Repo.Migrations.CreateBiziApplicationReferences do
  use Ecto.Migration

  # The real 5-customer + 5-creditor reference-check list
  # (bizi_verification.md stage 5) - one row per reference, not ten
  # near-identical columns, matching kuzana_playbook.md §9's own
  # database rules.
  def change do
    create table(:bizi_application_references) do
      add :bizi_application_id, references(:bizi_applications, on_delete: :delete_all), null: false
      add :reference_type, :string, null: false
      add :name, :string, null: false
      add :phone, :string
      add :contacted, :boolean, default: false, null: false
      add :verified, :boolean, default: false, null: false
      add :notes, :text

      timestamps()
    end

    create index(:bizi_application_references, [:bizi_application_id])
  end
end
