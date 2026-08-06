defmodule Vokazi.Repo.Migrations.AddServiceFieldsToProfiles do
  use Ecto.Migration

  # Service/advisory-specific fields (profile.md §4.2) - the two things
  # that actually help a founder decide "should I hire this person,"
  # which the generic offer/tags/portfolio fields don't capture on their
  # own. available_for_hire is a nullable boolean, not a
  # default-true/false one: nil means "never set" (don't show a pill at
  # all), distinct from an explicit false ("not taking clients right
  # now"), same convention as InvestmentProfile's optional fields.
  def change do
    alter table(:profiles) do
      add :rate_types, {:array, :string}, default: []
      add :available_for_hire, :boolean
    end
  end
end
