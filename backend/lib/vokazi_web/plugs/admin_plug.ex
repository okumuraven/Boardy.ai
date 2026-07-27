defmodule VokaziWeb.AdminPlug do
  @moduledoc """
  Runs after `VokaziWeb.AuthPlug` on every `/api/admin/*` route. Loads the
  current user fresh from the database on every single request and halts
  403 unless they have an active `admin_role` right now - never trusts
  anything baked into the session token itself, so suspending someone
  takes effect on their very next request, not whenever their token
  happens to expire. See "Admin panel.md" §4.

  Establishes only the baseline "is this person staff at all" check.
  Tier-specific restrictions (e.g. Moderator-only verify, Superadmin-only
  admin management) are checked inside each controller action against
  `conn.assigns.current_admin.admin_role` - not here.
  """
  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]
  require Logger

  alias Vokazi.{Repo, Accounts.User}

  def init(opts), do: opts

  def call(conn, _opts) do
    case Repo.get(User, conn.assigns.current_user_id) do
      %User{admin_role: role, admin_status: "active"} = admin when not is_nil(role) ->
        Logger.metadata(admin_user_id: admin.id, admin_role: role)
        assign(conn, :current_admin, admin)

      _ ->
        conn |> put_status(403) |> json(%{error: "Forbidden"}) |> halt()
    end
  end
end
