defmodule Vokazi.Repo.Migrations.AddIndustryToUsers do
  use Ecto.Migration

  # Directory search/filter (Phase 4, kuzana_connect_discovery.md) needs
  # industry as its own field, separate from `role` - real Kuzana members
  # are agribusiness/logistics/finance/etc, not founder/developer/designer.
  def change do
    alter table(:users) do
      add :industry, :string
    end
  end
end
