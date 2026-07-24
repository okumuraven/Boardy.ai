defmodule Vokazi.Repo.Migrations.CreateInvestmentProfiles do
  use Ecto.Migration

  # The optional structured "funding/investment" layer (Phase 4, Investor &
  # Lender View) - a founder's funding stage/amount sought/financials, or
  # an investor/lender's check size and sectors of interest. Both halves
  # live in one row; each user only ever fills in the side that applies.
  def change do
    create table(:investment_profiles) do
      add :business_stage, :string
      add :funding_amount_sought, :string
      add :funding_types, {:array, :string}, default: [], null: false
      add :key_financials, :text
      add :check_size, :string
      add :sectors_of_interest, {:array, :string}, default: [], null: false
      add :user_id, references(:users, on_delete: :delete_all), null: false

      timestamps()
    end

    create unique_index(:investment_profiles, [:user_id])
  end
end
