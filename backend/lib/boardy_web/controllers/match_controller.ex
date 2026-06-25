defmodule BoardyWeb.MatchController do
  use BoardyWeb, :controller

  alias Boardy.Matchmaking

  def confirm_payment(conn, %{"id" => id, "user_id" => user_id}) do
    # Here we simulate the AvaCloud webhook or frontend verification
    # We pass the user_id (the one who clicked "Stake") and the match_id
    case Matchmaking.confirm_mock_payment!(id, user_id) do
      {:ok, chat_room} ->
        conn
        |> put_status(:ok)
        |> json(%{
          success: true,
          message: "Match unlocked!",
          chat_room_id: chat_room.id
        })
        
      {:error, _reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Failed to unlock match"})
    end
  end
end
