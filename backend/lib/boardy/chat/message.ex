defmodule Boardy.Chat.Message do
  use Ecto.Schema
  import Ecto.Changeset

  schema "messages" do
    field :content, :string
    belongs_to :chat_room, Boardy.Chat.ChatRoom
    belongs_to :sender, Boardy.Accounts.User

    timestamps()
  end

  @doc false
  def changeset(message, attrs) do
    message
    |> cast(attrs, [:content, :chat_room_id, :sender_id])
    |> validate_required([:content, :chat_room_id, :sender_id])
  end
end
