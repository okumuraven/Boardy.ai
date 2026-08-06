defmodule VokaziWeb.Admin.DiscussionTopicController do
  use VokaziWeb, :controller

  alias Vokazi.Admin.DiscussionTopics

  @doc "Support+ read - every past topic, newest first."
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

  @doc "Moderator+ - posts a new discussion topic to the member-facing feed."
  def create(conn, %{"title" => title, "body" => body}) do
    if moderator_or_above?(conn) do
      admin = conn.assigns.current_admin

      case DiscussionTopics.create_topic(admin.id, title, body) do
        {:ok, topic} -> json(conn, %{id: topic.id})
        {:error, changeset} -> conn |> put_status(:unprocessable_entity) |> json(%{error: VokaziWeb.ChangesetErrors.format(changeset)})
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
end
