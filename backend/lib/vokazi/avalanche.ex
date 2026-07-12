defmodule Vokazi.Avalanche.MatchStakingContract do
  @moduledoc false
  use Ethers.Contract, abi_file: "priv/abi/vokazi_match_staking.json"
end

defmodule Vokazi.Avalanche do
  @moduledoc """
  Thin wrapper around the deployed `VokaziMatchStaking` contract on
  Avalanche Fuji - the real Trust-Gate behind the mutual-consent flow in
  `Vokazi.Matchmaking`. Two things happen here, and only here:

    1. Once both sides mutually accept a match, the backend (the
       contract's owner) submits the one signed transaction a user's
       wallet can't make itself: `createMatch`, registering both wallet
       addresses under a deterministic on-chain id.
    2. After either side reports a stake, the backend independently
       reads the match straight off the contract via `getMatch` and
       only trusts *that* - never the frontend's claim that a
       transaction succeeded.
  """

  require Logger

  alias Vokazi.Avalanche.MatchStakingContract, as: MatchStaking

  @doc """
  Deterministic bytes32 id (as a "0x..." hex string, for DB storage and
  for the frontend to pass into its own contract call) this match is
  registered under on-chain, matching the
  `keccak256("vokazi-match-{id}")` convention documented in
  contracts/README.md.
  """
  def onchain_match_id(match_id) do
    ("vokazi-match-" <> to_string(match_id))
    |> ExKeccak.hash_256()
    |> Base.encode16(case: :lower)
    |> then(&("0x" <> &1))
  end

  # ex_abi/Ethers expects `bytes32` params as a raw 32-byte binary, not a
  # hex string (unlike `address`, which is a hex string). Every call
  # into the contract needs this conversion.
  defp to_bytes32("0x" <> hex), do: Base.decode16!(hex, case: :mixed)

  @doc """
  Submits the owner-only `createMatch` transaction. Takes a few seconds
  to confirm - callers should run this in a background `Task`, not
  inline in an HTTP response.
  """
  def create_match_onchain(onchain_id, user_a_address, user_b_address) do
    MatchStaking.create_match(to_bytes32(onchain_id), user_a_address, user_b_address)
    |> Ethers.send_transaction(
      to: contract_address(),
      from: deployer_address(),
      signer: Ethers.Signer.Local,
      signer_opts: [private_key: deployer_private_key()]
    )
    |> case do
      {:ok, tx_hash} ->
        Logger.info("Vokazi.Avalanche: createMatch submitted for #{onchain_id}, tx=#{tx_hash}")
        {:ok, tx_hash}

      {:error, reason} = error ->
        Logger.error("Vokazi.Avalanche: createMatch failed for #{onchain_id}: #{inspect(reason)}")
        error
    end
  end

  @zero_address "0x0000000000000000000000000000000000000000"

  @doc """
  Reads the match struct directly off the contract - the only source of
  truth for whether a side has actually staked. `matches(bytes32)` is a
  plain Solidity mapping, so a never-created match doesn't revert here -
  it comes back as the zero-value struct (userA == the zero address,
  status == 0). We surface that explicitly as `exists: false` rather
  than letting it get confused with a genuinely `:pending` match that
  simply hasn't been staked into yet (also `status == 0` on-chain).
  """
  def get_match_onchain(onchain_id) do
    case MatchStaking.get_match(to_bytes32(onchain_id)) |> Ethers.call(to: contract_address()) do
      {:ok, {user_a, user_b, status, withdrawn_a, withdrawn_b}} ->
        {:ok,
         %{
           exists: user_a != @zero_address,
           user_a: user_a,
           user_b: user_b,
           status: decode_status(status),
           withdrawn_a: withdrawn_a,
           withdrawn_b: withdrawn_b
         }}

      {:error, reason} = error ->
        Logger.error("Vokazi.Avalanche: getMatch call failed for #{onchain_id}: #{inspect(reason)}")
        error
    end
  end

  defp decode_status(0), do: :pending
  defp decode_status(1), do: :staked_a
  defp decode_status(2), do: :staked_b
  defp decode_status(3), do: :unlocked
  defp decode_status(4), do: :refunded
  defp decode_status(5), do: :slashed

  defp contract_address, do: System.fetch_env!("MATCH_STAKING_CONTRACT_ADDRESS")
  defp deployer_address, do: System.fetch_env!("DEPLOYER_ADDRESS")
  defp deployer_private_key, do: System.fetch_env!("DEPLOYER_PRIVATE_KEY")
end
