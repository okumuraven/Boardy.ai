defmodule Vokazi.Admin.BiziApplications.ReminderWorker do
  @moduledoc """
  Automated nudge for applications stuck in "documents_requested" past
  @stale_after_days (bizi_verification_build_plan.md Phase E) - fired by
  the `Oban.Plugins.Cron` entry in config/runtime.exs, not called
  directly. Sent as a real message in the Phase C verification chat
  (not just an in-app notification), so it's part of the same thread
  the applicant already checks - posted as `Vokazi.SystemUser`, never
  misattributed to whichever admin happened to request the documents.
  The cooldown against the most recent event stops this from firing
  every single day once an application goes stale.
  """
  use Oban.Worker, queue: :bizi_reminders, max_attempts: 3

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Bizi.{Application, StageEvent}
  alias Vokazi.Admin.BiziApplications
  alias Vokazi.Chat
  alias Vokazi.SystemUser

  @stale_after_days 5
  @reminder_cooldown_days 3

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    Application
    |> where([a], a.status == "documents_requested")
    |> Repo.all()
    |> Enum.filter(&due_for_reminder?/1)
    |> Enum.each(&send_reminder/1)

    :ok
  end

  defp due_for_reminder?(application) do
    last_event =
      StageEvent
      |> where([e], e.bizi_application_id == ^application.id)
      |> order_by([e], desc: e.inserted_at)
      |> limit(1)
      |> Repo.one()

    reference_time = if last_event, do: last_event.inserted_at, else: application.updated_at

    reminded_recently? =
      last_event && last_event.kind == "reminder" && days_since(last_event.inserted_at) < @reminder_cooldown_days

    not reminded_recently? and days_since(reference_time) >= @stale_after_days
  end

  defp send_reminder(application) do
    {:ok, room} = BiziApplications.open_verification_chat(application.id)

    Chat.create_message(%{
      content:
        "Hi #{application.preferred_name} - just following up. We're still waiting on the documents for your Bizi verification. Let us know if you have any questions!",
      sender_id: SystemUser.id(),
      chat_room_id: room.id
    })

    %StageEvent{}
    |> StageEvent.changeset(%{
      bizi_application_id: application.id,
      kind: "reminder",
      performed_by_admin_id: nil,
      comment: "Automated reminder sent - documents still outstanding."
    })
    |> Repo.insert()
  end

  defp days_since(%NaiveDateTime{} = naive), do: days_since(DateTime.from_naive!(naive, "Etc/UTC"))
  defp days_since(%DateTime{} = dt), do: DateTime.diff(DateTime.utc_now(), dt, :day)
end
