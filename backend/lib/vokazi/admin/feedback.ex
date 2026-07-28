defmodule Vokazi.Admin.Feedback do
  @moduledoc "Support+ read - browse member feedback submissions, newest first."

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Feedback.Submission

  @per_page 25

  @doc "`opts` (all optional): :page."
  def list_submissions(opts \\ %{}) do
    page = max(Map.get(opts, :page, 1), 1)

    base_query = from(s in Submission)
    total_count = base_query |> select([s], count(s.id)) |> Repo.one()

    rows =
      base_query
      |> order_by([s], desc: s.inserted_at)
      |> limit(^@per_page)
      |> offset(^((page - 1) * @per_page))
      |> Repo.all()

    %{
      submissions: Enum.map(rows, &to_summary/1),
      page: page,
      per_page: @per_page,
      total_count: total_count,
      total_pages: max(ceil(total_count / @per_page), 1)
    }
  end

  defp to_summary(submission) do
    user = Repo.get(User, submission.user_id)

    %{
      id: submission.id,
      user: %{id: submission.user_id, name: user && user.full_name, email: user && user.email},
      rating: submission.rating,
      message: submission.message,
      inserted_at: submission.inserted_at
    }
  end
end
