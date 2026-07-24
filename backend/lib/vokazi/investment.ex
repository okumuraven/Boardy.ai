defmodule Vokazi.Investment do
  @moduledoc """
  The optional structured "funding/investment" layer on top of a profile
  (Phase 4, Investor & Lender View) - a founder's funding stage/amount
  sought/financials, or an investor/lender's check size and sectors of
  interest. Surfaced only to whoever it applies to: anyone whose
  `looking_for_tags` includes "funding" (`Vokazi.Accounts.Profile`), or
  anyone with role "investor" - the frontend decides when to show the
  prompt, this context just stores whatever's filled in.
  """

  alias Vokazi.Repo
  alias Vokazi.Investment.InvestmentProfile

  @doc "This user's investment details, or a fresh empty one if they haven't filled anything in yet."
  def get_for_user(user_id) do
    Repo.get_by(InvestmentProfile, user_id: user_id) || %InvestmentProfile{user_id: user_id}
  end

  @doc "Upserts a user's funding/investment details - whichever fields the caller sends."
  def upsert(user_id, attrs) do
    fetch_or_new(user_id)
    |> InvestmentProfile.changeset(Map.put(attrs, "user_id", user_id))
    |> Repo.insert_or_update()
  end

  defp fetch_or_new(user_id), do: Repo.get_by(InvestmentProfile, user_id: user_id) || %InvestmentProfile{}
end
