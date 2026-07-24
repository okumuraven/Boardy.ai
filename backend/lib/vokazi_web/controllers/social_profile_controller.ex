defmodule VokaziWeb.SocialProfileController do
  use VokaziWeb, :controller

  alias Vokazi.SocialProfiles
  alias Vokazi.SocialProfiles.GithubOAuth

  @doc "This user's own connected social profile state."
  def show(conn, _params) do
    json(conn, to_json(SocialProfiles.get_for_user(conn.assigns.current_user_id)))
  end

  @doc "Upserts LinkedIn/X/portfolio links."
  def upsert_links(conn, params) do
    case SocialProfiles.upsert_links(conn.assigns.current_user_id, Map.take(params, ["linkedin_url", "x_url", "portfolio_url"])) do
      {:ok, profile} -> json(conn, to_json(profile))
      {:error, _changeset} -> conn |> put_status(:unprocessable_entity) |> json(%{error: "That doesn't look like a valid link"})
    end
  end

  @doc "The GitHub consent URL to redirect the browser to."
  def github_connect_url(conn, _params) do
    json(conn, %{connect_url: GithubOAuth.authorize_url(conn.assigns.current_user_id)})
  end

  @doc "Disconnects GitHub only - LinkedIn/X/portfolio are untouched."
  def github_disconnect(conn, _params) do
    case SocialProfiles.disconnect_github(conn.assigns.current_user_id) do
      {:ok, profile} -> json(conn, to_json(profile))
      {:error, _changeset} -> conn |> put_status(:unprocessable_entity) |> json(%{error: "Couldn't disconnect"})
    end
  end

  defp to_json(profile) do
    %{
      github_username: profile.github_username,
      github_summary: profile.github_summary,
      linkedin_url: profile.linkedin_url,
      x_url: profile.x_url,
      portfolio_url: profile.portfolio_url
    }
  end
end
