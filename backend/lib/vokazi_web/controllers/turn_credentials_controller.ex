defmodule VokaziWeb.TurnCredentialsController do
  use VokaziWeb, :controller

  alias Vokazi.Calling.TurnCredentials

  @doc "ICE server config for this user's call - see `Vokazi.Calling.TurnCredentials`."
  def show(conn, _params) do
    json(conn, TurnCredentials.generate(conn.assigns.current_user_id))
  end
end
