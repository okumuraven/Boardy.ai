defmodule VokaziWeb.Admin.ScheduleController do
  use VokaziWeb, :controller

  alias Vokazi.Admin.Schedules

  @doc "Support+ - status-only list (§8)."
  def index(conn, params) do
    data = Schedules.list_schedules(%{status: params["status"], page: parse_page(params["page"])})

    json(conn, %{
      schedules: data.schedules,
      page: data.page,
      per_page: data.per_page,
      total_count: data.total_count,
      total_pages: data.total_pages
    })
  end

  @doc "Support+ sees status only; Moderator+ additionally gets briefing content and Calendar credential health."
  def show(conn, %{"id" => id}) do
    full_detail? = conn.assigns.current_admin.admin_role in ["moderator", "superadmin"]

    case Schedules.get_schedule(id, full_detail?) do
      nil -> conn |> put_status(404) |> json(%{error: "Not found"})
      schedule -> json(conn, schedule)
    end
  end

  defp parse_page(nil), do: 1

  defp parse_page(page) do
    case Integer.parse(to_string(page)) do
      {int, _} -> int
      :error -> 1
    end
  end
end
