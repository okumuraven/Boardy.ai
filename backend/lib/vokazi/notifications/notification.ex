defmodule Vokazi.Notifications.Notification do
  use Ecto.Schema
  import Ecto.Changeset

  @types ["chat_message", "calendar_reminder", "new_match", "consent_needed", "stake_needed", "calendar_slot"]

  schema "notifications" do
    field :type, :string
    field :body, :string
    field :link, :string
    field :is_read, :boolean, default: false

    belongs_to :user, Vokazi.Accounts.User

    timestamps()
  end

  @doc false
  def changeset(notification, attrs) do
    notification
    |> cast(attrs, [:user_id, :type, :body, :link, :is_read])
    |> validate_required([:user_id, :type, :body])
    |> validate_inclusion(:type, @types)
  end
end
