defmodule VokaziWeb.TurnCredentialsController do
  use VokaziWeb, :controller

  alias Vokazi.Calling.TurnCredentials

  @doc "ICE server config for this user's call - see `Vokazi.Calling.TurnCredentials`."
  def show(conn, _params) do
    case TurnCredentials.generate(conn.assigns.current_user_id) do
      {:ok, credentials} ->
        json(conn, credentials)

      {:error, _reason} ->
        conn |> put_status(:service_unavailable) |> json(%{error: "Couldn't set up calling credentials right now."})
    end
  end
end
