defmodule VokaziWeb.NotificationChannel do
  @moduledoc """
  A user's personal channel (`user:<id>`) - distinct from
  `chat_room:<id>` - joined once at app load rather than per-screen, so
  live notification delivery doesn't depend on which screen is open.
  """
  use VokaziWeb, :channel

  alias Vokazi.Notifications

  @impl true
  def join("user:" <> user_id_str, _payload, socket) do
    with {user_id, ""} <- Integer.parse(user_id_str),
         true <- socket.assigns.user_id == user_id do
      send(self(), :after_join)
      {:ok, socket}
    else
      _ -> {:error, %{reason: "unauthorized"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    user_id = socket.assigns.user_id
    notifications = user_id |> Notifications.list_recent() |> Enum.map(&Notifications.serialize/1)
    push(socket, "history", %{notifications: notifications, unread_count: Notifications.unread_count(user_id)})
    {:noreply, socket}
  end
end
