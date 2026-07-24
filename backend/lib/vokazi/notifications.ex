defmodule Vokazi.Notifications do
  @moduledoc """
  The Notification Hub - Phases 1 & 2 of `notification_system.md`.
  Persist first (so "did this happen" is always answerable from the
  database, independent of whether anyone was connected to see it
  live), then fan out to whichever channels apply: broadcast to the
  personal `user:{id}` channel for anyone connected right now (Phase
  1), and enqueue a durable Oban job per stored Web Push subscription
  for delivery even with the tab closed (Phase 2). `Vokazi.Chat` is the
  first (and so far only) caller - see `Chat.create_message/1`.
  """

  import Ecto.Query, warn: false
  alias Vokazi.Repo
  alias Vokazi.Notifications.{Notification, PushSubscription, PushWorker}

  @doc """
  Persists a notification, broadcasts it live to `user:{user_id}`, and
  enqueues a Web Push delivery job for each of that user's stored
  subscriptions. Both deliveries are best-effort - the row itself is
  the durable record either way.
  """
  def notify(user_id, type, body, link \\ nil) do
    %Notification{}
    |> Notification.changeset(%{user_id: user_id, type: type, body: body, link: link})
    |> Repo.insert()
    |> case do
      {:ok, notification} ->
        VokaziWeb.Endpoint.broadcast!("user:#{user_id}", "new_notification", serialize(notification))
        enqueue_push_jobs(user_id, body, link)
        {:ok, notification}

      error ->
        error
    end
  end

  @doc """
  Stores a browser's Web Push subscription for `user_id`. Re-subscribing
  the same browser (same `endpoint`) updates the stored keys rather
  than creating a duplicate row.
  """
  def save_push_subscription(user_id, %{endpoint: endpoint, p256dh: p256dh, auth: auth}) do
    %PushSubscription{}
    |> PushSubscription.changeset(%{user_id: user_id, endpoint: endpoint, p256dh_key: p256dh, auth_key: auth})
    |> Repo.insert(
      on_conflict: {:replace, [:user_id, :p256dh_key, :auth_key, :updated_at]},
      conflict_target: :endpoint
    )
  end

  @doc """
  Removes a subscription - called when a browser reports permission was
  revoked. Scoped to `user_id` so one signed-in user can never delete
  another's subscription by guessing/observing an endpoint string.
  """
  def remove_push_subscription(user_id, endpoint) do
    PushSubscription
    |> where([s], s.endpoint == ^endpoint and s.user_id == ^user_id)
    |> Repo.delete_all()

    :ok
  end

  defp enqueue_push_jobs(user_id, body, link) do
    payload = %{title: "Kuzana Connect", body: body, link: link}

    user_id
    |> push_subscriptions_for()
    |> Enum.each(fn subscription ->
      %{subscription_id: subscription.id, payload: payload}
      |> PushWorker.new()
      |> Oban.insert()
    end)
  end

  defp push_subscriptions_for(user_id) do
    PushSubscription
    |> where([s], s.user_id == ^user_id)
    |> Repo.all()
  end

  @doc "Most recent notifications for a user, newest first."
  def list_recent(user_id, limit \\ 20) do
    Notification
    |> where([n], n.user_id == ^user_id)
    |> order_by([n], desc: n.inserted_at)
    |> limit(^limit)
    |> Repo.all()
  end

  def unread_count(user_id) do
    Notification
    |> where([n], n.user_id == ^user_id and n.is_read == false)
    |> Repo.aggregate(:count)
  end

  @doc "Marks one notification read - only if it actually belongs to `user_id`."
  def mark_read(notification_id, user_id) do
    case Repo.get_by(Notification, id: notification_id, user_id: user_id) do
      nil -> {:error, :not_found}
      notification -> notification |> Notification.changeset(%{is_read: true}) |> Repo.update()
    end
  end

  def mark_all_read(user_id) do
    Notification
    |> where([n], n.user_id == ^user_id and n.is_read == false)
    |> Repo.update_all(set: [is_read: true])

    :ok
  end

  def serialize(notification) do
    %{
      id: notification.id,
      type: notification.type,
      body: notification.body,
      link: notification.link,
      is_read: notification.is_read,
      inserted_at: Vokazi.DateTimeJSON.utc(notification.inserted_at)
    }
  end
end
