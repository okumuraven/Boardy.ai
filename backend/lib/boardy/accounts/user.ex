defmodule Boardy.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :email, :string
    field :full_name, :string
    field :role, :string
    field :wallet_address, :string
    field :onboarding_completed, :boolean, default: false

    has_one :profile, Boardy.Accounts.Profile

    timestamps()
  end

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :full_name, :role, :wallet_address, :onboarding_completed])
    |> validate_required([:wallet_address, :full_name, :role])
    |> unique_constraint(:wallet_address)
    |> unique_constraint(:email)
  end
end
