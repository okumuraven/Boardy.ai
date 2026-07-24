defmodule Vokazi.Reputation.CounterpartProfile do
  @moduledoc """
  The redacted view a matched user sees of the *other* participant -
  gated by `Vokazi.Matchmaking.UnlockGate`, the same Trust-Gate every
  other cross-user reveal in this app depends on. Shows the AI-vetted
  professional pitch (offer/need - the actual point of a match, not
  "personal" in a privacy sense), summarized GitHub facts, and a
  verified/added presence badge for LinkedIn/X/portfolio - never the
  raw clickable link. This is the "verify but don't expose" reveal
  `social_media.md` recommended and deliberately deferred until now.
  """

  alias Vokazi.Repo
  alias Vokazi.Accounts.{User, Profile}
  alias Vokazi.Matchmaking.UnlockGate
  alias Vokazi.SocialProfiles
  alias Vokazi.Reputation.Stats

  @doc """
  `{:ok, redacted_view}` once the match is unlocked for `user_id`, else
  the same `{:error, _}` shapes as `Vokazi.Matchmaking.UnlockGate`.
  """
  def fetch(match_id, user_id) do
    with {:ok, match} <- UnlockGate.unlocked_match_for(match_id, user_id) do
      other_id = if match.user_a_id == user_id, do: match.user_b_id, else: match.user_a_id
      {:ok, build(other_id)}
    end
  end

  defp build(user_id) do
    user = Repo.get(User, user_id)
    profile = Repo.get_by(Profile, user_id: user_id)
    social = SocialProfiles.get_for_user(user_id)

    %{
      name: user && user.full_name,
      role: user && user.role,
      company: user && user.company,
      location: user && user.location,
      bio: user && user.bio,
      offer_text: profile && profile.offer_text,
      need_text: profile && profile.need_text,
      github: github_view(social),
      linkedin_verified: not is_nil(social.linkedin_url),
      x_verified: not is_nil(social.x_url),
      portfolio_added: not is_nil(social.portfolio_url),
      stats: Stats.stats_for_user(user_id),
      rank: user && Stats.rank_for_user(user_id, user.role)
    }
  end

  # Summary only - never the username, which is enough to construct the
  # raw profile link. See `social_media.md`: "never the raw handle or URL."
  defp github_view(%{github_username: nil}), do: nil
  defp github_view(social), do: social.github_summary
end
