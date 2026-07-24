defmodule VokaziWeb.TurnCredentialsController do
  use VokaziWeb, :controller

  alias Vokazi.Calling.TurnCredentials

  @doc "Short-lived coturn credentials for this user - see `Vokazi.Calling.TurnCredentials`."
  def show(conn, _params) do
    json(conn, TurnCredentials.generate(conn.assigns.current_user_id))
  end
end
