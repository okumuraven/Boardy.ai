defmodule Vokazi.Admin.FeatureAnnouncements do
  @moduledoc """
  Moderator+ - lets staff tell every member about a shipped feature and
  invite them back to try it and give feedback (the same "alert users,
  ask for feedback" loop larger products run after a release). Sending
  one also makes the in-app feedback widget reappear for anyone who'd
  already hidden it - see `Vokazi.Feedback.should_show_widget?/1`.
  """

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Admin.{FeatureAnnouncement, FeatureAnnouncementWorker}

  @per_page 25

  @doc "`opts` (all optional): :page."
  def list_announcements(opts \\ %{}) do
    page = max(Map.get(opts, :page, 1), 1)

    base_query = from(a in FeatureAnnouncement)
    total_count = base_query |> select([a], count(a.id)) |> Repo.one()

    rows =
      base_query
      |> order_by([a], desc: a.inserted_at)
      |> limit(^@per_page)
      |> offset(^((page - 1) * @per_page))
      |> Repo.all()

    %{
      announcements: Enum.map(rows, &to_summary/1),
      page: page,
      per_page: @per_page,
      total_count: total_count,
      total_pages: max(ceil(total_count / @per_page), 1)
    }
  end

  defp to_summary(announcement) do
    %{id: announcement.id, title: announcement.title, message: announcement.message, inserted_at: announcement.inserted_at}
  end

  @doc "Creates the announcement row, then bulk-enqueues one email job per member with an address on file."
  def create_and_broadcast(admin_id, title, message) do
    %FeatureAnnouncement{}
    |> FeatureAnnouncement.changeset(%{title: title, message: message, sent_by_admin_id: admin_id})
    |> Repo.insert()
    |> case do
      {:ok, announcement} ->
        enqueue_broadcast(announcement)
        {:ok, announcement}

      error ->
        error
    end
  end

  defp enqueue_broadcast(announcement) do
    User
    |> where([u], not is_nil(u.email))
    |> select([u], u.id)
    |> Repo.all()
    |> Enum.map(&FeatureAnnouncementWorker.new(%{user_id: &1, announcement_id: announcement.id}))
    |> Oban.insert_all()
  end
end
