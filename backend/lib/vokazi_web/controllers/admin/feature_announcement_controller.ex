defmodule VokaziWeb.Admin.FeatureAnnouncementController do
  use VokaziWeb, :controller

  alias Vokazi.Admin.FeatureAnnouncements

  @doc "Support+ read - every past announcement, newest first."
  def index(conn, params) do
    data = FeatureAnnouncements.list_announcements(%{page: parse_page(params["page"])})

    json(conn, %{
      announcements: data.announcements,
      page: data.page,
      per_page: data.per_page,
      total_count: data.total_count,
      total_pages: data.total_pages
    })
  end

  @doc "Moderator+ - broadcasts a new feature announcement to every member with an email on file."
  def create(conn, %{"title" => title, "message" => message}) do
    if moderator_or_above?(conn) do
      admin = conn.assigns.current_admin

      case FeatureAnnouncements.create_and_broadcast(admin.id, title, message) do
        {:ok, announcement} -> json(conn, %{id: announcement.id})
        {:error, changeset} -> conn |> put_status(:unprocessable_entity) |> json(%{error: format_errors(changeset)})
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
