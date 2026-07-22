defmodule Vokazi.SocialProfiles do
  @moduledoc """
  A user's own professional social presence - GitHub (OAuth-verified,
  see `Vokazi.SocialProfiles.GithubOAuth`) plus LinkedIn/X/portfolio
  (trust-on-submit links). Lives entirely on the user's own Profile page
  today; feeding this into the AI intro briefing and gating raw-link
  reveal to a matched user behind match-unlock are deliberate next
  steps, not built yet - see `social_media.md`.
  """

  alias Vokazi.Repo
  alias Vokazi.SocialProfiles.SocialProfile

  @doc "This user's connected social profile, or a fresh empty one if they haven't connected anything yet."
  def get_for_user(user_id) do
    Repo.get_by(SocialProfile, user_id: user_id) || %SocialProfile{user_id: user_id}
  end

  @doc "Upserts the LinkedIn/X/portfolio links - GitHub is untouched here, it has its own OAuth-verified path."
  def upsert_links(user_id, attrs) do
    fetch_or_new(user_id)
    |> SocialProfile.link_changeset(Map.put(attrs, "user_id", user_id))
    |> Repo.insert_or_update()
  end

  @doc "Stores the OAuth-verified GitHub username and its computed summary (Vokazi.SocialProfiles.GithubClient)."
  def connect_github(user_id, username, summary) do
    fetch_or_new(user_id)
    |> SocialProfile.github_changeset(%{"user_id" => user_id, "github_username" => username, "github_summary" => summary})
    |> Repo.insert_or_update()
  end

  @doc "Clears the GitHub connection only - LinkedIn/X/portfolio are untouched."
  def disconnect_github(user_id) do
    case Repo.get_by(SocialProfile, user_id: user_id) do
      nil -> {:ok, %SocialProfile{user_id: user_id}}
      profile -> profile |> SocialProfile.disconnect_github_changeset() |> Repo.update()
    end
  end

  defp fetch_or_new(user_id), do: Repo.get_by(SocialProfile, user_id: user_id) || %SocialProfile{}
end
