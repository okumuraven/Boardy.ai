defmodule VokaziWeb.PersonalEventController do
  use VokaziWeb, :controller

  alias Vokazi.PersonalEvents

  @doc "This user's upcoming personal agenda items."
  def index(conn, %{"user_id" => user_id}) do
    events = PersonalEvents.list_for_user(to_int(user_id)) |> Enum.map(&to_json/1)
    json(conn, %{events: events})
  end

  @doc "Adds a personal agenda item - title, date, start/end time."
  def create(conn, %{"user_id" => user_id} = params) do
    case PersonalEvents.create(to_int(user_id), Map.take(params, ["title", "date", "start_time", "end_time"])) do
      {:ok, event} -> json(conn, to_json(event))
      {:error, _changeset} -> conn |> put_status(:unprocessable_entity) |> json(%{error: "Couldn't save that - check the title, date, and times"})
    end
  end

  @doc "Removes a personal agenda item - only the owner can delete their own."
  def delete(conn, %{"id" => id, "user_id" => user_id}) do
    case PersonalEvents.delete(to_int(id), to_int(user_id)) do
      {:ok, _event} -> json(conn, %{status: "ok"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "Not found"})
    end
  end

  defp to_json(event) do
    %{
      id: event.id,
      title: event.title,
      date: Date.to_iso8601(event.date),
      start_time: Time.to_iso8601(event.start_time) |> String.slice(0, 5),
      end_time: Time.to_iso8601(event.end_time) |> String.slice(0, 5)
    }
  end

  defp to_int(id) when is_integer(id), do: id
  defp to_int(id) when is_binary(id), do: String.to_integer(id)
end
