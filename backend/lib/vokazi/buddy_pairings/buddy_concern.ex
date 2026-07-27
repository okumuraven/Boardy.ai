defmodule Vokazi.BuddyPairings.BuddyConcern do
  @moduledoc """
  A member's early-warning flag about their own Bizi Buddy pairing
  (kuzana_playbook.md §6: "buddies raise real concerns to the Kuzana
  team if they observe risk to their partner's business"). Visible only
  to Moderator+ staff - never to the other buddy, matching the
  Playbook's own confidentiality rule (shared between buddies stays
  confidential; escalating to Kuzana is the one explicit exception).
  """
  use Ecto.Schema
  import Ecto.Changeset

  @statuses ["open", "resolved"]

  schema "buddy_concerns" do
    field :message, :string
    field :status, :string, default: "open"
    field :resolved_at, :utc_datetime

    belongs_to :match, Vokazi.Matchmaking.Match
    belongs_to :reporter, Vokazi.Accounts.User
    belongs_to :resolved_by, Vokazi.Accounts.User

    timestamps()
  end

  @doc false
  def changeset(concern, attrs) do
    concern
    |> cast(attrs, [:match_id, :reporter_id, :message])
    |> validate_required([:match_id, :reporter_id, :message])
  end

  @doc "Staff-only path to close out a concern - never touched by the reporting member's own request."
  def resolve_changeset(concern, attrs) do
    concern
    |> cast(attrs, [:status, :resolved_by_id, :resolved_at])
    |> validate_inclusion(:status, @statuses)
  end
end
