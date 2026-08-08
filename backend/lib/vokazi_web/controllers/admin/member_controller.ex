defmodule VokaziWeb.Admin.MemberController do
  use VokaziWeb, :controller

  alias Vokazi.Admin.Members
  alias Vokazi.Accounts.User
  alias Vokazi.Repo

  @doc """
  The client-side reflection of the server-side check `VokaziWeb.AdminPlug`
  already performed to even reach this action - never itself the security
  boundary. Lets the admin frontend confirm who's signed in and which
  tier's UI to render (e.g. hiding the Admins tab from non-Superadmins).
  """
  def whoami(conn, _params) do
    admin = conn.assigns.current_admin

    json(conn, %{
      id: admin.id,
      full_name: admin.full_name,
      email: admin.email,
      admin_role: admin.admin_role
    })
  end

  @doc """
  Any active admin - edits only their OWN name/location, never their
  role/status (`User.admin_self_changeset/2` doesn't cast those fields
  at all). Used for the minimal onboarding step right after accepting
  an invite.
  """
  def update_me(conn, params) do
    admin = conn.assigns.current_admin

    admin
    |> User.admin_self_changeset(%{full_name: params["full_name"], location: params["location"]})
    |> Repo.update()
    |> case do
      {:ok, updated} -> json(conn, %{id: updated.id, full_name: updated.full_name, location: updated.location})
      {:error, _changeset} -> conn |> put_status(422) |> json(%{error: "Invalid data"})
    end
  end

  @doc "Support+ - search/paginate every member, regardless of onboarding status. Never includes phone numbers."
  def index(conn, params) do
    data =
      Members.list_members(%{
        search: params["search"],
        role: params["role"],
        industry: params["industry"],
        stuck: params["stuck"] == "true",
        page: parse_page(params["page"])
      })

    json(conn, %{
      members: Enum.map(data.members, &serialize_summary/1),
      page: data.page,
      per_page: data.per_page,
      total_count: data.total_count,
      total_pages: data.total_pages
    })
  end

  @doc """
  Support+ - the base account fields for anyone. Moderator+ additionally
  gets offer/need text, social profile, and investment profile - Support
  sees only what's needed for a quick lookup, per "Admin panel.md" §5.
  Phone number is never included at any tier (Tier 4 - see Members moduledoc).
  """
  def show(conn, %{"id" => id}) do
    case Members.get_member(id) do
      nil ->
        conn |> put_status(404) |> json(%{error: "Not found"})

      member ->
        full_detail? = conn.assigns.current_admin.admin_role in ["moderator", "superadmin"]
        json(conn, serialize_detail(member, full_detail?))
    end
  end

  @doc "Moderator+ - Felicity's Applications-screening workflow, digitized. Audit-logged."
  def set_verified(conn, %{"id" => id} = params) do
    if conn.assigns.current_admin.admin_role in ["moderator", "superadmin"] do
      admin = conn.assigns.current_admin

      case Members.set_verified(id, admin.id, !!params["is_verified"]) do
        {:ok, user} ->
          json(conn, %{id: user.id, is_verified: user.is_verified})

        {:error, :not_found} ->
          conn |> put_status(404) |> json(%{error: "Not found"})

        {:error, _changeset} ->
          conn |> put_status(422) |> json(%{error: "Invalid data"})
      end
    else
      conn |> put_status(403) |> json(%{error: "Forbidden - requires moderator or higher"})
    end
  end

  @doc """
  Moderator+ - the one action that ever exposes a phone number (Tier 4).
  Every call is its own dedicated audit entry, unconditionally - see
  Vokazi.Admin.Members.reveal_phone/2.
  """
  def reveal_phone(conn, %{"id" => id}) do
    if conn.assigns.current_admin.admin_role in ["moderator", "superadmin"] do
      admin = conn.assigns.current_admin

      case Members.reveal_phone(id, admin.id) do
        {:ok, phone_number} -> json(conn, %{phone_number: phone_number})
        {:error, :not_found} -> conn |> put_status(404) |> json(%{error: "Not found"})
        {:error, _changeset} -> conn |> put_status(422) |> json(%{error: "Invalid data"})
      end
    else
      conn |> put_status(403) |> json(%{error: "Forbidden - requires moderator or higher"})
    end
  end

  @doc """
  Moderator+ - marks whether staff has actually reached this member on
  their stored phone number (never the number itself - see
  Vokazi.Admin.Members.confirm_phone/3). Feeds any outreach tooling
  (e.g. a click-to-WhatsApp link) that needs to skip numbers no one has
  verified are real.
  """
  def confirm_phone(conn, %{"id" => id} = params) do
    if conn.assigns.current_admin.admin_role in ["moderator", "superadmin"] do
      admin = conn.assigns.current_admin

      case Members.confirm_phone(id, admin.id, !!params["phone_confirmed"]) do
        {:ok, profile} -> json(conn, %{id: profile.user_id, phone_confirmed: profile.phone_confirmed})
        {:error, :not_found} -> conn |> put_status(404) |> json(%{error: "Not found"})
        {:error, _changeset} -> conn |> put_status(422) |> json(%{error: "Invalid data"})
      end
    else
      conn |> put_status(403) |> json(%{error: "Forbidden - requires moderator or higher"})
    end
  end

  @doc """
  Moderator+ - records whether staff actually reached this member on
  WhatsApp specifically (distinct from confirm_phone/2 above, which
  only proves the number is real). See
  Vokazi.Admin.Members.set_whatsapp_status/3.
  """
  def set_whatsapp_status(conn, %{"id" => id} = params) do
    if conn.assigns.current_admin.admin_role in ["moderator", "superadmin"] do
      admin = conn.assigns.current_admin

      case Members.set_whatsapp_status(id, admin.id, !!params["on_whatsapp"]) do
        {:ok, profile} -> json(conn, %{id: profile.user_id, on_whatsapp: profile.on_whatsapp})
        {:error, :not_found} -> conn |> put_status(404) |> json(%{error: "Not found"})
        {:error, _changeset} -> conn |> put_status(422) |> json(%{error: "Invalid data"})
      end
    else
      conn |> put_status(403) |> json(%{error: "Forbidden - requires moderator or higher"})
    end
  end

  @doc "Moderator+ - assigns a staff-set cohort label, the Bizi Buddy System's same-batch pairing input. Audit-logged."
  def set_batch(conn, %{"id" => id} = params) do
    if conn.assigns.current_admin.admin_role in ["moderator", "superadmin"] do
      admin = conn.assigns.current_admin

      case Members.set_batch(id, admin.id, params["batch"]) do
        {:ok, user} -> json(conn, %{id: user.id, batch: user.batch})
        {:error, :not_found} -> conn |> put_status(404) |> json(%{error: "Not found"})
        {:error, _changeset} -> conn |> put_status(422) |> json(%{error: "Invalid data"})
      end
    else
      conn |> put_status(403) |> json(%{error: "Forbidden - requires moderator or higher"})
    end
  end

  defp parse_page(nil), do: 1

  defp parse_page(page) do
    case Integer.parse(to_string(page)) do
      {int, _} -> int
      :error -> 1
    end
  end

  defp serialize_summary(member), do: member

  defp serialize_detail(%{user: user, profile: profile, social: social, investment: investment}, full_detail?) do
    base = %{
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      industry: user.industry,
      company: user.company,
      location: user.location,
      onboarding_completed: user.onboarding_completed,
      is_verified: user.is_verified,
      batch: user.batch,
      phone_confirmed: !!(profile && profile.phone_confirmed),
      on_whatsapp: profile && profile.on_whatsapp,
      inserted_at: user.inserted_at
    }

    if full_detail? do
      Map.merge(base, %{
        bio: user.bio,
        offer_text: profile && profile.offer_text,
        need_text: profile && profile.need_text,
        looking_for_tags: (profile && profile.looking_for_tags) || [],
        can_help_tags: (profile && profile.can_help_tags) || [],
        contact_preference: profile && profile.contact_preference,
        social: social && %{
          github_username: social.github_username,
          linkedin_url: social.linkedin_url,
          x_url: social.x_url,
          portfolio_url: social.portfolio_url
        },
        investment: investment && %{
          business_stage: investment.business_stage,
          funding_amount_sought: investment.funding_amount_sought,
          funding_types: investment.funding_types,
          key_financials: investment.key_financials,
          check_size: investment.check_size,
          sectors_of_interest: investment.sectors_of_interest
        }
      })
    else
      base
    end
  end
end
