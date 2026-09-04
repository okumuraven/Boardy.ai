defmodule VokaziWeb.VapiController do
  use VokaziWeb, :controller
  require Logger
  alias Vokazi.Accounts.Profile
  alias Vokazi.Repo

  # This is a server-to-server webhook from Vapi's own servers, not a
  # user session - it never goes through VokaziWeb.AuthPlug (there's no
  # user Authorization header to check). Instead it verifies a shared
  # secret Vapi is configured to send on every request, so a request
  # claiming to be a completed call can't just be forged by anyone who
  # knows this endpoint's URL - which, before this check existed, was
  # true of literally anyone.
  def webhook(conn, %{"message" => message}) do
    if authorized?(conn) do
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
    else
      Logger.error("Vapi webhook: rejected request with missing/invalid X-Vapi-Secret header")
      conn |> put_status(401) |> json(%{error: "Unauthorized"})
    end
  end

  def webhook(conn, _params) do
    if authorized?(conn), do: json(conn, %{status: "ok"}), else: conn |> put_status(401) |> json(%{error: "Unauthorized"})
  end

  defp authorized?(conn) do
    case get_req_header(conn, "x-vapi-secret") do
      [secret] -> Plug.Crypto.secure_compare(secret, System.fetch_env!("VAPI_WEBHOOK_SECRET"))
      _ -> false
    end
  end

  defp handle_end_of_call(message) do
    transcript = message["transcript"] || ""
    call_id = get_in(message, ["call", "id"])

    # 🛡️ Pillar 3: Graceful AI Fallbacks
    analysis = message["analysis"] || %{}
    structured_data = analysis["structuredData"] || %{}
    {offer, need, contact_preference} = resolve_offer_and_need(structured_data, transcript, call_id)

    case resolve_profile(message) do
      nil ->
        Logger.error(
          "Vapi webhook: could not resolve a profile for call_id=#{call_id}. " <>
            "No assistantOverrides.metadata.kuzana_user_id and no matching customer number on the call payload."
        )

      profile ->
        changeset =
          Profile.changeset(profile, %{
            raw_transcript: transcript,
            offer_text: offer,
            need_text: need,
            contact_preference: contact_preference
          })

        updated_profile = Repo.update!(changeset)
        Logger.info("Vapi webhook: saved transcript + structured data for user_id=#{profile.user_id} call_id=#{call_id}")

        updated_profile
        |> save_tags()
        |> generate_vectors()
    end
  end

  # Separate Gemini call from resolve_offer_and_need/3 above - classifies
  # the offer/need text that's already been saved, regardless of whether
  # it came from Vapi's own structured extraction or our Gemini fallback,
  # so this one step covers both paths uniformly. Never blocks profile
  # save on failure - a bad/slow classification call shouldn't cost
  # someone their interview.
  defp save_tags(profile) do
    case Vokazi.AI.extract_tags(profile.offer_text, profile.need_text) do
      {:ok, %{looking_for_tags: looking_for, can_help_tags: can_help}} ->
        profile
        |> Profile.changeset(%{looking_for_tags: looking_for, can_help_tags: can_help})
        |> Repo.update!()

      {:error, reason} ->
        Logger.error("Vapi webhook: tag extraction failed for user_id=#{profile.user_id}: #{inspect(reason)}")
        profile
    end
  end

  # Prefer Vapi's own structured-data extraction (configured in the Analysis
  # tab). If that's missing or wasn't configured for this assistant, fall
  # back to our own Gemini-based extraction instead of dumping the raw
  # transcript into offer_text — only if that also fails do we keep the
  # transcript as a last resort so we never lose the interview outright.
  defp resolve_offer_and_need(
         %{"offer_text" => offer, "need_text" => need} = structured_data,
         _transcript,
         _call_id
       )
       when is_binary(offer) and is_binary(need) do
    contact_preference =
      case structured_data["contact_preference"] do
        pref when pref in ["call", "video", "chat"] -> pref
        _ -> "call"
      end

    {offer, need, contact_preference}
  end

  defp resolve_offer_and_need(_structured_data, transcript, call_id) do
    case Vokazi.AI.extract_summary(transcript) do
      {:ok, offer, need, contact_preference} ->
        Logger.info("Vapi webhook: Vapi structuredData missing, used Gemini fallback extraction for call_id=#{call_id}")
        {offer, need, contact_preference}

      {:error, reason} ->
        Logger.error("Vapi webhook: Gemini fallback extraction failed for call_id=#{call_id}: #{inspect(reason)}. Saving raw transcript instead.")
        
        Task.start(fn ->
          Vokazi.Admin.SystemAlertMailer.notify_extraction_failure(call_id, reason)
        end)

        {transcript, "Requires manual parsing. Raw transcript saved.", "call"}
    end
  end

  # 🔗 Pillar 2: Identity Resolution (via Vapi's `metadata` passthrough)
  # The frontend passes `assistantOverrides: {metadata: {kuzana_user_id: ...}}`
  # when starting the call. Vapi echoes it back untouched on every server
  # event, so we read it directly instead of parsing the transcript.
  # Falls back to the caller's phone number for real (Phase 3) PSTN calls,
  # which is a *phone_number* lookup, not a *user_id* lookup.
  defp resolve_profile(message) do
    user_id =
      (get_in(message, ["call", "assistantOverrides", "metadata", "kuzana_user_id"]) ||
         get_in(message, ["call", "metadata", "kuzana_user_id"]))
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

  # Offer and Need are embedded *separately* so offer_vector and need_vector
  # actually represent different things. Embedding one combined string for
  # both (the old behavior) meant every profile's two vectors were
  # identical, which silently turned "does their offer meet my need"
  # matching into "does their whole profile read like mine" matching.
  defp generate_vectors(profile) do
    with {:ok, offer_vector} <- Vokazi.AI.generate_embedding(profile.offer_text),
         {:ok, need_vector} <- Vokazi.AI.generate_embedding(profile.need_text) do
      vector_changeset =
        Profile.changeset(profile, %{
          offer_vector: offer_vector,
          need_vector: need_vector
        })

      updated_profile = Repo.update!(vector_changeset)
      Logger.info("Vapi webhook: saved pgvector embeddings for user_id=#{profile.user_id}")

      # 🔥 Phase 2: Instant Asynchronous Matchmaking
      Vokazi.Matchmaking.find_pending_match(updated_profile)
    else
      {:error, reason} ->
        Logger.error("Vapi webhook: failed to generate vector for user_id=#{profile.user_id}: #{inspect(reason)}")
    end
  end
end
