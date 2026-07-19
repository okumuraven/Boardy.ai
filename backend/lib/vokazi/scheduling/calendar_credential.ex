defmodule Vokazi.Scheduling.CalendarCredential do
  use Ecto.Schema
  import Ecto.Changeset

  alias Vokazi.Scheduling.EncryptedField

  schema "calendar_credentials" do
    field :google_email, :string
    field :access_token, EncryptedField
    field :refresh_token, EncryptedField
    field :expires_at, :utc_datetime
    field :scope, :string

    belongs_to :user, Vokazi.Accounts.User

    timestamps()
  end

  @doc false
  def changeset(credential, attrs) do
    credential
    |> cast(attrs, [:user_id, :google_email, :access_token, :refresh_token, :expires_at, :scope])
    |> validate_required([:user_id, :google_email, :access_token, :refresh_token, :expires_at, :scope])
    |> unique_constraint(:user_id)
  end
end
