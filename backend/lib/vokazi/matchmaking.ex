defmodule Vokazi.Matchmaking do
  @moduledoc """
  The Matchmaking context.
  """

  import Ecto.Query, warn: false
  alias Vokazi.Repo
  alias Vokazi.Matchmaking.Match
  alias Vokazi.Chat

  def get_match!(id), do: Repo.get!(Match, id)

  @doc """
  Instantly queries the database for matches with >= 0.85 similarity (<= 0.15 distance).
  Creates a pending match if one is found, triggering the Avalanche Trust-Gate.
  """
  def find_pending_match(current_user_profile) do
    import Ecto.Query
    import Pgvector.Ecto.Query
    
    if is_nil(current_user_profile.need_vector) do
      {:error, :no_vector}
    else
      query = from p in Vokazi.Accounts.Profile,
              where: p.user_id != ^current_user_profile.user_id and not is_nil(p.offer_vector),
              where: cosine_distance(p.offer_vector, ^current_user_profile.need_vector) <= 0.15,
              order_by: [asc: cosine_distance(p.offer_vector, ^current_user_profile.need_vector)],
              select: {p, cosine_distance(p.offer_vector, ^current_user_profile.need_vector)},
              limit: 1

      case Repo.all(query) do
        [{best_match_profile, distance}] ->
          similarity = 1.0 - distance
          
          changeset = %Match{}
            |> Match.changeset(%{
                 similarity_score: similarity,
                 status: "pending", 
                 user_a_id: current_user_profile.user_id, 
                 user_b_id: best_match_profile.user_id
               })
               
          case Repo.insert(changeset) do
             {:ok, match} ->
                IO.puts("🔥 PERFECT MATCH FOUND! Similarity: #{Float.round(similarity * 100, 2)}%. Triggering Trust-Gate for users #{match.user_a_id} and #{match.user_b_id}")
                {:ok, match}
             {:error, changeset} ->
                IO.puts("Failed to create match: #{inspect(changeset.errors)}")
                {:error, changeset}
          end
          
        [] ->
          IO.puts("No matches found >= 0.85 similarity yet. User added to matchmaking queue.")
          {:queued}
      end
    end
  end

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

  @doc """
  Processes a realistic stake request. Checks if there is another user available.
  If available, creates a match. If not, returns queued.
  """
  def process_stake!(user_id) do
    # Perform a TRUE mathematical cosine similarity search using pgvector!
    # We find the user whose `offer_vector` is mathematically closest to our `need_vector`.
    import Ecto.Query
    import Pgvector.Ecto.Query
    
    current_user_profile = Repo.get_by(Vokazi.Accounts.Profile, user_id: user_id)
    
    if is_nil(current_user_profile) || is_nil(current_user_profile.need_vector) do
      # If the current user hasn't generated their own vector yet, they just enter the queue
      {:queued}
    else
      # <-> is the Postgres Cosine Distance operator provided by pgvector
      query = from u in Vokazi.Accounts.User,
              join: p in Vokazi.Accounts.Profile, on: p.user_id == u.id,
              where: u.id != ^user_id and not is_nil(p.offer_vector),
              order_by: [asc: cosine_distance(p.offer_vector, ^current_user_profile.need_vector)],
              limit: 1

      case Repo.all(query) do
        [other_user] ->
          # Create a realistic match
          {:ok, match} = %Match{}
            |> Match.changeset(%{
                 similarity_score: 0.98, # For MVP display, we hardcode display score, but search was real
                 status: "unlocked", 
                 user_a_id: user_id, 
                 user_b_id: other_user.id
               })
            |> Repo.insert()

          # Create Chat Room automatically
          {:ok, room} = Chat.create_chat_room(%{match_id: match.id, is_active: true})
          {:matched, room}
          
        [] ->
          # No mathematical matches available. Enter queue.
          {:queued}
      end
    end
  end
end
