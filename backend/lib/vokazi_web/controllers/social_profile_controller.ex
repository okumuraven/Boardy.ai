defmodule VokaziWeb.SocialProfileController do
  use VokaziWeb, :controller

  alias Vokazi.SocialProfiles
  alias Vokazi.SocialProfiles.GithubOAuth

  @doc "This user's own connected social profile state."
  def show(conn, %{"user_id" => user_id}) do
    json(conn, to_json(SocialProfiles.get_for_user(to_int(user_id))))
  end

  @doc "Upserts LinkedIn/X/portfolio links."
  def upsert_links(conn, %{"user_id" => user_id} = params) do
    case SocialProfiles.upsert_links(to_int(user_id), Map.take(params, ["linkedin_url", "x_url", "portfolio_url"])) do
      {:ok, profile} -> json(conn, to_json(profile))
      {:error, _changeset} -> conn |> put_status(:unprocessable_entity) |> json(%{error: "That doesn't look like a valid link"})
    end
  end

  @doc "The GitHub consent URL to redirect the browser to."
  def github_connect_url(conn, %{"user_id" => user_id}) do
    json(conn, %{connect_url: GithubOAuth.authorize_url(to_int(user_id))})
  end

  @doc "Disconnects GitHub only - LinkedIn/X/portfolio are untouched."
  def github_disconnect(conn, %{"user_id" => user_id}) do
    case SocialProfiles.disconnect_github(to_int(user_id)) do
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

  defp to_int(id) when is_integer(id), do: id
  defp to_int(id) when is_binary(id), do: String.to_integer(id)
end
