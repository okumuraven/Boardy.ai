defmodule VokaziWeb.VapiController do
  use VokaziWeb, :controller
  require Logger
  alias Vokazi.Accounts.Profile
  alias Vokazi.Repo

  def webhook(conn, %{"message" => message}) do
    case message["type"] do
      "end-of-call-report" ->
        # ⚡ Pillar 4: Asynchronous Processing
        Task.start(fn ->
          try do
            handle_end_of_call(message)
          rescue
            e -> Logger.error("Vapi webhook: CRITICAL TASK ERROR: #{inspect(e)}")
          end
        end)
        json(conn, %{status: "received"})

      "assistant-request" ->
        # Handshake for custom assistants
        json(conn, %{})

      _ ->
        json(conn, %{status: "ignored"})
    end
  end
  
  def webhook(conn, _params) do
    json(conn, %{status: "ok"})
  end

  defp handle_end_of_call(message) do
    transcript = message["transcript"] || ""
    call_id = get_in(message, ["call", "id"])

    # 🛡️ Pillar 3: Graceful AI Fallbacks
    analysis = message["analysis"] || %{}
    structured_data = analysis["structuredData"] || %{}
    {offer, need} = resolve_offer_and_need(structured_data, transcript, call_id)

    case resolve_profile(message) do
      nil ->
        Logger.error(
          "Vapi webhook: could not resolve a profile for call_id=#{call_id}. " <>
            "No assistantOverrides.metadata.vokazi_user_id and no matching customer number on the call payload."
        )

      profile ->
        changeset =
          Profile.changeset(profile, %{
            raw_transcript: transcript,
            offer_text: offer,
            need_text: need
          })

        updated_profile = Repo.update!(changeset)
        Logger.info("Vapi webhook: saved transcript + structured data for user_id=#{profile.user_id} call_id=#{call_id}")

        generate_vectors(updated_profile)
    end
  end

  # Prefer Vapi's own structured-data extraction (configured in the Analysis
  # tab). If that's missing or wasn't configured for this assistant, fall
  # back to our own Gemini-based extraction instead of dumping the raw
  # transcript into offer_text — only if that also fails do we keep the
  # transcript as a last resort so we never lose the interview outright.
  defp resolve_offer_and_need(%{"offer_text" => offer, "need_text" => need}, _transcript, _call_id)
       when is_binary(offer) and is_binary(need) do
    {offer, need}
  end

  defp resolve_offer_and_need(_structured_data, transcript, call_id) do
    case Vokazi.AI.extract_summary(transcript) do
      {:ok, offer, need} ->
        Logger.info("Vapi webhook: Vapi structuredData missing, used Gemini fallback extraction for call_id=#{call_id}")
        {offer, need}

      {:error, reason} ->
        Logger.error("Vapi webhook: Gemini fallback extraction failed for call_id=#{call_id}: #{inspect(reason)}. Saving raw transcript instead.")
        {transcript, "Requires manual parsing. Raw transcript saved."}
    end
  end

  # 🔗 Pillar 2: Identity Resolution (via Vapi's `metadata` passthrough)
  # The frontend passes `assistantOverrides: {metadata: {vokazi_user_id: ...}}`
  # when starting the call. Vapi echoes it back untouched on every server
  # event, so we read it directly instead of parsing the transcript.
  # Falls back to the caller's phone number for real (Phase 3) PSTN calls,
  # which is a *phone_number* lookup, not a *user_id* lookup.
  defp resolve_profile(message) do
    user_id =
      (get_in(message, ["call", "assistantOverrides", "metadata", "vokazi_user_id"]) ||
         get_in(message, ["call", "metadata", "vokazi_user_id"]))
      |> parse_int()

    cond do
      user_id -> Repo.get_by(Profile, user_id: user_id)
      phone = get_in(message, ["call", "customer", "number"]) -> Repo.get_by(Profile, phone_number: phone)
      true -> nil
    end
  end

  # Vapi metadata always round-trips as a string; DB ids are integers.
  defp parse_int(nil), do: nil
  defp parse_int(id) when is_integer(id), do: id

  defp parse_int(id) when is_binary(id) do
    case Integer.parse(id) do
      {int, ""} -> int
      _ -> nil
    end
  end

  defp generate_vectors(profile) do
    text_to_embed = "Offer: #{profile.offer_text} Need: #{profile.need_text}"
    case Vokazi.AI.generate_embedding(text_to_embed) do
      {:ok, vector} ->
        vector_changeset = Profile.changeset(profile, %{
          offer_vector: vector,
          need_vector: vector
        })
        updated_profile = Repo.update!(vector_changeset)
        Logger.info("Vapi webhook: saved pgvector embeddings for user_id=#{profile.user_id}")

        # 🔥 Phase 2: Instant Asynchronous Matchmaking
        Vokazi.Matchmaking.find_pending_match(updated_profile)

      {:error, reason} ->
        Logger.error("Vapi webhook: failed to generate vector for user_id=#{profile.user_id}: #{inspect(reason)}")
    end
  end
end
