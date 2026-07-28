defmodule Vokazi.Notifications.EmailWorker do
  @moduledoc """
  Delivers the email mirror of an in-app notification asynchronously -
  enqueued from `Vokazi.Notifications.notify/4` for its `@email_types`
  allowlist. Runs as an Oban job (not inline) so a slow/failed Resend
  call never blocks the actual notify path, and gets automatic retries.
  """
  use Oban.Worker, queue: :mailers, max_attempts: 3

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Notifications.NotificationMailer

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"user_id" => user_id, "type" => type, "body" => body}}) do
    case Repo.get(User, user_id) do
      %{email: email} = user when is_binary(email) -> NotificationMailer.send_event(email, user.full_name, type, body)
      _ -> :ok
    end
  end
end
