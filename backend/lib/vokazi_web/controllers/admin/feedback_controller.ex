defmodule VokaziWeb.Admin.FeedbackController do
  use VokaziWeb, :controller

  alias Vokazi.Admin.Feedback

  @doc "Support+ - every feedback submission, newest first."
  def index(conn, params) do
    data = Feedback.list_submissions(%{page: parse_page(params["page"])})

    json(conn, %{
      submissions: data.submissions,
      page: data.page,
      per_page: data.per_page,
      total_count: data.total_count,
      total_pages: data.total_pages
    })
  end

  defp parse_page(nil), do: 1

  defp parse_page(page) do
    case Integer.parse(to_string(page)) do
      {int, _} -> int
      :error -> 1
    end
  end
end
