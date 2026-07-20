defmodule Vokazi.Notifications.PushSubscription do
  use Ecto.Schema
  import Ecto.Changeset

  schema "push_subscriptions" do
    field :endpoint, :string
    field :p256dh_key, :string
    field :auth_key, :string

    belongs_to :user, Vokazi.Accounts.User

    timestamps()
  end

  @doc false
  def changeset(subscription, attrs) do
    subscription
    |> cast(attrs, [:user_id, :endpoint, :p256dh_key, :auth_key])
    |> validate_required([:user_id, :endpoint, :p256dh_key, :auth_key])
    |> unique_constraint(:endpoint)
  end
end
