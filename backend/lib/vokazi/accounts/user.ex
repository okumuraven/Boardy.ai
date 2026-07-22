defmodule Vokazi.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :email, :string
    field :full_name, :string
    field :role, :string
    field :wallet_address, :string
    field :onboarding_completed, :boolean, default: false

    has_one :profile, Vokazi.Accounts.Profile

    timestamps()
  end

  # Closed set, not free text - Vokazi.Reputation ranks users within
  # their role category, so a stray value here would either fragment
  # into its own lonely category or crash that grouping outright.
  @roles ["founder", "developer", "designer", "investor"]

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :full_name, :role, :wallet_address, :onboarding_completed])
    |> validate_required([:wallet_address, :full_name, :role])
    |> validate_inclusion(:role, @roles)
    |> unique_constraint(:wallet_address)
    |> unique_constraint(:email)
  end
end
