defmodule Vokazi.Notifications.PushWorker do
  @moduledoc """
  Delivers one notification to one stored Web Push subscription. Using
  Oban here (rather than a bare `Task.start`, the pattern used
  elsewhere in this app for background work) gets durable retries for
  free - a failed delivery survives a node restart instead of being
  silently lost.
  """
  use Oban.Worker, queue: :push, max_attempts: 5

  require Logger
  alias Vokazi.Repo
  alias Vokazi.Notifications.PushSubscription

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"subscription_id" => subscription_id, "payload" => payload}}) do
    case Repo.get(PushSubscription, subscription_id) do
      # Already removed (e.g. by an earlier :expired result for this
      # same subscription) - nothing left to do.
      nil -> :ok
      subscription -> deliver(subscription, payload)
    end
  end

  defp deliver(subscription, payload) do
    encoded_subscription =
      Jason.encode!(%{
        "endpoint" => subscription.endpoint,
        "keys" => %{"p256dh" => subscription.p256dh_key, "auth" => subscription.auth_key}
      })

    case WebPushElixir.send_notification(encoded_subscription, Jason.encode!(payload)) do
      {:ok, _resp} ->
        :ok

      {:error, :expired} ->
        # The push service confirms this subscription no longer exists
        # (expired, browser data cleared, uninstalled) - remove it so we
        # stop retrying against a dead endpoint.
        Repo.delete(subscription)
        :ok

      {:error, reason} ->
        Logger.error(
          "Vokazi.Notifications.PushWorker: delivery failed for subscription #{subscription.id}: #{inspect(reason)}"
        )

        {:error, reason}
    end
  end
end
