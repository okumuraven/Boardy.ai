defmodule VokaziWeb.Admin.AdminAccountController do
  use VokaziWeb, :controller

  alias Vokazi.Admin.Admins

  @doc "Superadmin only - every current admin plus any not-yet-signed-in pending invites."
  def index(conn, _params) do
    if superadmin?(conn) do
      json(conn, Admins.list_admins())
    else
      forbidden(conn)
    end
  end

  @doc """
  Superadmin only - grants access to `email` before that person has ever
  signed in, and emails them the accept link. Consumed only through
  that link, never as a side effect of a regular sign-in.
  """
  def invite(conn, %{"email" => email, "admin_role" => role}) do
    if superadmin?(conn) do
      case Admins.invite(current_admin(conn).id, email, role) do
        {:ok, invite, link, email_status} ->
          json(conn, %{id: invite.id, email: invite.email, admin_role: invite.admin_role, link: link, email_status: email_status})

        {:error, :already_an_admin} ->
          conn |> put_status(422) |> json(%{error: "This email already has an admin account - use role change instead"})

        {:error, changeset} ->
          conn |> put_status(422) |> json(%{error: "Invalid data", details: format_errors(changeset)})
      end
    else
      forbidden(conn)
    end
  end

  @doc "Superadmin only - promotes/demotes an existing admin's tier. Cannot target yourself."
  def set_role(conn, %{"id" => id, "admin_role" => role}) do
    if superadmin?(conn) do
      case Admins.set_role(current_admin(conn).id, id, role) do
        {:ok, user} -> json(conn, %{id: user.id, admin_role: user.admin_role})
        {:error, reason} -> error_response(conn, reason)
      end
    else
      forbidden(conn)
    end
  end

  @doc "Superadmin only - locks the target out on their very next request. Cannot target yourself."
  def suspend(conn, %{"id" => id}) do
    if superadmin?(conn) do
      case Admins.suspend(current_admin(conn).id, id) do
        {:ok, user} -> json(conn, %{id: user.id, admin_status: user.admin_status})
        {:error, reason} -> error_response(conn, reason)
      end
    else
      forbidden(conn)
    end
  end

  @doc "Superadmin only - restores a suspended admin, tier untouched."
  def reactivate(conn, %{"id" => id}) do
    if superadmin?(conn) do
      case Admins.reactivate(current_admin(conn).id, id) do
        {:ok, user} -> json(conn, %{id: user.id, admin_status: user.admin_status})
        {:error, reason} -> error_response(conn, reason)
      end
    else
      forbidden(conn)
    end
  end

  @doc "Superadmin only - cancels a pending invite before it's ever consumed at sign-in."
  def revoke_invite(conn, %{"id" => id}) do
    if superadmin?(conn) do
      case Admins.revoke_invite(current_admin(conn).id, id) do
        {:ok, invite} -> json(conn, %{id: invite.id, email: invite.email})
        {:error, reason} -> error_response(conn, reason)
      end
    else
      forbidden(conn)
    end
  end

  @doc "Superadmin only - the full mutation trail (reads are never logged here, see Vokazi.Admin.Admins moduledoc)."
  def audit_logs(conn, params) do
    if superadmin?(conn) do
      data =
        Admins.list_audit_logs(%{
          action: params["action"],
          target_type: params["target_type"],
          page: parse_page(params["page"])
        })

      json(conn, data)
    else
      forbidden(conn)
    end
  end

  defp superadmin?(conn), do: current_admin(conn).admin_role == "superadmin"
  defp current_admin(conn), do: conn.assigns.current_admin

  defp forbidden(conn), do: conn |> put_status(403) |> json(%{error: "Forbidden - requires superadmin"})

  defp error_response(conn, :cannot_act_on_self),
    do: conn |> put_status(422) |> json(%{error: "Cannot perform this action on your own account"})

  defp error_response(conn, :not_found), do: conn |> put_status(404) |> json(%{error: "Not found"})
  defp error_response(conn, :not_an_admin), do: conn |> put_status(422) |> json(%{error: "This user is not an admin"})

  defp error_response(conn, %Ecto.Changeset{} = changeset),
    do: conn |> put_status(422) |> json(%{error: "Invalid data", details: format_errors(changeset)})

  defp parse_page(nil), do: 1

  defp parse_page(page) do
    case Integer.parse(to_string(page)) do
      {int, _} -> int
      :error -> 1
    end
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
