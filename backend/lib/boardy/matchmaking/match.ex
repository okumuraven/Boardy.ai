defmodule Boardy.Matchmaking.Match do
  use Ecto.Schema
  import Ecto.Changeset

  schema "matches" do
    field :similarity_score, :float
    field :status, :string, default: "pending" # pending, staked_a, staked_b, unlocked, slashed

    belongs_to :user_a, Boardy.Accounts.User
    belongs_to :user_b, Boardy.Accounts.User

    timestamps()
  end

  @doc false
  def changeset(match, attrs) do
    match
    |> cast(attrs, [:similarity_score, :status, :user_a_id, :user_b_id])
    |> validate_required([:similarity_score, :status, :user_a_id, :user_b_id])
    |> validate_inclusion(:status, ["pending", "staked_a", "staked_b", "unlocked", "slashed"])
    |> unique_constraint([:user_a_id, :user_b_id])
  end
end
