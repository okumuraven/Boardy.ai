defmodule VokaziWeb.Admin.BiziApplicationController do
  use VokaziWeb, :controller

  alias Vokazi.Admin.BiziApplications

  @doc "Support+ - every Bizi application, newest first."
  def index(conn, params) do
    data = BiziApplications.list_applications(%{page: parse_page(params["page"])})

    json(conn, %{
      applications: data.applications,
      page: data.page,
      per_page: data.per_page,
      total_count: data.total_count,
      total_pages: data.total_pages
    })
  end

  @doc "Support+ - full detail for one application, including the eligibility checklist."
  def show(conn, %{"id" => id}) do
    case BiziApplications.get_application(id) do
      {:ok, application} -> json(conn, application)
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "Not found"})
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
