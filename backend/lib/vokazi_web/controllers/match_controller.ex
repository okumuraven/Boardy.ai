defmodule VokaziWeb.MatchController do
  use VokaziWeb, :controller
  import Ecto.Query, only: [from: 2]

  alias Vokazi.{Matchmaking, Repo}
  alias Vokazi.Accounts.{User, Profile}
  alias Vokazi.Matchmaking.Match

  @doc """
  On-demand "Find a Match" button - runs the pgvector + AI pipeline right
  now instead of waiting for the next interview/vector update.
  """
  def find_match(conn, %{"user_id" => user_id}) do
    user_id = to_int(user_id)

    case Matchmaking.find_match!(user_id) do
      {:matched, match} ->
        conn
        |> put_status(:ok)
        |> json(Map.put(match_detail(match, user_id), :status, "matched"))

      {:queued} ->
        conn
        |> put_status(:ok)
        |> json(%{status: "queued"})

      {:error, _reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Failed to process match"})
    end
  end

  @doc """
  Called once a user's wallet has submitted the `stake()` transaction.
  The tx hash is only a hint - the backend independently re-reads the
  match straight off the deployed contract before trusting anything.
  """
  def confirm_stake(conn, %{"id" => match_id, "user_id" => user_id, "tx_hash" => tx_hash}) do
    match_id = to_int(match_id)
    user_id = to_int(user_id)

    case Matchmaking.record_stake!(match_id, user_id, tx_hash) do
      {:ok, :unlocked, _match, room} ->
        json(conn, %{status: "unlocked", chat_room_id: room.id})

      {:ok, :awaiting_other_stake, _match} ->
        json(conn, %{status: "awaiting_other_stake"})

      {:error, :not_a_participant} ->
        conn |> put_status(:forbidden) |> json(%{error: "Not a participant in this match"})

      {:error, :not_awaiting_stake} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "This match isn't awaiting a stake"})

      {:error, :onchain_registration_pending} ->
        conn
        |> put_status(:accepted)
        |> json(%{error: "Match is still being registered on-chain, please retry shortly"})

      {:error, :stake_not_yet_confirmed} ->
        conn
        |> put_status(:accepted)
        |> json(%{error: "Your stake transaction hasn't confirmed on-chain yet, please retry shortly"})

      {:error, _reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "Failed to verify stake"})
    end
  end

  @doc """
  Returns this user's current match, if any - awaiting mutual consent,
  awaiting an on-chain stake, or already unlocked (so a returning user
  lands back in the right screen instead of the "no match" empty
  state). Includes the full transparent breakdown (score, reasoning,
  strengths, gaps) and the other party's basics, plus the chat room id
  once unlocked - or `null` if there's nothing active (declined/slashed
  matches don't count; the user is free to be matched again).
  """
  def pending_for_user(conn, %{"user_id" => user_id}) do
    user_id = to_int(user_id)

    match =
      Repo.one(
        from(m in Match,
          where:
            m.status in ["pending_consent", "pending", "unlocked"] and
              (m.user_a_id == ^user_id or m.user_b_id == ^user_id),
          order_by: [desc: m.inserted_at],
          limit: 1
        )
      )

    case match do
      nil ->
        json(conn, %{match: nil})

      match ->
        chat_room_id =
          if match.status == "unlocked" do
            case Repo.get_by(Vokazi.Chat.ChatRoom, match_id: match.id) do
              nil -> nil
              room -> room.id
            end
          end

        json(conn, %{match: Map.merge(match_detail(match, user_id), %{status: match.status, chat_room_id: chat_room_id})})
    end
  end

  @doc """
  Lightweight polling target for a user already waiting on a specific
  match: unlike `pending_for_user/2` (which only ever returns matches
  still awaiting consent), this looks up one match by id regardless of
  status, so the waiting side can tell *why* it stopped being "pending" -
  the other person accepted (unlocked, with a room to join) or declined.
  """
  def status(conn, %{"id" => match_id, "user_id" => user_id}) do
    user_id = to_int(user_id)
    match = Matchmaking.get_match!(to_int(match_id))

    chat_room_id =
      if match.status == "unlocked" do
        case Repo.get_by(Vokazi.Chat.ChatRoom, match_id: match.id) do
          nil -> nil
          room -> room.id
        end
      end

    json(conn, Map.merge(match_detail(match, user_id), %{status: match.status, chat_room_id: chat_room_id}))
  end

  @doc """
  Records this user's accept/decline on a pending match. Declining
  requires a short `reason` - kept so future matching can be tuned on
  real rejection signal instead of guessing.
  """
  def respond(conn, %{"id" => match_id, "user_id" => user_id, "response" => response} = params) do
    match_id = to_int(match_id)
    user_id = to_int(user_id)
    reason = Map.get(params, "reason")

    case Matchmaking.respond_to_match(match_id, user_id, response, reason) do
      {:ok, :declined, _match} ->
        json(conn, %{status: "declined"})

      {:ok, :waiting_on_other, _match} ->
        json(conn, %{status: "waiting_on_other"})

      {:ok, :awaiting_stake, _match} ->
        json(conn, %{status: "awaiting_stake"})

      {:error, :not_a_participant} ->
        conn |> put_status(:forbidden) |> json(%{error: "Not a participant in this match"})

      {:error, :not_awaiting_consent} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "This match is no longer awaiting a response"})

      {:error, :reason_required} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Please share a brief reason so we can improve future matches"})

      {:error, _reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "Failed to record response"})
    end
  end

  defp match_detail(match, user_id) do
    {my_response, other_response, other_user_id, my_staked, other_staked} =
      if match.user_a_id == user_id do
        {match.user_a_response, match.user_b_response, match.user_b_id, match.user_a_staked,
         match.user_b_staked}
      else
        {match.user_b_response, match.user_a_response, match.user_a_id, match.user_b_staked,
         match.user_a_staked}
      end

    other_user = Repo.get(User, other_user_id)
    other_profile = Repo.get_by(Profile, user_id: other_user_id)

    %{
      match_id: match.id,
      similarity_score: match.similarity_score,
      ai_score: match.ai_score,
      ai_reasoning: match.ai_reasoning,
      ai_strengths: match.ai_strengths,
      ai_gaps: match.ai_gaps,
      intro_message: match.intro_message,
      my_response: my_response,
      other_response: other_response,
      onchain_match_id: match.onchain_match_id,
      my_staked: my_staked,
      other_staked: other_staked,
      other_user: %{
        name: other_user && other_user.full_name,
        role: other_user && other_user.role,
        offer_text: other_profile && other_profile.offer_text,
        need_text: other_profile && other_profile.need_text
      }
    }
  end

  defp to_int(id) when is_integer(id), do: id
  defp to_int(id) when is_binary(id), do: String.to_integer(id)
end
