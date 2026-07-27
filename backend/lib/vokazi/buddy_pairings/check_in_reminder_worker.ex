defmodule Vokazi.BuddyPairings.CheckInReminderWorker do
  @moduledoc """
  Weekly nudge for every active Bizi Buddy pairing (kuzana_playbook.md
  §6: "weekly check-ins, honest feedback, acting as a trusted sounding
  board") - fired by the `Oban.Plugins.Cron` entry in config/runtime.exs,
  not called directly.
  """
  use Oban.Worker, queue: :buddy_checkins, max_attempts: 3

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Matchmaking.Match
  alias Vokazi.Notifications

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    from(m in Match, where: m.pairing_kind == "buddy" and m.status == "unlocked")
    |> Repo.all()
    |> Enum.each(&remind_pair/1)

    :ok
  end

  defp remind_pair(match) do
    user_a = Repo.get(User, match.user_a_id)
    user_b = Repo.get(User, match.user_b_id)

    if user_a, do: remind(user_a, user_b, match)
    if user_b, do: remind(user_b, user_a, match)
  end

  defp remind(user, buddy, match) do
    Notifications.notify(
      user.id,
      "buddy_checkin",
      "Time for your weekly check-in with #{buddy && buddy.full_name || "your buddy"}.",
      "/matches/#{match.id}"
    )
  end
end
