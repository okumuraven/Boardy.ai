defmodule Vokazi.Feedback do
  @moduledoc """
  Member-facing feedback - a quick 1-5 rating plus an optional message,
  collected in-app rather than via an external form so it's tied to a
  real signed-in tester and shows up right in the admin panel. See
  "things to add.md" for the reasoning ("user feedback" is one of the
  hackathon's own judging criteria).
  """

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Feedback.Submission
  alias Vokazi.Admin.FeatureAnnouncement

  def create_submission(user_id, rating, message) do
    %Submission{}
    |> Submission.changeset(%{user_id: user_id, rating: rating, message: message})
    |> Repo.insert()
  end

  @doc """
  Whether the floating feedback widget should show for this member: yes
  if they've never submitted feedback, or if a feature announcement has
  gone out since their most recent submission (so there's something new
  worth reacting to) - otherwise it stays hidden so it doesn't nag
  someone who already told us what they think.
  """
  def should_show_widget?(user_id) do
    latest_submission_at =
      Repo.one(from(s in Submission, where: s.user_id == ^user_id, order_by: [desc: s.inserted_at], limit: 1, select: s.inserted_at))

    latest_announcement_at =
      Repo.one(from(a in FeatureAnnouncement, order_by: [desc: a.inserted_at], limit: 1, select: a.inserted_at))

    case {latest_submission_at, latest_announcement_at} do
      {nil, _} ->
        true

      {_submitted, nil} ->
        false

      {submitted, announced} ->
        # Not strictly :gt - timestamps() is second-precision, so an
        # announcement and a submission landing in the same second would
        # otherwise compare :eq and wrongly stay hidden. Treating "same
        # instant" as "show again too" errs toward an occasional harmless
        # re-prompt rather than silently never re-showing.
        NaiveDateTime.compare(announced, submitted) != :lt
    end
  end

  @doc "Has this user ever submitted feedback at all - used by the one-shot reminder worker."
  def ever_submitted?(user_id) do
    Repo.exists?(from(s in Submission, where: s.user_id == ^user_id))
  end
end
