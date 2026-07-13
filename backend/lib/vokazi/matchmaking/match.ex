defmodule Vokazi.Matchmaking.Match do
  use Ecto.Schema
  import Ecto.Changeset

  # pending_consent -> (either declines) -> declined
  #                 -> (both accept)     -> pending -> staked_a/staked_b -> unlocked
  #                                                                       (or slashed)
  # "pending" means mutual consent is done and the Avalanche Trust-Gate
  # `createMatch` tx has been (or is being) submitted - both sides now
  # need to call `stake()` on-chain before this flips to "unlocked".
  # user_a_staked/user_b_staked (each independently verified on-chain,
  # never taken on the frontend's word) are what actually drive that
  # transition; staked_a/staked_b in this list are kept for the mirrored
  # on-chain enum but aren't required as a DB status stop along the way.
  @statuses ["pending_consent", "declined", "pending", "staked_a", "staked_b", "unlocked", "slashed"]
  @responses ["pending", "accepted", "declined"]

  schema "matches" do
    field :similarity_score, :float
    field :status, :string, default: "pending_consent"
    # AI's own 0-100 confidence that this is a genuinely complementary match,
    # separate from the raw pgvector similarity_score.
    field :ai_score, :float
    field :ai_reasoning, :string
    field :ai_strengths, {:array, :string}, default: []
    field :ai_gaps, {:array, :string}, default: []
    field :intro_message, :string
    # Personalized, second-person pitch shown to each side ("you need X
    # because...") instead of the shared third-person analyst report
    # above - %{"headline" => .., "strengths" => [..], "gaps" => [..]}.
    field :pitch_a, :map
    field :pitch_b, :map

    # Each side's independent decision on whether to proceed, reviewed
    # before either party is asked to commit to anything further.
    field :user_a_response, :string, default: "pending"
    field :user_b_response, :string, default: "pending"
    # Why the declining side passed, so future matching can be tuned on
    # real rejection signal instead of guessing.
    field :decline_reason, :string

    # The Avalanche Trust-Gate: each flips true only after the backend
    # independently verifies the stake via `getMatch` on-chain.
    field :user_a_staked, :boolean, default: false
    field :user_b_staked, :boolean, default: false
    # Deterministic bytes32 id this match is registered under on
    # VokaziMatchStaking.sol (keccak256("vokazi-match-{id}")).
    field :onchain_match_id, :string
    field :stake_tx_hash_a, :string
    field :stake_tx_hash_b, :string

    belongs_to :user_a, Vokazi.Accounts.User
    belongs_to :user_b, Vokazi.Accounts.User

    timestamps()
  end

  @doc false
  def changeset(match, attrs) do
    match
    |> cast(attrs, [
      :similarity_score,
      :status,
      :user_a_id,
      :user_b_id,
      :ai_score,
      :ai_reasoning,
      :ai_strengths,
      :ai_gaps,
      :intro_message,
      :pitch_a,
      :pitch_b,
      :user_a_response,
      :user_b_response,
      :decline_reason,
      :user_a_staked,
      :user_b_staked,
      :onchain_match_id,
      :stake_tx_hash_a,
      :stake_tx_hash_b
    ])
    |> validate_required([:similarity_score, :status, :user_a_id, :user_b_id])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:user_a_response, @responses)
    |> validate_inclusion(:user_b_response, @responses)
    |> unique_constraint([:user_a_id, :user_b_id])
  end
end
