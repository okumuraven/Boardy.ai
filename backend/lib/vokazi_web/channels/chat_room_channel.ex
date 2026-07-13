defmodule VokaziWeb.ChatRoomChannel do
  use VokaziWeb, :channel

  alias Vokazi.Chat
  alias VokaziWeb.Presence

  @impl true
  def join("chat_room:" <> room_id_str, _payload, socket) do
    user_id = socket.assigns.user_id
    room_id = String.to_integer(room_id_str)
    room = Chat.get_chat_room!(room_id)

    with true <- room.is_active,
         true <- Chat.participant?(room_id, user_id) do
      send(self(), :after_join)
      {:ok, assign(socket, :room_id, room_id)}
    else
      false -> {:error, %{reason: "unauthorized"}}
    end
  rescue
    Ecto.NoResultsError -> {:error, %{reason: "not_found"}}
    ArgumentError -> {:error, %{reason: "not_found"}}
  end

  @impl true
  def handle_info(:after_join, socket) do
    room_id = socket.assigns.room_id
    user_id = socket.assigns.user_id

    messages = Chat.list_recent_messages(room_id)
    push(socket, "history", %{messages: Enum.map(messages, &serialize_message/1)})

    {:ok, _ref} = Presence.track(socket, to_string(user_id), %{online_at: System.system_time(:second)})
    push(socket, "presence_state", Presence.list(socket))

    {:noreply, socket}
  end

  @impl true
  def handle_in("new_msg", %{"content" => content}, socket) do
    user_id = socket.assigns.user_id
    room_id = socket.assigns.room_id

    case Chat.create_message(%{content: content, sender_id: user_id, chat_room_id: room_id}) do
      {:ok, message} ->
        broadcast!(socket, "new_msg", serialize_message(message))
        {:reply, :ok, socket}

      {:error, changeset} ->
        {:reply, {:error, %{reason: changeset_error_message(changeset)}}, socket}
    end
  end

  def handle_in("new_msg", _payload, socket) do
    {:reply, {:error, %{reason: "invalid_payload"}}, socket}
  end

  @impl true
  def handle_in("load_more", %{"before_id" => before_id}, socket) do
    messages = Chat.list_messages_before(socket.assigns.room_id, before_id)
    {:reply, {:ok, %{messages: Enum.map(messages, &serialize_message/1)}}, socket}
  end

  defp serialize_message(message) do
    %{
      id: message.id,
      content: message.content,
      sender_id: message.sender_id,
      sender_name: message.sender && message.sender.full_name,
      inserted_at: message.inserted_at
    }
  end

  defp changeset_error_message(changeset) do
    changeset.errors
    |> Enum.map(fn {field, {msg, _}} -> "#{field} #{msg}" end)
    |> Enum.join(", ")
  end
end
