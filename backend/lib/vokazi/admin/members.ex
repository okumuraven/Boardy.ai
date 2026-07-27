defmodule Vokazi.Admin.Members do
  @moduledoc """
  Search/list/detail for Kuzana staff support use - unlike
  `Vokazi.Directory` (member-facing browsing), this shows EVERY user
  regardless of onboarding completion, and never excludes anyone.

  Phone numbers are never included by any function here - Tier 4, "never
  shared, even internally" per `kuzana_playbook.md` §10. See
  "Admin panel.md" §5.
  """

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.{User, Profile}
  alias Vokazi.SocialProfiles.SocialProfile
  alias Vokazi.Investment.InvestmentProfile
  alias Vokazi.Admin.AuditLog

  @per_page 25

  @doc "`opts` (all optional): :search, :role, :industry, :stuck (boolean), :page (1-indexed)."
  def list_members(opts \\ %{}) do
    page = max(Map.get(opts, :page, 1), 1)
    search = blank_to_nil(Map.get(opts, :search))
    role = blank_to_nil(Map.get(opts, :role))
    industry = blank_to_nil(Map.get(opts, :industry))
    stuck = Map.get(opts, :stuck)

    base_query =
      from(u in User, left_join: p in Profile, on: p.user_id == u.id)
      |> maybe_filter_search(search)
      |> maybe_filter_role(role)
      |> maybe_filter_industry(industry)
      |> maybe_filter_stuck(stuck)

    total_count = base_query |> select([u, p], count(u.id)) |> Repo.one()

    rows =
      base_query
      |> order_by([u, p], desc: u.inserted_at)
      |> limit(^@per_page)
      |> offset(^((page - 1) * @per_page))
      |> select([u, p], %{user: u, profile: p})
      |> Repo.all()

    %{
      members: Enum.map(rows, &to_summary/1),
      page: page,
      per_page: @per_page,
      total_count: total_count,
      total_pages: max(ceil(total_count / @per_page), 1)
    }
  end

  defp to_summary(%{user: u, profile: p}) do
    %{
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      industry: u.industry,
      company: u.company,
      location: u.location,
      onboarding_completed: u.onboarding_completed,
      is_verified: u.is_verified,
      has_completed_interview: !!(p && p.offer_text && p.need_text),
      inserted_at: u.inserted_at
    }
  end

  @doc """
  Full detail (offer/need text, social profile, investment profile) -
  the controller decides which fields a Support-tier caller actually
  sees vs. Moderator+; this always returns everything available.
  Phone number is deliberately excluded entirely, not just hidden by the
  controller - see moduledoc.
  """
  def get_member(id) do
    case Repo.get(User, id) do
      nil ->
        nil

      user ->
        profile = Repo.get_by(Profile, user_id: id)
        social = Repo.get_by(SocialProfile, user_id: id)
        investment = Repo.get_by(InvestmentProfile, user_id: id)
        %{user: user, profile: profile, social: social, investment: investment}
    end
  end

  @doc """
  Moderator+ only (checked by the controller) - this *is* Felicity's
  existing Applications-screening workflow, digitized. Audit-logged
  atomically - the flag cannot flip without its audit row. See
  "Admin panel.md" §3/§5.
  """
  def set_verified(member_id, admin_id, verified?) when is_boolean(verified?) do
    case Repo.get(User, member_id) do
      nil ->
        {:error, :not_found}

      user ->
        Ecto.Multi.new()
        |> Ecto.Multi.update(:user, User.admin_changeset(user, %{is_verified: verified?}))
        |> Ecto.Multi.insert(:audit_log, fn %{user: updated} ->
          AuditLog.changeset(%AuditLog{}, %{
            admin_user_id: admin_id,
            action: "member.verify",
            target_type: "user",
            target_id: updated.id,
            metadata: %{"is_verified" => verified?}
          })
        end)
        |> Repo.transaction()
        |> case do
          {:ok, %{user: updated}} -> {:ok, updated}
          {:error, _step, changeset, _changes} -> {:error, changeset}
        end
    end
  end

  @doc """
  Moderator+ only (checked by the controller) - the one deliberate
  exception to "reads aren't audit-logged" (see Vokazi.Admin.AuditLog
  moduledoc): phone numbers are Tier 4, "never shared, even internally"
  per `kuzana_playbook.md` §10, so every single reveal gets its own
  audit row, unconditionally, regardless of tier - never treated as a
  routine lookup. The audit row itself never stores the phone number,
  only that a reveal happened, when, and by whom.
  """
  def reveal_phone(member_id, admin_id) do
    case Repo.get(User, member_id) do
      nil ->
        {:error, :not_found}

      _user ->
        AuditLog.changeset(%AuditLog{}, %{
          admin_user_id: admin_id,
          action: "member.reveal_phone",
          target_type: "user",
          target_id: member_id
        })
        |> Repo.insert()
        |> case do
          {:ok, _log} ->
            profile = Repo.get_by(Profile, user_id: member_id)
            {:ok, profile && profile.phone_number}

          {:error, changeset} ->
            {:error, changeset}
        end
    end
  end

  defp blank_to_nil(nil), do: nil
  defp blank_to_nil(""), do: nil
  defp blank_to_nil(value), do: value

  defp maybe_filter_search(query, nil), do: query

  defp maybe_filter_search(query, search) do
    pattern = "%#{search}%"
    where(query, [u, p], ilike(u.full_name, ^pattern) or ilike(u.email, ^pattern) or ilike(u.company, ^pattern))
  end

  defp maybe_filter_role(query, nil), do: query
  defp maybe_filter_role(query, role), do: where(query, [u, p], u.role == ^role)

  defp maybe_filter_industry(query, nil), do: query
  defp maybe_filter_industry(query, industry), do: where(query, [u, p], u.industry == ^industry)

  # "Stuck" = hasn't made it all the way through the funnel yet -
  # kuzana_playbook.md §8's "the real leverage point is improving
  # conversion of incomplete applications" gives staff a worklist to
  # actually follow up on, matching Vokazi.Admin.Stats.onboarding_funnel/0's
  # same three stages.
  defp maybe_filter_stuck(query, true) do
    where(query, [u, p], u.onboarding_completed == false or is_nil(p.offer_text) or is_nil(p.need_text))
  end

  defp maybe_filter_stuck(query, _), do: query
end
