defmodule Vokazi.Matchmaking.Match do
  use Ecto.Schema
  import Ecto.Changeset

  # pending_consent -> (either declines) -> declined
  #                 -> (both accept)     -> unlocked (or slashed)
  # An on-chain Avalanche staking step used to sit between "both accept"
  # and "unlocked" - removed per direct Kuzana feedback (see
  # boardy_comparison.md); mutual consent now unlocks immediately.
  @statuses ["pending_consent", "declined", "unlocked", "slashed"]
  @responses ["pending", "accepted", "declined"]
  # The literal evidence trail for the Stage 2 bounty's "5 meaningful
  # introductions verified as useful by both parties" requirement - see
  # "Admin panel.md" §7.1.
  @outcome_statuses ["confirmed_valuable", "attempted_no_result", "unresponsive"]

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

    # Admin-only fields (never cast by changeset/2 below, only by
    # admin_changeset/2) - see "Admin panel.md" §3, §7.
    field :creation_note, :string
    field :outcome_status, :string
    field :outcome_notes, :string
    field :outcome_recorded_at, :utc_datetime

    belongs_to :user_a, Vokazi.Accounts.User
    belongs_to :user_b, Vokazi.Accounts.User
    belongs_to :created_by_admin, Vokazi.Accounts.User
    belongs_to :outcome_recorded_by, Vokazi.Accounts.User

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
      :decline_reason
    ])
    |> validate_required([:similarity_score, :status, :user_a_id, :user_b_id])
    |> validate_inclusion(:status, @statuses)
    |> validate_inclusion(:user_a_response, @responses)
    |> validate_inclusion(:user_b_response, @responses)
    |> unique_constraint([:user_a_id, :user_b_id])
  end

  @doc """
  The ONLY path that touches the admin-only fields (manual match creation
  metadata, outcome verification) - used exclusively by `Vokazi.Admin.*`
  context modules, never by any member-facing controller. See
  "Admin panel.md" §7.
  """
  def admin_changeset(match, attrs) do
    match
    |> cast(attrs, [
      :created_by_admin_id,
      :creation_note,
      :outcome_status,
      :outcome_notes,
      :outcome_recorded_by_id,
      :outcome_recorded_at
    ])
    |> validate_inclusion(:outcome_status, @outcome_statuses)
  end
end
