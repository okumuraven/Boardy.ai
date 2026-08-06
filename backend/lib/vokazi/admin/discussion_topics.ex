defmodule Vokazi.Admin.DiscussionTopics do
  @moduledoc """
  Admin-authored, member-readable discussion prompts - the lightweight
  alternative to an open member forum. No replies, no reactions, no
  broadcast email: staff post a topic, members browse the feed at their
  own pace. Deliberately narrower than `Vokazi.Admin.FeatureAnnouncements`
  (which fires an email to every member) - a new topic shouldn't feel
  like a push notification for something meant to be browsed async.
  """

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Admin.DiscussionTopic

  @per_page 25

  @doc "`opts` (all optional): :page. Newest first, either side of the admin boundary reads the same feed."
  def list_topics(opts \\ %{}) do
    page = max(Map.get(opts, :page, 1), 1)

    base_query = from(t in DiscussionTopic, left_join: u in User, on: u.id == t.posted_by_admin_id)
    total_count = base_query |> select([t, u], count(t.id)) |> Repo.one()

    rows =
      base_query
      |> order_by([t, u], desc: t.inserted_at)
      |> limit(^@per_page)
      |> offset(^((page - 1) * @per_page))
      |> select([t, u], %{topic: t, admin_name: u.full_name})
      |> Repo.all()

    %{
      topics: Enum.map(rows, &to_summary/1),
      page: page,
      per_page: @per_page,
      total_count: total_count,
      total_pages: max(ceil(total_count / @per_page), 1)
    }
  end

  defp to_summary(%{topic: t, admin_name: admin_name}) do
    %{id: t.id, title: t.title, body: t.body, posted_by: admin_name, inserted_at: t.inserted_at}
  end

  @doc "Creates the topic row - no side effects (no email, no notification fan-out) by design."
  def create_topic(admin_id, title, body) do
    %DiscussionTopic{}
    |> DiscussionTopic.changeset(%{title: title, body: body, posted_by_admin_id: admin_id})
    |> Repo.insert()
  end
end
