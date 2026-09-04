defmodule Vokazi.Directory do
  @moduledoc """
  The searchable, filterable member directory (Phase 4,
  `kuzana_connect_discovery.md`) - a browsable alternative to the
  AI-suggested match queue, since "who's even in the community" was the
  single most-requested thing across Kuzana's own July 2026 member
  interviews. Complements `Vokazi.Matchmaking`, doesn't replace it.

  Only members who've completed their voice interview (have both
  `offer_text` and `need_text`) are listed - an empty card would just be
  noise. Each result also carries the current user's existing match
  status with that person, if any, so the frontend can show "Connect"
  vs. a status badge instead of ever risking a duplicate match attempt.
  """

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.{User, Profile}
  alias Vokazi.Matchmaking.Match
  alias Vokazi.SocialProfiles.SocialProfile
  alias Vokazi.Investment.InvestmentProfile

  @per_page 20

  @doc """
  `opts` is a map with `:user_id` (required - excluded from results, and
  whose existing matches are used to compute each row's `:match` status)
  plus optional `:search`, `:industry`, `:role`, `:looking_for`,
  `:can_help` (each a single tag from `Profile.connection_tags/0`),
  `:funding_type` (a value from `InvestmentProfile.funding_types/0`),
  `:page` (1-indexed).
  """
  def list_members(opts) do
    user_id = Map.fetch!(opts, :user_id)
    page = max(Map.get(opts, :page, 1), 1)
    search = blank_to_nil(Map.get(opts, :search))
    industry = blank_to_nil(Map.get(opts, :industry))
    role = blank_to_nil(Map.get(opts, :role))
    looking_for = blank_to_nil(Map.get(opts, :looking_for))
    can_help = blank_to_nil(Map.get(opts, :can_help))
    funding_type = blank_to_nil(Map.get(opts, :funding_type))

    base_query =
      from(u in User,
        join: p in Profile,
        on: p.user_id == u.id,
        left_join: ip in InvestmentProfile,
        on: ip.user_id == u.id,
        where: u.id != ^user_id,
        where: not is_nil(p.offer_text) and not ilike(p.offer_text, "%Not explicitly stated%"),
        where: not is_nil(p.need_text) and not ilike(p.need_text, "%Not explicitly stated%"),
        where: p.need_text != "Requires manual parsing. Raw transcript saved."
      )
      |> maybe_filter_search(search)
      |> maybe_filter_field(:industry, industry)
      |> maybe_filter_field(:role, role)
      |> maybe_filter_tag(:looking_for_tags, looking_for)
      |> maybe_filter_tag(:can_help_tags, can_help)
      |> maybe_filter_funding_type(funding_type)

    total_count = base_query |> select([u, p, ip], count(u.id)) |> Repo.one()

    rows =
      base_query
      |> order_by([u, p, ip], desc: u.inserted_at)
      |> limit(^@per_page)
      |> offset(^((page - 1) * @per_page))
      |> select([u, p, ip], %{user: u, profile: p, investment: ip})
      |> Repo.all()

    other_ids = Enum.map(rows, & &1.user.id)
    social_by_user_id = social_profiles_by_user_id(other_ids)
    match_by_user_id = match_statuses_for(user_id, other_ids)

    %{
      members: Enum.map(rows, &to_member(&1, social_by_user_id, match_by_user_id)),
      page: page,
      per_page: @per_page,
      total_count: total_count,
      total_pages: max(ceil(total_count / @per_page), 1)
    }
  end

  @doc """
  The card exactly as this user's own Directory row would render for
  someone else - the "preview as public" feature (profile.md §5),
  reusing the same `to_member/3` shaping rather than a second,
  parallel serialization that could quietly drift out of sync with the
  real one. Works even before a member has completed onboarding
  (defaults to an empty `%Profile{}` for whatever `to_member/3` reads)
  since the point is letting someone see the effect of filling
  something in *before* they've filled it in, not just after.
  """
  def preview_for_user(user_id) do
    user = Repo.get!(User, user_id)
    profile = Repo.get_by(Profile, user_id: user_id) || %Profile{user_id: user_id}
    investment = Repo.get_by(InvestmentProfile, user_id: user_id)

    %{user: user, profile: profile, investment: investment}
    |> to_member(social_profiles_by_user_id([user_id]), %{})
  end

  defp to_member(%{user: u, profile: p, investment: ip}, social_by_user_id, match_by_user_id) do
    social = Map.get(social_by_user_id, u.id)

    %{
      user_id: u.id,
      name: u.full_name,
      role: u.role,
      industry: u.industry,
      company: u.company,
      location: u.location,
      # A one-line headline (profile.md §5) - reuses the existing `bio`
      # field rather than adding a second, competing "who are you" field.
      # bio was already collected on Profile but never actually shown
      # anywhere before this; the card truncates it to one line via CSS.
      bio: u.bio,
      offer_text: p.offer_text,
      looking_for_tags: p.looking_for_tags,
      can_help_tags: p.can_help_tags,
      rate_types: p.rate_types,
      available_for_hire: p.available_for_hire,
      # "Profile complete" (photo + interview + staff-confirmed phone) -
      # NOT Felicity's staff-reviewed User.is_verified. See
      # Vokazi.Accounts.Profile.complete?/2 moduledoc for why these are
      # deliberately kept separate.
      verified: Profile.complete?(u, p),
      portfolio_url: social && social.portfolio_url,
      match: Map.get(match_by_user_id, u.id),
      investment: investment_summary(ip),
      avatar_url: if(u.avatar_path, do: "/api/profiles/#{u.id}/avatar", else: nil),
      business_photos: business_photo_urls(u.id, p)
    }
  end

  # Only shown to other members once the owner has explicitly opted in
  # (Profile.business_photos_public) - the same gate
  # ProfileMediaController.show_business_photo/2 enforces server-side, so
  # a card can never link to a photo the backend would then refuse to
  # actually serve.
  defp business_photo_urls(_user_id, %Profile{business_photos_public: false}), do: []

  defp business_photo_urls(user_id, %Profile{business_photos_public: true, business_photos: photos}) do
    photos
    |> Enum.with_index()
    |> Enum.map(fn {_path, index} -> "/api/profiles/#{user_id}/business_photos/#{index}" end)
  end

  # nil when the member has no investment_profiles row at all (never
  # filled anything in) - a fresh empty row would just be five nil/[]
  # fields the frontend has to check individually instead of one falsy
  # value meaning "nothing to show here."
  defp investment_summary(nil), do: nil

  defp investment_summary(%InvestmentProfile{} = ip) do
    %{
      business_stage: ip.business_stage,
      funding_amount_sought: ip.funding_amount_sought,
      funding_types: ip.funding_types,
      key_financials: ip.key_financials,
      check_size: ip.check_size,
      sectors_of_interest: ip.sectors_of_interest
    }
  end

  defp blank_to_nil(nil), do: nil
  defp blank_to_nil(""), do: nil
  defp blank_to_nil(value), do: value

  defp maybe_filter_search(query, nil), do: query

  defp maybe_filter_search(query, search) do
    pattern = "%#{search}%"

    where(
      query,
      [u, p, ip],
      ilike(u.full_name, ^pattern) or ilike(p.offer_text, ^pattern) or ilike(p.need_text, ^pattern)
    )
  end

  defp maybe_filter_field(query, _field, nil), do: query
  defp maybe_filter_field(query, :industry, value), do: where(query, [u, p, ip], u.industry == ^value)
  defp maybe_filter_field(query, :role, value), do: where(query, [u, p, ip], u.role == ^value)

  defp maybe_filter_tag(query, _field, nil), do: query

  defp maybe_filter_tag(query, :looking_for_tags, tag) do
    where(query, [u, p, ip], fragment("? = ANY(?)", ^tag, p.looking_for_tags))
  end

  defp maybe_filter_tag(query, :can_help_tags, tag) do
    where(query, [u, p, ip], fragment("? = ANY(?)", ^tag, p.can_help_tags))
  end

  # investment_profiles is a left join (not everyone has a row), so this
  # tests the joined columns directly rather than reusing maybe_filter_tag -
  # ip.funding_types is nil (not []) for anyone without a row at all, and
  # `= ANY(NULL)` is simply false/unmatched, which is exactly what we want.
  defp maybe_filter_funding_type(query, nil), do: query

  defp maybe_filter_funding_type(query, funding_type) do
    where(query, [u, p, ip], fragment("? = ANY(?)", ^funding_type, ip.funding_types))
  end

  defp social_profiles_by_user_id([]), do: %{}

  defp social_profiles_by_user_id(user_ids) do
    SocialProfile
    |> where([s], s.user_id in ^user_ids)
    |> Repo.all()
    |> Map.new(&{&1.user_id, &1})
  end

  defp match_statuses_for(_current_user_id, []), do: %{}

  defp match_statuses_for(current_user_id, other_user_ids) do
    Match
    |> where(
      [m],
      (m.user_a_id == ^current_user_id and m.user_b_id in ^other_user_ids) or
        (m.user_b_id == ^current_user_id and m.user_a_id in ^other_user_ids)
    )
    |> Repo.all()
    |> Map.new(fn m ->
      {other_id, my_response} =
        if m.user_a_id == current_user_id do
          {m.user_b_id, m.user_a_response}
        else
          {m.user_a_id, m.user_b_response}
        end

      {other_id, %{match_id: m.id, status: m.status, my_response: my_response}}
    end)
  end
end
