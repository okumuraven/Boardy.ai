defmodule Vokazi.Accounts.Profile do
  use Ecto.Schema
  import Ecto.Changeset

  schema "profiles" do
    field :phone_number, :string
    field :raw_transcript, :string
    field :need_text, :string
    field :offer_text, :string
    field :need_vector, Pgvector.Ecto.Vector
    field :offer_vector, Pgvector.Ecto.Vector
    # AI-inferred from the voice-interview transcript ("call" | "video" |
    # "chat") - the default shown on the scheduling briefing card.
    field :contact_preference, :string, default: "call"

    belongs_to :user, Vokazi.Accounts.User

    timestamps()
  end

  @doc false
  def changeset(profile, attrs) do
    profile
    |> cast(attrs, [
      :phone_number,
      :raw_transcript,
      :need_text,
      :offer_text,
      :need_vector,
      :offer_vector,
      :contact_preference,
      :user_id
    ])
    |> validate_required([:user_id, :phone_number])
    |> validate_inclusion(:contact_preference, ["call", "video", "chat"])
    |> unique_constraint(:user_id)
    |> unique_constraint(:phone_number)
  end
end
