defmodule Vokazi.Admin.Stats do
  @moduledoc """
  Aggregate counts for the admin dashboard. Includes a named capital-side
  (investor/lender) slice - `kuzana_connect_discovery.md` §4 calls a
  vetted deal-flow layer "a bigger, more scalable opportunity than
  membership fees alone," explicit strategic language worth its own
  named breakdown rather than being buried in generic counts. See
  "Admin panel.md" §9.
  """

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.{User, Profile}
  alias Vokazi.Matchmaking.Match
  alias Vokazi.Investment.InvestmentProfile

  def summary do
    %{
      total_members: Repo.aggregate(User, :count),
      onboarded_members: Repo.aggregate(from(u in User, where: u.onboarding_completed == true), :count),
      verified_members: Repo.aggregate(from(u in User, where: u.is_verified == true), :count),
      funnel: onboarding_funnel(),
      matches_by_status: matches_by_status(),
      capital_side: capital_side_slice()
    }
  end

  defp matches_by_status do
    from(m in Match, group_by: m.status, select: {m.status, count(m.id)})
    |> Repo.all()
    |> Map.new()
  end

  # kuzana_playbook.md §8's clearest stated insight: "the real leverage
  # point is improving conversion of incomplete applications, not
  # driving more raw traffic." Three funnel stages, no schema change -
  # interview_completed mirrors the exact offer_text/need_text check
  # already used by Vokazi.Admin.Members.to_summary/1.
  defp onboarding_funnel do
    %{
      signed_in: Repo.aggregate(User, :count),
      profile_completed: Repo.aggregate(from(u in User, where: u.onboarding_completed == true), :count),
      interview_completed:
        Repo.aggregate(
          from(u in User,
            join: p in Profile,
            on: p.user_id == u.id,
            where: not is_nil(p.offer_text) and not is_nil(p.need_text)
          ),
          :count
        )
    }
  end

  # Founders actively looking for funding vs. who's actually available to
  # fund them, broken out by funding type (equity/loan/grant/working
  # capital) per the Korir/Vula finding that these are genuinely
  # different segments, not one "seeking investment" bucket.
  defp capital_side_slice do
    founders_seeking_funding_ids =
      from(u in User,
        join: p in Profile,
        on: p.user_id == u.id,
        where: u.role == "founder" and fragment("? = ANY(?)", "funding", p.looking_for_tags),
        select: u.id
      )
      |> Repo.all()

    investors_and_lenders_count =
      Repo.aggregate(from(u in User, where: u.role in ["investor", "lender"]), :count)

    funding_type_breakdown =
      from(ip in InvestmentProfile, where: ip.user_id in ^founders_seeking_funding_ids, select: ip.funding_types)
      |> Repo.all()
      |> List.flatten()
      |> Enum.frequencies()

    %{
      founders_seeking_funding: length(founders_seeking_funding_ids),
      investors_and_lenders: investors_and_lenders_count,
      funding_type_breakdown: funding_type_breakdown
    }
  end
end
