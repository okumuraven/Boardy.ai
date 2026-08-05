defmodule VokaziWeb.CallHistoryController do
  use VokaziWeb, :controller

  alias Vokazi.Calling

  @doc "Every call this user was either side of, most recent first - see `Vokazi.Calling.list_history/1`."
  def index(conn, _params) do
    user_id = conn.assigns.current_user_id
    calls = user_id |> Calling.list_history() |> Enum.map(&serialize(&1, user_id))
    json(conn, %{calls: calls})
  end

  defp serialize(call_log, user_id) do
    is_caller = call_log.caller_id == user_id
    other = if is_caller, do: call_log.callee, else: call_log.caller

    %{
      id: call_log.id,
      match_id: call_log.match_id,
      other_user_id: other && other.id,
      other_user_name: other && other.full_name,
      other_user_avatar_url: other && other.avatar_path && "/api/profiles/#{other.id}/avatar",
      direction: if(is_caller, do: "outgoing", else: "incoming"),
      status: call_log.status,
      duration_seconds: call_log.duration_seconds,
      inserted_at: Vokazi.DateTimeJSON.utc(call_log.inserted_at)
    }
  end
end
