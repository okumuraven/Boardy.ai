defmodule VokaziWeb.Admin.BuddyPairingController do
  use VokaziWeb, :controller

  alias Vokazi.Admin.BuddyPairings

  @doc "Support+ - every buddy pairing, newest first."
  def index(conn, params) do
    data = BuddyPairings.list_pairings(%{page: parse_page(params["page"])})

    json(conn, %{
      pairings: data.pairings,
      page: data.page,
      per_page: data.per_page,
      total_count: data.total_count,
      total_pages: data.total_pages
    })
  end

  @doc "Moderator+ - pairs two members as accountability buddies. Cross-company/same-batch enforced, audit-logged."
  def create(conn, %{"user_a_id" => user_a_id, "user_b_id" => user_b_id} = params) do
    if moderator_or_above?(conn) do
      admin = conn.assigns.current_admin

      case BuddyPairings.create_pairing(admin.id, user_a_id, user_b_id, params["creation_note"]) do
        {:ok, match} ->
          json(conn, %{id: match.id, status: match.status})

        {:error, :cannot_pair_self} ->
          conn |> put_status(422) |> json(%{error: "Cannot pair a member with themselves"})

        {:error, :not_found} ->
          conn |> put_status(404) |> json(%{error: "Member not found"})

        {:error, :same_company} ->
          conn |> put_status(422) |> json(%{error: "These members are at the same company - buddies must be cross-company"})

        {:error, :batch_mismatch} ->
          conn |> put_status(422) |> json(%{error: "These members aren't in the same batch"})

        {:error, {:already_paired, existing}} ->
          conn |> put_status(422) |> json(%{error: "These members are already paired", match_id: existing.id})

        {:error, changeset} ->
          conn |> put_status(422) |> json(%{error: "Invalid data", details: format_errors(changeset)})
      end
    else
      forbidden(conn)
    end
  end

  @doc "Moderator+ - every open concern, oldest first."
  def concerns(conn, _params) do
    if moderator_or_above?(conn) do
      json(conn, %{concerns: BuddyPairings.list_open_concerns()})
    else
      forbidden(conn)
    end
  end

  @doc "Moderator+ - closes out a concern. Audit-logged."
  def resolve_concern(conn, %{"id" => id}) do
    if moderator_or_above?(conn) do
      admin = conn.assigns.current_admin

      case BuddyPairings.resolve_concern(id, admin.id) do
        {:ok, concern} -> json(conn, %{id: concern.id, status: concern.status})
        {:error, :not_found} -> conn |> put_status(404) |> json(%{error: "Not found"})
        {:error, _changeset} -> conn |> put_status(422) |> json(%{error: "Invalid data"})
      end
    else
      forbidden(conn)
    end
  end

  defp moderator_or_above?(conn), do: conn.assigns.current_admin.admin_role in ["moderator", "superadmin"]

  defp forbidden(conn), do: conn |> put_status(403) |> json(%{error: "Forbidden - requires moderator or higher"})

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
