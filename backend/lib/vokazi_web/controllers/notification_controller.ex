defmodule VokaziWeb.NotificationController do
  use VokaziWeb, :controller

  alias Vokazi.Notifications

  @doc "Recent notifications + unread count - covers whatever arrived while this user wasn't connected."
  def index(conn, _params) do
    user_id = conn.assigns.current_user_id
    notifications = user_id |> Notifications.list_recent() |> Enum.map(&Notifications.serialize/1)
    json(conn, %{notifications: notifications, unread_count: Notifications.unread_count(user_id)})
  end

  def mark_read(conn, %{"id" => id}) do
    case Notifications.mark_read(to_int(id), conn.assigns.current_user_id) do
      {:ok, _} -> json(conn, %{status: "ok"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "Notification not found"})
    end
  end

  def mark_all_read(conn, _params) do
    :ok = Notifications.mark_all_read(conn.assigns.current_user_id)
    json(conn, %{status: "ok"})
  end

  defp to_int(id) when is_integer(id), do: id
  defp to_int(id) when is_binary(id), do: String.to_integer(id)
end
