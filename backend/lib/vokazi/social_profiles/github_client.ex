defmodule Vokazi.SocialProfiles.GithubClient do
  @moduledoc """
  Thin GitHub API wrapper - computes a summary of a user's *public*
  presence for the AI briefing to eventually draw on (see
  `social_media.md`): account age, repo/follower counts, and top
  languages. Deliberately public-data-only, computed once at connect
  time rather than kept live - nothing here needs an ongoing token.
  """

  require Logger

  @user_url "https://api.github.com/user"
  @repos_url "https://api.github.com/users/:username/repos?per_page=100&sort=updated"
  @top_language_count 3

  @doc "Builds the summary map stored on `Vokazi.SocialProfiles.SocialProfile.github_summary`."
  def fetch_summary(username, access_token) do
    with {:ok, user} <- fetch_user(access_token),
         {:ok, repos} <- fetch_repos(username, access_token) do
      {:ok,
       %{
         "account_age_years" => account_age_years(user["created_at"]),
         "public_repos" => user["public_repos"] || 0,
         "followers" => user["followers"] || 0,
         "top_languages" => top_languages(repos)
       }}
    end
  end

  defp fetch_user(access_token) do
    case Req.get(@user_url, auth: {:bearer, access_token}, receive_timeout: 15_000) do
      {:ok, %Req.Response{status: 200, body: user}} -> {:ok, user}
      other -> log_and_error("fetch_user", other)
    end
  end

  defp fetch_repos(username, access_token) do
    url = String.replace(@repos_url, ":username", username)

    case Req.get(url, auth: {:bearer, access_token}, receive_timeout: 15_000) do
      {:ok, %Req.Response{status: 200, body: repos}} when is_list(repos) -> {:ok, repos}
      other -> log_and_error("fetch_repos", other)
    end
  end

  defp account_age_years(nil), do: 0

  defp account_age_years(created_at) do
    {:ok, created, _} = DateTime.from_iso8601(created_at)
    DateTime.diff(DateTime.utc_now(), created, :day) |> div(365)
  end

  defp top_languages(repos) do
    repos
    |> Enum.map(& &1["language"])
    |> Enum.reject(&is_nil/1)
    |> Enum.frequencies()
    |> Enum.sort_by(fn {_lang, count} -> -count end)
    |> Enum.take(@top_language_count)
    |> Enum.map(fn {lang, _count} -> lang end)
  end

  defp log_and_error(step, other) do
    Logger.error("Vokazi.SocialProfiles.GithubClient: #{step} failed: #{inspect(other)}")
    {:error, :github_fetch_failed}
  end
end
