defmodule VokaziWeb.DirectoryController do
  use VokaziWeb, :controller

  alias Vokazi.{Directory, Matchmaking}

  @doc "Searchable/filterable member listing - see `Vokazi.Directory`."
  def index(conn, params) do
    result =
      Directory.list_members(%{
        user_id: conn.assigns.current_user_id,
        search: Map.get(params, "search"),
        industry: Map.get(params, "industry"),
        role: Map.get(params, "role"),
        looking_for: Map.get(params, "looking_for"),
        can_help: Map.get(params, "can_help"),
        funding_type: Map.get(params, "funding_type"),
        page: params |> Map.get("page", "1") |> to_int()
      })

    json(conn, result)
  end

  @doc """
  User-initiated connect from a Directory card - runs the same AI
  reasoning as an automatic match, then behaves exactly like the
  suggested-match queue from here on (mutual consent, unlock, chat).
  """
  def connect(conn, %{"target_user_id" => target_user_id}) do
    case Matchmaking.request_match(conn.assigns.current_user_id, to_int(target_user_id)) do
      {:ok, :requested, match} ->
        json(conn, %{status: "requested", match_id: match.id})

      {:ok, :existing, match} ->
        json(conn, %{status: "already_exists", match_id: match.id, match_status: match.status})

      {:error, :cannot_match_self} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "You can't connect with yourself"})

      {:error, :profile_incomplete} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "This member hasn't finished their voice interview yet"})

      {:error, :missing_api_key} ->
        conn |> put_status(:service_unavailable) |> json(%{error: "Matching is temporarily unavailable"})

      {:error, _reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "Couldn't process that connection request"})
    end
  end

  defp to_int(id) when is_integer(id), do: id
  defp to_int(id) when is_binary(id), do: String.to_integer(id)
end
