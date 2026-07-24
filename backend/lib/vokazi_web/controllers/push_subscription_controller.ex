defmodule VokaziWeb.PushSubscriptionController do
  use VokaziWeb, :controller

  alias Vokazi.Notifications

  @doc "Stores (or updates) this browser's Web Push subscription."
  def create(conn, %{"endpoint" => endpoint, "keys" => %{"p256dh" => p256dh, "auth" => auth}}) do
    case Notifications.save_push_subscription(conn.assigns.current_user_id, %{endpoint: endpoint, p256dh: p256dh, auth: auth}) do
      {:ok, _subscription} -> json(conn, %{status: "ok"})
      {:error, _changeset} -> conn |> put_status(:unprocessable_entity) |> json(%{error: "Couldn't save subscription"})
    end
  end

  @doc "Removes a subscription - called when a browser reports permission was revoked."
  def delete(conn, %{"endpoint" => endpoint}) do
    :ok = Notifications.remove_push_subscription(conn.assigns.current_user_id, endpoint)
    json(conn, %{status: "ok"})
  end
end
