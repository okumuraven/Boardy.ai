defmodule VokaziWeb.UserSocket do
  use Phoenix.Socket

  ## Channels
  channel "chat_room:*", VokaziWeb.ChatRoomChannel
  channel "user:*", VokaziWeb.NotificationChannel

  # `user_id` used to be trusted directly off the client's connect
  # params - meaning any client could open a chat/notification socket
  # claiming to be anyone at all. Now the client sends the same signed
  # session `token` every authenticated HTTP request uses
  # (`Vokazi.Auth.Session`); the real `user_id` only ever comes from
  # verifying that token, never from a client-asserted value.
  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    case Vokazi.Auth.Session.verify_token(token) do
      {:ok, user_id} -> {:ok, assign(socket, :user_id, user_id)}
      {:error, _reason} -> :error
    end
  end

  def connect(_params, _socket, _connect_info) do
    :error
  end

  # Socket id's are topics that allow you to identify all sockets for a given user:
  #
  #     def id(socket), do: "user_socket:#{socket.assigns.user_id}"
  #
  # Would allow you to broadcast a "disconnect" event and terminate
  # all active sockets and channels for a given user:
  #
  #     Elixir.VokaziWeb.Endpoint.broadcast("user_socket:#{user.id}", "disconnect", %{})
  #
  # Returning `nil` makes this socket anonymous.
  @impl true
  def id(_socket), do: nil
end
