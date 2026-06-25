defmodule BoardyWeb.ChatRoomChannel do
  use BoardyWeb, :channel

  alias Boardy.Chat

  @impl true
  def join("chat_room:" <> room_id, payload, socket) do
    # Here we could check if the user is authorized to join the match room
    # For MVP, we allow them in
    send(self(), :after_join)
    {:ok, assign(socket, :room_id, room_id)}
  end

  @impl true
  def handle_info(:after_join, socket) do
    room_id = socket.assigns.room_id
    messages = Chat.list_messages_for_room(room_id)
    
    # Broadcast existing messages to the joining user
    push(socket, "presence_state", %{}) # if we wanted presence
    
    # Send historical messages to the newly joined client
    push(socket, "history", %{
      messages: Enum.map(messages, fn m -> 
        %{
          id: m.id,
          content: m.content,
          sender_id: m.sender_id,
          inserted_at: m.inserted_at
        }
      end)
    })

    {:noreply, socket}
  end

  @impl true
  def handle_in("new_msg", %{"content" => content}, socket) do
    user_id = socket.assigns.user_id
    room_id = socket.assigns.room_id

    case Chat.create_message(%{content: content, sender_id: user_id, chat_room_id: room_id}) do
      {:ok, message} ->
        broadcast!(socket, "new_msg", %{
          id: message.id,
          content: message.content,
          sender_id: message.sender_id,
          inserted_at: message.inserted_at
        })
        {:reply, :ok, socket}

      {:error, _changeset} ->
        {:reply, {:error, %{reason: "Could not save message"}}, socket}
    end
  end
end
