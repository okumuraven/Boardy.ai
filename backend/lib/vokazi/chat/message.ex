defmodule Vokazi.Chat.Message do
  use Ecto.Schema
  import Ecto.Changeset

  schema "messages" do
    field :content, :string
    belongs_to :chat_room, Vokazi.Chat.ChatRoom
    belongs_to :sender, Vokazi.Accounts.User

    timestamps()
  end

  @max_content_length 4_000

  @doc false
  def changeset(message, attrs) do
    message
    |> cast(attrs, [:content, :chat_room_id, :sender_id])
    |> update_change(:content, &(&1 && String.trim(&1)))
    |> validate_required([:content, :chat_room_id, :sender_id])
    |> validate_length(:content, min: 1, max: @max_content_length)
  end
end
