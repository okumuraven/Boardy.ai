defmodule Vokazi.Repo.Migrations.RemoveStakingFromMatches do
  use Ecto.Migration

  # Removes the Avalanche on-chain staking columns per direct Kuzana
  # feedback (friction) - see boardy_comparison.md. decline_reason is
  # untouched: it's used by the decline flow, not staking-specific.
  def change do
    alter table(:matches) do
      remove :user_a_staked, :boolean, default: false
      remove :user_b_staked, :boolean, default: false
      remove :onchain_match_id, :string
      remove :stake_tx_hash_a, :string
      remove :stake_tx_hash_b, :string
    end
  end
end
