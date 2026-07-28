defmodule Vokazi.Accounts.FeedbackReminderWorker do
  @moduledoc """
  One-shot "please give us feedback" nudge for accounts that have never
  submitted any - fired by the `Oban.Plugins.Cron` entry in
  config/runtime.exs, not called directly.

  `@delay_hours` is deliberately short right now - during active
  hackathon testing we want same-day feedback while the experience is
  still fresh for the tester. Per direct instruction, bump this to
  something like 120 (5 days) once testing winds down and this becomes
  a normal post-onboarding nudge rather than an active-testing-period one.
  """
  use Oban.Worker, queue: :mailers, max_attempts: 3

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.{User, FeedbackReminderMailer}
  alias Vokazi.Feedback

  @delay_hours 4

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    eligible_users()
    |> Enum.each(&remind/1)

    :ok
  end

  defp eligible_users do
    cutoff = DateTime.add(DateTime.utc_now(), -@delay_hours, :hour)

    from(u in User,
      where: is_nil(u.feedback_reminder_sent_at),
      where: u.inserted_at <= ^cutoff,
      where: not is_nil(u.email)
    )
    |> Repo.all()
    |> Enum.reject(&Feedback.ever_submitted?(&1.id))
  end

  defp remind(user) do
    case FeedbackReminderMailer.send_reminder(user.email, user.full_name) do
      :ok ->
        user
        |> Ecto.Changeset.change(feedback_reminder_sent_at: DateTime.truncate(DateTime.utc_now(), :second))
        |> Repo.update()

      {:error, _reason} ->
        :ok
    end
  end
end
