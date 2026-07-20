defmodule Vokazi.Chat do
  @moduledoc """
  The Chat context.
  """
  import Ecto.Query, warn: false
  alias Vokazi.Repo
  alias Vokazi.Chat.{ChatRoom, Message}
  alias Vokazi.Matchmaking.Match
  alias Vokazi.Notifications

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

  @doc """
  Saves a message. Also fires an in-app notification for the recipient
  if they aren't currently connected to this room's channel - this is
  the single choke point for that check, since both real chat messages
  (`ChatRoomChannel.handle_in/3`) and `Vokazi.Scheduling`'s reminder
  nudges both funnel through this one function. Pass
  `notification_type: "calendar_reminder"` in `attrs` for the latter -
  it's read here but never persisted onto the `Message` itself
  (`Message.changeset/2`'s cast allowlist simply ignores it), only used
  to decide what kind of notification (if any) to fire.
  """
  def create_message(attrs \\ %{}) do
    notification_type = Map.get(attrs, :notification_type) || Map.get(attrs, "notification_type") || "chat_message"

    %Message{}
    |> Message.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, message} ->
        message = Repo.preload(message, :sender)
        notify_recipient_if_absent(message, notification_type)
        {:ok, message}

      error ->
        error
    end
  end

  defp notify_recipient_if_absent(message, notification_type) do
    room = Repo.get!(ChatRoom, message.chat_room_id)
    match = Repo.get!(Match, room.match_id)
    recipient_id = if match.user_a_id == message.sender_id, do: match.user_b_id, else: match.user_a_id

    present? =
      "chat_room:#{room.id}"
      |> VokaziWeb.Presence.list()
      |> Map.has_key?(to_string(recipient_id))

    unless present? do
      preview = String.slice(message.content, 0, 80)

      # Carries everything the frontend needs to land the recipient
      # somewhere useful - the chat room, but also the match (so the
      # "Schedule Intro Call" button has what it needs), the sender's
      # name (so the header shows a real person instead of "Your
      # match"), and whether to open straight into the scheduling
      # screen rather than the raw chat thread.
      link =
        Jason.encode!(%{
          room_id: room.id,
          match_id: match.id,
          partner_name: message.sender.full_name,
          open_scheduling: notification_type == "calendar_reminder"
        })

      Notifications.notify(recipient_id, notification_type, notification_body(notification_type, message, preview), link)
    end
  end

  # A reminder's content ("🔔 Reminder from X: ...") already names the
  # sender in third person - prefixing it again with "X: " would repeat
  # the name twice. Regular messages still get the "Sender: preview"
  # convention.
  defp notification_body("calendar_reminder", _message, preview), do: preview
  defp notification_body(_type, message, preview), do: "#{message.sender.full_name}: #{preview}"

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
