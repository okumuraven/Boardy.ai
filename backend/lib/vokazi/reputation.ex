defmodule Vokazi.Reputation do
  @moduledoc """
  Cross-cutting, on-platform trust signal - matches unlocked, calls
  completed, and a role-scoped rank built from real match/scheduling
  data (not self-reported). Spans `Vokazi.Matchmaking`,
  `Vokazi.Scheduling`, and `Vokazi.SocialProfiles`, so it doesn't
  belong nested under any single one of them.
  """

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Reputation.{Stats, CounterpartProfile}

  @doc "This user's own stats + rank - the source for the Profile page's stats card."
  def own_view(user_id) do
    user = Repo.get(User, user_id)
    %{stats: Stats.stats_for_user(user_id), rank: user && Stats.rank_for_user(user_id, user.role)}
  end

  @doc """
  The redacted view of a matched counterpart - see
  `Vokazi.Reputation.CounterpartProfile` for what's shown vs withheld.
  """
  defdelegate counterpart_profile(match_id, user_id), to: CounterpartProfile, as: :fetch
end
