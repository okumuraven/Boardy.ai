defmodule VokaziWeb.AuthPlug do
  @moduledoc """
  The one place every authenticated route's identity actually comes
  from. Reads `Authorization: Bearer <token>`, verifies it via
  `Vokazi.Auth.Session.verify_token/1`, and assigns the real, verified
  `current_user_id` - controllers must use this, never a client-supplied
  `user_id`/`wallet_address` param, to decide whose data a request can
  read or write.
  """
  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]

  alias Vokazi.Auth.Session

  def init(opts), do: opts

  def call(conn, _opts) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, user_id} <- Session.verify_token(token) do
      assign(conn, :current_user_id, user_id)
    else
      _ ->
        conn
        |> put_status(401)
        |> json(%{error: "Missing or invalid session"})
        |> halt()
    end
  end
end
