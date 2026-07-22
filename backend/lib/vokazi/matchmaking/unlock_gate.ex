defmodule Vokazi.Matchmaking.UnlockGate do
  @moduledoc """
  The single "is this match unlocked, and for this specific user" check -
  every feature gated on the Trust-Gate (`Vokazi.Scheduling`, and now
  `Vokazi.Reputation`'s counterpart-profile reveal) needs this exact
  three-part check: does the match exist, is this user actually one of
  its two participants, and has it fully unlocked (both sides staked).
  """

  alias Vokazi.Repo
  alias Vokazi.Matchmaking.Match

  @doc """
  `{:ok, match}` once unlocked for this user, or `{:error, :not_found}`
  / `{:error, :not_a_participant}` / `{:error, :match_not_unlocked}`.
  """
  def unlocked_match_for(match_id, user_id) do
    case Repo.get(Match, match_id) do
      nil -> {:error, :not_found}
      match when user_id not in [match.user_a_id, match.user_b_id] -> {:error, :not_a_participant}
      match when match.status != "unlocked" -> {:error, :match_not_unlocked}
      match -> {:ok, match}
    end
  end
end
