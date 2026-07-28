defmodule Vokazi.Accounts.InterviewReminderWorker do
  @moduledoc """
  Daily sweep for members "stuck" in onboarding (same definition
  `Vokazi.Admin.Members.list_members/1`'s `:stuck` filter and
  `Vokazi.Admin.Stats.onboarding_funnel/0` already use: no completed
  onboarding, or a profile missing `offer_text`/`need_text`) who signed
  up more than 48 hours ago and have never been reminded - sends at
  most one reminder per account (see `InterviewReminderMailer`
  moduledoc for why this is one-shot, not recurring). Fired by the
  `Oban.Plugins.Cron` entry in config/runtime.exs, not called directly.
  """
  use Oban.Worker, queue: :mailers, max_attempts: 3

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.{User, Profile, InterviewReminderMailer}

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    stuck_unreminded_users()
    |> Enum.each(&remind/1)

    :ok
  end

  defp stuck_unreminded_users do
    cutoff = DateTime.add(DateTime.utc_now(), -48, :hour)

    from(u in User,
      left_join: p in Profile,
      on: p.user_id == u.id,
      where: is_nil(u.interview_reminder_sent_at),
      where: u.inserted_at <= ^cutoff,
      where: u.onboarding_completed == false or is_nil(p.offer_text) or is_nil(p.need_text),
      where: not is_nil(u.email)
    )
    |> Repo.all()
  end

  defp remind(user) do
    case InterviewReminderMailer.send_reminder(user.email, user.full_name) do
      :ok ->
        user
        |> Ecto.Changeset.change(interview_reminder_sent_at: DateTime.truncate(DateTime.utc_now(), :second))
        |> Repo.update()

      {:error, _reason} ->
        :ok
    end
  end
end
