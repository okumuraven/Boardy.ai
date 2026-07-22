defmodule VokaziWeb.GithubOAuthController do
  use VokaziWeb, :controller

  require Logger
  alias Vokazi.SocialProfiles
  alias Vokazi.SocialProfiles.{GithubOAuth, GithubClient}

  @doc """
  GitHub redirects the user's browser here after the connect consent
  screen. Never returns JSON - this is a browser navigation, so on
  every outcome we redirect back into the frontend app with a query
  param it can react to (same pattern as `GoogleOAuthController`).
  """
  def callback(conn, %{"code" => code, "state" => state}) do
    with {:ok, %{user_id: user_id}} <- GithubOAuth.verify_state(state),
         {:ok, %{access_token: token, github_username: username}} <- GithubOAuth.exchange_code(code),
         {:ok, summary} <- GithubClient.fetch_summary(username, token),
         {:ok, _profile} <- SocialProfiles.connect_github(user_id, username, summary) do
      redirect(conn, external: "#{frontend_url()}/?github_connected=1")
    else
      error ->
        Logger.error("GithubOAuthController: callback failed: #{inspect(error)}")
        redirect(conn, external: "#{frontend_url()}/?github_connect_error=1")
    end
  end

  # GitHub hits this same callback with no `code` if the user declines
  # on GitHub's own consent screen.
  def callback(conn, _params) do
    redirect(conn, external: "#{frontend_url()}/?github_connect_error=1")
  end

  defp frontend_url, do: System.get_env("FRONTEND_URL") || "http://localhost:5173"
end
