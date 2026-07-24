defmodule VokaziWeb.TurnCredentialsController do
  use VokaziWeb, :controller

  alias Vokazi.Calling.TurnCredentials

  @doc "Short-lived coturn credentials for this user - see `Vokazi.Calling.TurnCredentials`."
  def show(conn, %{"user_id" => user_id}) do
    json(conn, TurnCredentials.generate(to_int(user_id)))
  end

  defp to_int(id) when is_integer(id), do: id
  defp to_int(id) when is_binary(id), do: String.to_integer(id)
end
