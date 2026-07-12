defmodule Vokazi.Repo.Migrations.AddStakingToMatches do
  use Ecto.Migration

  def change do
    alter table(:matches) do
      # Why the declining side passed, so future matching can be tuned on
      # real rejection signal instead of guessing.
      add :decline_reason, :text

      # The Avalanche Trust-Gate: once both sides mutually accept, each
      # must independently stake on-chain before the chat unlocks. These
      # only ever flip to true after the backend has independently
      # verified the stake via a direct `getMatch` call against the
      # deployed contract - never from the frontend's claim alone.
      add :user_a_staked, :boolean, default: false, null: false
      add :user_b_staked, :boolean, default: false, null: false

      # Deterministic bytes32 id this match is registered under on
      # VokaziMatchStaking.sol (keccak256("vokazi-match-{id}")), computed
      # once `createMatch` is submitted so we never recompute/risk drift.
      add :onchain_match_id, :string

      # Tx hashes each side submitted, kept for auditability (e.g. a
      # "view on Snowtrace" link) and to detect a resubmitted/duplicate
      # stake attempt.
      add :stake_tx_hash_a, :string
      add :stake_tx_hash_b, :string
    end
  end
end
