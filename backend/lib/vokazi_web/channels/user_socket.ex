defmodule VokaziWeb.UserSocket do
  use Phoenix.Socket

  ## Channels
  channel "chat_room:*", VokaziWeb.ChatRoomChannel
  channel "user:*", VokaziWeb.NotificationChannel

  # Socket params are passed from the client and can
  # be used to verify and authenticate a user. After
  # verification, you can put default assigns into
  # the socket that will be set for all channels, ie
  #
  #     {:ok, assign(socket, :user_id, verified_user_id)}
  #
  # To deny connection, return `:error` or `{:error, term}`. To control the
  # response the client receives in that case, [define a `handle_failed_socket/2`
  # callback](https://hexdocs.pm/phoenix/Phoenix.Socket.html#c:handle_failed_socket/2).
  #
  # See `Phoenix.Token` documentation for examples in
  # performing token verification on connect.
  # Connect params always arrive as strings (they travel as a query
  # string on the websocket upgrade request, same as every other param
  # in this app) - assigning the raw string here would silently break
  # every integer comparison against user_a_id/user_b_id downstream.
  @impl true
  def connect(%{"user_id" => user_id}, socket, _connect_info) when is_integer(user_id) do
    {:ok, assign(socket, :user_id, user_id)}
  end

  def connect(%{"user_id" => user_id}, socket, _connect_info) when is_binary(user_id) do
    case Integer.parse(user_id) do
      {id, ""} -> {:ok, assign(socket, :user_id, id)}
      _ -> :error
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
