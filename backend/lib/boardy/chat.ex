defmodule Boardy.Chat do
  @moduledoc """
  The Chat context.
  """
  import Ecto.Query, warn: false
  alias Boardy.Repo
  alias Boardy.Chat.{ChatRoom, Message}

  def create_chat_room(attrs \\ %{}) do
    %ChatRoom{}
    |> ChatRoom.changeset(attrs)
    |> Repo.insert()
  end

  def get_chat_room!(id), do: Repo.get!(ChatRoom, id)

  def get_chat_room_by_match_id!(match_id) do
    Repo.get_by!(ChatRoom, match_id: match_id)
  end

  def create_message(attrs \\ %{}) do
    %Message{}
    |> Message.changeset(attrs)
    |> Repo.insert()
  end

  def list_messages_for_room(room_id) do
    Message
    |> where([m], m.chat_room_id == ^room_id)
    |> order_by([m], asc: m.inserted_at)
    |> preload(:sender)
    |> Repo.all()
  end
end
