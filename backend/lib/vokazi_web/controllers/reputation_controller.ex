defmodule VokaziWeb.ReputationController do
  use VokaziWeb, :controller

  alias Vokazi.Reputation

  @doc "This user's own stats + rank - the Profile page's stats card."
  def own_stats(conn, _params) do
    json(conn, Reputation.own_view(conn.assigns.current_user_id))
  end

  @doc "The redacted view of a matched counterpart - see Vokazi.Reputation.CounterpartProfile."
  def counterpart_profile(conn, %{"id" => match_id}) do
    case Reputation.counterpart_profile(to_int(match_id), conn.assigns.current_user_id) do
      {:ok, view} -> json(conn, view)
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "Match not found"})
      {:error, :not_a_participant} -> conn |> put_status(:forbidden) |> json(%{error: "Not a participant in this match"})
      {:error, :match_not_unlocked} -> conn |> put_status(:unprocessable_entity) |> json(%{error: "This match hasn't unlocked yet"})
    end
  end

  defp to_int(id) when is_integer(id), do: id
  defp to_int(id) when is_binary(id), do: String.to_integer(id)
end
