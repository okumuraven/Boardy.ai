defmodule Boardy.Matchmaking do
  @moduledoc """
  The Matchmaking context.
  """

  import Ecto.Query, warn: false
  alias Boardy.Repo
  alias Boardy.Matchmaking.Match
  alias Boardy.Chat

  def get_match!(id), do: Repo.get!(Match, id)

  @doc """
  Mocks the payment validation. When a payment is successful,
  this updates the match status and provisions a chat room.
  """
  def confirm_mock_payment!(match_id, user_id) do
    # For MVP, we assume user_id is staking.
    # We will fetch or insert a mock match to avoid Ecto.NoResultsError if DB is empty
    
    match = 
      case Repo.get(Match, match_id) do
        nil -> 
          # Create a mock match on the fly for testing
          {:ok, new_match} = %Match{}
            |> Match.changeset(%{
                 similarity_score: 0.95, 
                 status: "pending", 
                 user_a_id: user_id, 
                 user_b_id: user_id # Mocking with self for now
               })
            |> Repo.insert()
          new_match
        existing_match -> 
          existing_match
      end
    
    # Use Repo.transaction to ensure consistency
    Repo.transaction(fn ->
      match
      |> Match.changeset(%{status: "unlocked"})
      |> Repo.update!()

      # Provision a chat room if it doesn't exist
      case Repo.get_by(Chat.ChatRoom, match_id: match.id) do
        nil ->
          {:ok, room} = Chat.create_chat_room(%{match_id: match.id, is_active: true})
          room
        room ->
          room
      end
    end)
  end
end
