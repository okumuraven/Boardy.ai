defmodule Vokazi.Repo.Migrations.AddTractionAndTeamToInvestmentProfiles do
  use Ecto.Migration

  # The exact gap kuzana_connect_discovery.md §3 named for investor
  # evaluation ("pitch-deck-style summaries, traction, team composition")
  # that InvestmentProfile never had (profile.md §4.3). Free text, same
  # shape as key_financials - a founder's traction/team can't be reduced
  # to a closed set the way business_stage/funding_types can.
  def change do
    alter table(:investment_profiles) do
      add :traction, :text
      add :team_composition, :text
    end
  end
end
