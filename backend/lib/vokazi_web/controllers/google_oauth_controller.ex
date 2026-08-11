defmodule VokaziWeb.GoogleOAuthController do
  use VokaziWeb, :controller

  require Logger
  alias Vokazi.Scheduling

  @doc """
  Google redirects the user's browser here after the Calendar consent
  screen. Never returns JSON - this is a browser navigation, so on
  every outcome we redirect back into the frontend app with a query
  param it can react to, rather than leaving the user stranded on a
  bare API response.
  """
  def callback(conn, %{"code" => code, "state" => state}) do
    case Scheduling.handle_oauth_callback(code, state) do
      {:ok, {:match, match_id}} ->
        redirect(conn, external: "#{frontend_url()}/?calendar_connected=1&match_id=#{match_id}")

      {:ok, {:admin, _user_id}} ->
        redirect(conn, external: "#{frontend_url()}/admin?calendar_connected=1")

      {:error, :admin, _match_id, reason} ->
        Logger.error("GoogleOAuthController: admin callback failed: #{inspect(reason)}")
        redirect(conn, external: "#{frontend_url()}/admin?calendar_connect_error=1")

      # `match_id` may still be nil (e.g. a state we couldn't verify at
      # all) - carry it along when we have it so the frontend can reopen
      # that exact match's scheduling flow to show the error, instead of
      # dropping the user on the generic home screen with no context.
      {:error, tag, match_id, reason} ->
        Logger.error("GoogleOAuthController: #{tag} callback failed: #{inspect(reason)}")
        match_param = if match_id, do: "&match_id=#{match_id}", else: ""
        redirect(conn, external: "#{frontend_url()}/?calendar_connect_error=1#{match_param}")
    end
  end

  # Google hits this same callback with `error=access_denied` (no
  # `code`) if the user declines on Google's own consent screen.
  def callback(conn, _params) do
    redirect(conn, external: "#{frontend_url()}/?calendar_connect_error=1")
  end

  defp frontend_url, do: System.get_env("FRONTEND_URL") || "http://localhost:5173"
end
