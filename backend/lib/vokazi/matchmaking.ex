defmodule Vokazi.Matchmaking do
  @moduledoc """
  The Matchmaking context.

  Matching runs as a three-stage pipeline:
    1. pgvector retrieval - cheap, fast, narrows the whole user base down to a
       handful of candidates using bidirectional need<->offer similarity plus
       a recency tie-break, and excludes anyone already matched with before.
    2. AI verification - for those few candidates, Gemini judges whether the
       fit is genuinely complementary (not just lexically similar), scores
       it, and writes a transparent strengths/gaps breakdown plus a
       ready-to-send introduction message onto the Match row.
    3. Mutual consent - both people see that breakdown and independently
       decide whether to proceed (`respond_to_match/4`). The match unlocks
       and its chat room is created the moment *both* sides accept - no
       further gate after that (an on-chain staking step used to sit here;
       removed per direct Kuzana feedback that it was the single biggest
       source of friction in the whole funnel - see `boardy_comparison.md`).

  `request_match/2` is the Directory's alternate entry point: a member
  browsing `Vokazi.Directory` picks someone themselves instead of waiting
  for the pipeline above to suggest them. It still runs the same Gemini
  judgment call for an honest reasoning/strengths/gaps breakdown, but
  deliberately skips the `@ai_score_floor` gate - the requester already
  chose this person, so the point is transparency, not filtering.
  """

  import Ecto.Query, warn: false
  import Pgvector.Ecto.Query
  require Logger

  alias Vokazi.Repo
  alias Vokazi.Accounts.{Profile, User}
  alias Vokazi.Matchmaking.Match
  alias Vokazi.Chat
  alias Vokazi.Notifications

  # Candidates below this bidirectional similarity aren't worth an AI call.
  @similarity_floor 0.75
  # How many top candidates (by similarity) get sent to AI validation.
  @candidate_pool_size 20
  @candidates_to_validate 5
  # AI's own confidence bar, on top of passing is_valid.
  @ai_score_floor 70

  def get_match!(id), do: Repo.get!(Match, id)

  @doc "Is this match unlocked, and is this user actually a participant - see `Vokazi.Matchmaking.UnlockGate`."
  defdelegate unlocked_match_for(match_id, user_id), to: Vokazi.Matchmaking.UnlockGate

  @doc """
  All of a user's matches (excluding dead-end declined/slashed ones),
  most recently updated first - the source for the Matches list UI. A
  user can be in several matches simultaneously (an active unlocked
  chat and a still-pending mutual review can both coexist), so this
  returns all of them rather than the single "next thing to resolve"
  match `pending_for_user`-style lookups return.
  """
  def list_for_user(user_id) do
    Match
    |> where([m], (m.user_a_id == ^user_id or m.user_b_id == ^user_id) and m.status not in ["declined", "slashed"])
    |> order_by([m], desc: m.updated_at)
    |> Repo.all()
    |> Enum.map(&match_summary(&1, user_id))
  end

  defp match_summary(match, user_id) do
    {other_user_id, my_response, other_response} =
      if match.user_a_id == user_id do
        {match.user_b_id, match.user_a_response, match.user_b_response}
      else
        {match.user_a_id, match.user_b_response, match.user_a_response}
      end

    other_user = Repo.get(User, other_user_id)
    chat_room = if match.status == "unlocked", do: Repo.get_by(Chat.ChatRoom, match_id: match.id)
    last_message = chat_room && List.last(Chat.list_recent_messages(chat_room.id, 1))

    %{
      match_id: match.id,
      status: match.status,
      ai_score: match.ai_score,
      pairing_kind: match.pairing_kind,
      my_response: my_response,
      other_response: other_response,
      chat_room_id: chat_room && chat_room.id,
      other_user: %{name: other_user && other_user.full_name},
      last_message: last_message && %{body: last_message.content, inserted_at: Vokazi.DateTimeJSON.utc(last_message.inserted_at)},
      updated_at: Vokazi.DateTimeJSON.utc(match.updated_at)
    }
  end

  @doc """
  Runs the full pipeline for a user whose vectors were just (re)generated.
  Creates a "pending_consent" match - awaiting both people's review of the
  AI's score/reasoning/breakdown - if a candidate clears both the
  similarity floor and AI validation. Never unlocks anything by itself.
  """
  def find_pending_match(current_user_profile) do
    with_best_candidate(current_user_profile, fn candidate, ai_result ->
      create_match(current_user_profile, candidate, ai_result)
    end)
  end

  @doc """
  Runs the same pipeline on-demand (e.g. a "find me a match" button),
  returning the same "pending_consent" match for the frontend to show.
  """
  def find_match!(user_id) do
    case Repo.get_by(Profile, user_id: user_id) do
      nil ->
        {:queued}

      current_user_profile ->
        with_best_candidate(current_user_profile, fn candidate, ai_result ->
          case create_match(current_user_profile, candidate, ai_result) do
            {:ok, match} -> {:matched, match}
            {:error, reason} -> {:error, reason}
          end
        end)
    end
  end

  @doc """
  Records one side's decision on a pending match.

  - `response` is `"accepted"` or `"declined"`.
  - A decline immediately and permanently closes the match (status
    "declined") and requires a short `reason` - the other person is
    freed up to be matched with someone else, and the reason is kept so
    future matching can be tuned on real rejection signal.
  - An accept unlocks the match and creates its chat room immediately
    once *both* sides have accepted; until then it just records the
    response and waits.
  """
  def respond_to_match(match_id, user_id, response, reason \\ nil)
      when response in ["accepted", "declined"] do
    match = Repo.get!(Match, match_id)

    cond do
      user_id not in [match.user_a_id, match.user_b_id] ->
        {:error, :not_a_participant}

      match.status != "pending_consent" ->
        {:error, :not_awaiting_consent}

      response == "declined" and blank?(reason) ->
        {:error, :reason_required}

      response == "declined" ->
        match
        |> Match.changeset(%{
          response_field(match, user_id) => "declined",
          status: "declined",
          decline_reason: reason
        })
        |> Repo.update()
        |> case do
          {:ok, updated} -> {:ok, :declined, updated}
          {:error, reason} -> {:error, reason}
        end

      true ->
        accept_match(match, user_id)
    end
  end

  defp blank?(nil), do: true
  defp blank?(str) when is_binary(str), do: String.trim(str) == ""
  defp blank?(_), do: false

  # Mutual consent unlocks the match immediately - no on-chain stake step
  # (removed per direct Kuzana feedback: it was the single biggest source
  # of friction in the whole funnel, see boardy_comparison.md).
  defp accept_match(match, user_id) do
    field = response_field(match, user_id)
    other_field = if field == :user_a_response, do: :user_b_response, else: :user_a_response
    other_already_accepted = Map.get(match, other_field) == "accepted"

    if other_already_accepted do
      Repo.transaction(fn ->
        updated = match |> Match.changeset(%{field => "accepted", status: "unlocked"}) |> Repo.update!()

        room =
          case Repo.get_by(Chat.ChatRoom, match_id: updated.id) do
            nil -> {:ok, room} = Chat.create_chat_room(%{match_id: updated.id, is_active: true}); room
            room -> room
          end

        {updated, room}
      end)
      |> case do
        {:ok, {updated, room}} ->
          # Best-effort, fired after the transaction commits - same
          # pattern Chat.notify_recipient_if_absent/2 already uses,
          # never part of the DB transaction's own atomicity.
          notify_match_unlocked(updated)
          {:ok, :unlocked, updated, room}

        {:error, reason} ->
          {:error, reason}
      end
    else
      match
      |> Match.changeset(%{field => "accepted"})
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, :waiting_on_other, updated}
        {:error, reason} -> {:error, reason}
      end
    end
  end

  defp response_field(match, user_id) do
    if match.user_a_id == user_id, do: :user_a_response, else: :user_b_response
  end

  @doc """
  User-initiated connect from the Directory. Returns `{:ok, :existing, match}`
  if this pair already has a match (in either order - the requester doesn't
  get a second attempt just because they weren't the one who created it
  first), `{:ok, :requested, match}` on a freshly created one, or
  `{:error, :cannot_match_self}` / `{:error, :profile_incomplete}` /
  whatever `Vokazi.AI.validate_match/2` itself can fail with.
  """
  def request_match(requester_id, target_id) do
    cond do
      requester_id == target_id ->
        {:error, :cannot_match_self}

      match = find_existing_match(requester_id, target_id) ->
        {:ok, :existing, match}

      true ->
        with {:ok, requester_profile} <- fetch_complete_profile(requester_id),
             {:ok, target_profile} <- fetch_complete_profile(target_id) do
          requester_user = Repo.get(User, requester_id)
          target_user = Repo.get(User, target_id)

          user_a = %{
            name: requester_user && requester_user.full_name,
            offer_text: requester_profile.offer_text,
            need_text: requester_profile.need_text,
            role: requester_user && requester_user.role
          }

          user_b = %{
            name: target_user && target_user.full_name,
            offer_text: target_profile.offer_text,
            need_text: target_profile.need_text,
            role: target_user && target_user.role
          }

          case Vokazi.AI.validate_match(user_a, user_b) do
            {:ok, ai_result} -> create_requested_match(requester_id, target_id, ai_result)
            {:error, reason} -> {:error, reason}
          end
        end
    end
  end

  defp find_existing_match(id_a, id_b) do
    Repo.one(
      from(m in Match,
        where:
          (m.user_a_id == ^id_a and m.user_b_id == ^id_b) or
            (m.user_a_id == ^id_b and m.user_b_id == ^id_a),
        limit: 1
      )
    )
  end

  defp fetch_complete_profile(user_id) do
    case Repo.get_by(Profile, user_id: user_id) do
      nil -> {:error, :profile_incomplete}
      %Profile{offer_text: nil} -> {:error, :profile_incomplete}
      %Profile{need_text: nil} -> {:error, :profile_incomplete}
      profile -> {:ok, profile}
    end
  end

  defp create_requested_match(requester_id, target_id, ai_result) do
    %Match{}
    |> Match.changeset(%{
      # Not a pgvector-discovered pair, so there's no similarity_score
      # worth recording - 0.0 is a placeholder, not a ranking. ai_score
      # below is the one the frontend actually shows.
      similarity_score: 0.0,
      status: "pending_consent",
      user_a_id: requester_id,
      user_b_id: target_id,
      user_a_response: "accepted",
      ai_score: ai_result.score,
      ai_reasoning: ai_result.reasoning,
      ai_strengths: ai_result.strengths,
      ai_gaps: ai_result.gaps,
      intro_message: ai_result.intro_message,
      pitch_a: ai_result.pitch_a,
      pitch_b: ai_result.pitch_b
    })
    |> Repo.insert()
    |> case do
      {:ok, match} ->
        Logger.info(
          "Matchmaking: directory-requested match created, users #{requester_id} -> #{target_id}, ai_score=#{match.ai_score}"
        )

        notify_requested_match(match, requester_id, target_id)
        {:ok, :requested, match}

      {:error, changeset} ->
        Logger.error("Matchmaking: failed to create directory-requested match: #{inspect(changeset.errors)}")
        {:error, changeset}
    end
  end

  # Shared core: find candidates, validate with AI best-first, and hand the
  # first one that clears the bar to `on_match`. Returns `{:queued}` (or
  # `{:error, :no_vector}`) if nothing clears it, without ever forcing a
  # low-confidence match through.
  defp with_best_candidate(current_user_profile, on_match) do
    if is_nil(current_user_profile.need_vector) or is_nil(current_user_profile.offer_vector) do
      {:queued}
    else
      current_user = Repo.get(User, current_user_profile.user_id)

      current_user_profile
      |> find_candidates()
      |> validate_candidates(current_user_profile, current_user)
      |> case do
        {:ok, candidate, ai_result} -> on_match.(candidate, ai_result)
        :queued -> {:queued}
      end
    end
  end

  # Stage 1 (pgvector): bidirectional similarity - my need against their
  # offer, AND their need against my offer - so a match has to hold up in
  # both directions, not just one. A cheap SQL pass (ordered on the single
  # cheapest direction) narrows the field first; the bidirectional score,
  # similarity floor, and recency tie-break are then applied in Elixir over
  # that small pool.
  defp find_candidates(current_user_profile) do
    current_user_id = current_user_profile.user_id

    matched_user_ids =
      from(m in Match,
        where: m.user_a_id == ^current_user_id or m.user_b_id == ^current_user_id,
        select:
          fragment(
            "CASE WHEN ? = ? THEN ? ELSE ? END",
            m.user_a_id,
            ^current_user_id,
            m.user_b_id,
            m.user_a_id
          )
      )

    from(p in Profile,
      join: u in User,
      on: u.id == p.user_id,
      where: p.user_id != ^current_user_id,
      where: not is_nil(p.offer_vector) and not is_nil(p.need_vector),
      where: p.user_id not in subquery(matched_user_ids),
      order_by: [asc: cosine_distance(p.offer_vector, ^current_user_profile.need_vector)],
      limit: ^@candidate_pool_size,
      select: %{
        profile: p,
        user: u,
        need_to_offer_distance: cosine_distance(p.offer_vector, ^current_user_profile.need_vector),
        offer_to_need_distance: cosine_distance(p.need_vector, ^current_user_profile.offer_vector)
      }
    )
    |> Repo.all()
    |> Enum.map(fn row ->
      sim_need_to_offer = 1.0 - row.need_to_offer_distance
      sim_offer_to_need = 1.0 - row.offer_to_need_distance
      # min(), not average: a genuinely complementary match has to be
      # strong in BOTH directions, so one weak direction should drag the
      # score down rather than get hidden by one very strong direction.
      Map.put(row, :bidirectional_score, min(sim_need_to_offer, sim_offer_to_need))
    end)
    |> Enum.filter(&(&1.bidirectional_score >= @similarity_floor))
    |> Enum.sort_by(&{-&1.bidirectional_score, negative_timestamp(&1.profile.updated_at)})
    |> Enum.take(@candidates_to_validate)
  end

  defp negative_timestamp(nil), do: 0

  defp negative_timestamp(%NaiveDateTime{} = ts) do
    {seconds, _microseconds} = NaiveDateTime.to_gregorian_seconds(ts)
    -seconds
  end

  # Stage 2 (AI): best-first, accept the first candidate that both the AI
  # marks as a genuinely actionable match AND clears its own confidence bar.
  defp validate_candidates([], _current_profile, _current_user), do: :queued

  defp validate_candidates([candidate | rest], current_profile, current_user) do
    user_a = %{
      name: current_user && current_user.full_name,
      offer_text: current_profile.offer_text,
      need_text: current_profile.need_text,
      role: current_user && current_user.role
    }

    user_b = %{
      name: candidate.user.full_name,
      offer_text: candidate.profile.offer_text,
      need_text: candidate.profile.need_text,
      role: candidate.user.role
    }

    case Vokazi.AI.validate_match(user_a, user_b) do
      {:ok, %{is_valid: true, score: score} = result} when score >= @ai_score_floor ->
        Logger.info(
          "Matchmaking: AI accepted candidate user_id=#{candidate.profile.user_id} " <>
            "score=#{score} bidirectional_score=#{Float.round(candidate.bidirectional_score, 3)}"
        )

        {:ok, candidate, result}

      {:ok, result} ->
        Logger.info(
          "Matchmaking: AI rejected candidate user_id=#{candidate.profile.user_id} " <>
            "score=#{result.score} reasoning=#{result.reasoning}"
        )

        validate_candidates(rest, current_profile, current_user)

      {:error, reason} ->
        Logger.error(
          "Matchmaking: AI validation call failed for candidate user_id=#{candidate.profile.user_id}: #{inspect(reason)}"
        )

        validate_candidates(rest, current_profile, current_user)
    end
  end

  defp create_match(current_user_profile, candidate, ai_result) do
    %Match{}
    |> Match.changeset(%{
      similarity_score: candidate.bidirectional_score,
      status: "pending_consent",
      user_a_id: current_user_profile.user_id,
      user_b_id: candidate.profile.user_id,
      ai_score: ai_result.score,
      ai_reasoning: ai_result.reasoning,
      ai_strengths: ai_result.strengths,
      ai_gaps: ai_result.gaps,
      intro_message: ai_result.intro_message,
      pitch_a: ai_result.pitch_a,
      pitch_b: ai_result.pitch_b
    })
    |> Repo.insert()
    |> case do
      {:ok, match} ->
        Logger.info(
          "🔥 MATCH VALIDATED! users #{match.user_a_id} and #{match.user_b_id}, " <>
            "similarity=#{Float.round(match.similarity_score * 100, 2)}%, ai_score=#{match.ai_score}"
        )

        notify_new_match(match)
        {:ok, match}

      {:error, changeset} ->
        Logger.error("Matchmaking: failed to create match: #{inspect(changeset.errors)}")
        {:error, changeset}
    end
  end

  # A pipeline-discovered match starts with both sides "pending" - neither
  # has any way to know it exists otherwise, since nothing else surfaces
  # it until they happen to open the Matches tab themselves.
  defp notify_new_match(match) do
    user_a = Repo.get(User, match.user_a_id)
    user_b = Repo.get(User, match.user_b_id)
    link = Jason.encode!(%{match_id: match.id})

    Notifications.notify(match.user_a_id, "new_match", "✨ You've been matched with #{other_name(user_b)} - take a look", link)
    Notifications.notify(match.user_b_id, "new_match", "✨ You've been matched with #{other_name(user_a)} - take a look", link)
  end

  # A directory-requested match starts with the requester already
  # "accepted" (they chose this person themselves) - only the target
  # side needs telling, since the requester already knows they just sent it.
  defp notify_requested_match(match, requester_id, target_id) do
    requester = Repo.get(User, requester_id)
    link = Jason.encode!(%{match_id: match.id})

    Notifications.notify(target_id, "new_match", "✨ #{other_name(requester)} wants to connect with you", link)
  end

  # The moment both sides accept and the chat room is created - the one
  # notification that actually matters most: neither side has any other
  # way to learn the other one just said yes.
  defp notify_match_unlocked(match) do
    user_a = Repo.get(User, match.user_a_id)
    user_b = Repo.get(User, match.user_b_id)
    link = Jason.encode!(%{match_id: match.id})

    Notifications.notify(match.user_a_id, "new_match", "🎉 You and #{other_name(user_b)} are connected - start chatting", link)
    Notifications.notify(match.user_b_id, "new_match", "🎉 You and #{other_name(user_a)} are connected - start chatting", link)
  end

  # Capitalized like a proper name so it reads naturally whether it opens
  # a sentence ("Someone wants to connect...") or sits mid-sentence
  # ("matched with Someone").
  defp other_name(%User{full_name: name}) when is_binary(name) and name != "", do: name
  defp other_name(_), do: "Someone"
end
