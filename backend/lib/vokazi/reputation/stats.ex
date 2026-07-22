defmodule Vokazi.Reputation.Stats do
  @moduledoc """
  Two honest, separately-shown numbers per user - matches unlocked
  (both sides staked) and calls actually completed (the harder-to-game,
  stronger signal) - plus a role-scoped rank built on the latter. See
  `social_media.md` for why these are kept as two numbers rather than
  one blended stat, and why rank uses completed calls as its primary key.
  """

  import Ecto.Query, warn: false
  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Matchmaking.Match
  alias Vokazi.Scheduling.IntroSchedule

  @doc "`%{matches_unlocked: n, calls_completed: n}` for one user."
  def stats_for_user(user_id) do
    %{matches_unlocked: unlocked_count(user_id), calls_completed: completed_count(user_id)}
  end

  @doc """
  This user's dense rank among everyone sharing `role`, sorted by
  completed calls desc (ties share a rank). `nil` if this user has 0
  completed calls yet - not meaningfully ranked, shown as "not yet
  ranked" rather than a hollow last place.
  """
  def rank_for_user(user_id, role) do
    counts = completed_counts_by_role(role)
    my_count = Map.get(counts, user_id, 0)

    if my_count == 0 do
      nil
    else
      distinct_counts = counts |> Map.values() |> Enum.uniq() |> Enum.sort(:desc)
      rank = Enum.find_index(distinct_counts, &(&1 == my_count)) + 1
      %{rank: rank, total_in_category: map_size(counts)}
    end
  end

  defp unlocked_count(user_id) do
    Match
    |> where([m], (m.user_a_id == ^user_id or m.user_b_id == ^user_id) and m.status == "unlocked")
    |> Repo.aggregate(:count)
  end

  defp completed_count(user_id) do
    Match
    |> join(:inner, [m], s in IntroSchedule, on: s.match_id == m.id)
    |> where([m, s], (m.user_a_id == ^user_id or m.user_b_id == ^user_id) and s.status == "confirmed")
    |> Repo.aggregate(:count)
  end

  # Every user sharing `role` who has at least one completed call,
  # mapped to their completed-call count - the pool `rank_for_user/2`
  # ranks within. Small, fixed-size role set (see Accounts.User) means
  # computing this live on every request is cheap enough not to cache.
  defp completed_counts_by_role(role) do
    Match
    |> join(:inner, [m], s in IntroSchedule, on: s.match_id == m.id and s.status == "confirmed")
    |> join(:inner, [m, _s], ua in User, on: ua.id == m.user_a_id)
    |> join(:inner, [m, _s, _ua], ub in User, on: ub.id == m.user_b_id)
    |> where([m, _s, ua, ub], ua.role == ^role or ub.role == ^role)
    |> select([m, _s, ua, ub], {m.user_a_id, m.user_b_id, ua.role, ub.role})
    |> Repo.all()
    |> Enum.flat_map(fn {a_id, b_id, a_role, b_role} ->
      [if(a_role == role, do: a_id), if(b_role == role, do: b_id)]
    end)
    |> Enum.reject(&is_nil/1)
    |> Enum.frequencies()
  end
end
