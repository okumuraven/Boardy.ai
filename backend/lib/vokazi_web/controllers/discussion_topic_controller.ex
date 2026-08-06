defmodule VokaziWeb.DiscussionTopicController do
  use VokaziWeb, :controller

  alias Vokazi.Admin.DiscussionTopics

  @doc "Read-only feed for any signed-in member - newest first, no per-user state to track."
  def index(conn, params) do
    data = DiscussionTopics.list_topics(%{page: parse_page(params["page"])})

    json(conn, %{
      topics: data.topics,
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
