defmodule Vokazi.Repo.Migrations.AddPairingKindToMatches do
  use Ecto.Migration

  def change do
    alter table(:matches) do
      add :pairing_kind, :string
    end

    create index(:matches, [:pairing_kind])
  end
end
