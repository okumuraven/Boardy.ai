defmodule Vokazi.Chat.ChatRoomRead do
  use Ecto.Schema
  import Ecto.Changeset

  @moduledoc """
  A read CURSOR, one row per (chat_room, user) - "this person has seen
  everything up to last_read_message_id in this room," not a flag on
  every individual message. Read receipts (Vokazi.Chat.mark_read/3) only
  ever move this forward, never backward - a viewer who's already read
  message 50 doesn't become "unread" by re-opening a room whose latest
  message is still 50.
  """

  schema "chat_room_reads" do
    belongs_to :chat_room, Vokazi.Chat.ChatRoom
    belongs_to :user, Vokazi.Accounts.User
    belongs_to :last_read_message, Vokazi.Chat.Message

    timestamps()
  end

  @doc false
  def changeset(chat_room_read, attrs) do
    chat_room_read
    |> cast(attrs, [:chat_room_id, :user_id, :last_read_message_id])
    |> validate_required([:chat_room_id, :user_id])
    |> unique_constraint([:chat_room_id, :user_id])
  end
end
