defmodule Vokazi.Chat do
  @moduledoc """
  The Chat context.
  """
  import Ecto.Query, warn: false
  alias Vokazi.Repo
  alias Vokazi.Chat.{ChatRoom, Message}
  alias Vokazi.Matchmaking.Match

  def create_chat_room(attrs \\ %{}) do
    %ChatRoom{}
    |> ChatRoom.changeset(attrs)
    |> Repo.insert()
  end

  def get_chat_room!(id), do: Repo.get!(ChatRoom, id)

  def get_chat_room_by_match_id!(match_id) do
    Repo.get_by!(ChatRoom, match_id: match_id)
  end

  @doc """
  Whether `user_id` is a participant in the match behind this chat room -
  the only person allowed to join or send in it.
  """
  def participant?(room_id, user_id) do
    Repo.exists?(
      from(r in ChatRoom,
        join: m in Match,
        on: m.id == r.match_id,
        where: r.id == ^room_id and (m.user_a_id == ^user_id or m.user_b_id == ^user_id)
      )
    )
  end

  def create_message(attrs \\ %{}) do
    %Message{}
    |> Message.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, message} -> {:ok, Repo.preload(message, :sender)}
      error -> error
    end
  end

  @doc """
  Most recent `limit` messages in a room, oldest-first (ready to render
  top-to-bottom) - not the full history, so a long-lived room never ships
  its entire backlog on every join/reconnect.
  """
  def list_recent_messages(room_id, limit \\ 50) do
    Message
    |> where([m], m.chat_room_id == ^room_id)
    |> order_by([m], desc: m.id)
    |> limit(^limit)
    |> preload(:sender)
    |> Repo.all()
    |> Enum.reverse()
  end

  @doc """
  Keyset pagination for scrolling further back - messages strictly before
  `before_id`, oldest-first, ready to prepend to what's already loaded.
  """
  def list_messages_before(room_id, before_id, limit \\ 50) do
    Message
    |> where([m], m.chat_room_id == ^room_id and m.id < ^before_id)
    |> order_by([m], desc: m.id)
    |> limit(^limit)
    |> preload(:sender)
    |> Repo.all()
    |> Enum.reverse()
  end
end
