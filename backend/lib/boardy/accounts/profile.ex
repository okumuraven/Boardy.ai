defmodule Boardy.Accounts.Profile do
  use Ecto.Schema
  import Ecto.Changeset

  schema "profiles" do
    field :phone_number, :string
    field :raw_transcript, :string
    field :need_text, :string
    field :offer_text, :string
    field :need_vector, Pgvector.Ecto.Vector
    field :offer_vector, Pgvector.Ecto.Vector

    belongs_to :user, Boardy.Accounts.User

    timestamps()
  end

  @doc false
  def changeset(profile, attrs) do
    profile
    |> cast(attrs, [:phone_number, :raw_transcript, :need_text, :offer_text, :need_vector, :offer_vector, :user_id])
    |> validate_required([:user_id, :phone_number])
    |> unique_constraint(:user_id)
    |> unique_constraint(:phone_number)
  end
end
