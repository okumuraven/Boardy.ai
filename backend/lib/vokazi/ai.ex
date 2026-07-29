defmodule Vokazi.AI do
  require Logger

  @doc """
  Posts a request body to a Gemini model endpoint, rotating through every
  configured API key on a 429 (quota exhausted) response before giving up.
  `GEMINI_API_KEYS` is a comma-separated list of keys, each from a separate
  Google account/project so each carries its own independent free-tier
  daily quota - falls back to the single `GEMINI_API_KEY` env var if unset,
  so single-key setups (e.g. local dev) are unaffected.
  """
  def gemini_post(model_and_action, body) do
    case gemini_api_keys() do
      [] -> {:error, :missing_api_key}
      keys -> post_with_key_rotation(keys, model_and_action, body)
    end
  end

  defp gemini_api_keys do
    case System.get_env("GEMINI_API_KEYS") do
      nil ->
        case System.get_env("GEMINI_API_KEY") do
          key when is_binary(key) and key != "" -> [key]
          _ -> []
        end

      keys ->
        keys |> String.split(",") |> Enum.map(&String.trim/1) |> Enum.reject(&(&1 == ""))
    end
  end

  defp post_with_key_rotation([key], model_and_action, body) do
    do_gemini_post(key, model_and_action, body)
  end

  defp post_with_key_rotation([key | rest], model_and_action, body) do
    case do_gemini_post(key, model_and_action, body) do
      {:ok, %Req.Response{status: 429}} ->
        Logger.warning("Vokazi.AI: Gemini key exhausted (429), rotating to next key")
        post_with_key_rotation(rest, model_and_action, body)

      result ->
        result
    end
  end

  defp do_gemini_post(key, model_and_action, body) do
    url = "https://generativelanguage.googleapis.com/v1beta/models/#{model_and_action}?key=#{key}"
    Req.post(url, json: body, receive_timeout: 60_000, retry: :transient)
  end

  @doc """
  Calls Gemini to generate a real pgvector embedding, requesting the
  1536-dim output directly via `outputDimensionality` so the vector we get
  back is Google's properly-normalized Matryoshka truncation (unit norm),
  not a manual slice of the raw 3072-dim output (which isn't normalized).
  """
  def generate_embedding(text) do
    body = %{
      model: "models/gemini-embedding-2",
      content: %{
        parts: [%{text: text}]
      },
      outputDimensionality: 1536
    }

    case gemini_post("gemini-embedding-2:embedContent", body) do
      {:ok, %Req.Response{status: 200, body: data}} ->
        embedding = data["embedding"]["values"]
        {:ok, Pgvector.new(embedding)}

      {:error, :missing_api_key} = error ->
        Logger.error("Vokazi.AI: no GEMINI_API_KEY(S) set. Cannot generate real vectors.")
        error

      error ->
        Logger.error("Vokazi.AI: Gemini embedding call failed: #{inspect(error)}")
        {:error, "Failed to generate embedding"}
    end
  end

  @doc """
  Calls Gemini 1.5 Flash to intelligently extract the user's Offer, Need,
  and preferred way to connect for an intro call from the raw transcript.
  """
  def extract_summary(transcript) do
    prompt = """
      You are helping a Kuzana Connect member write their own profile in their own words - not
      selling them, not writing a corporate bio. Read the conversation below and extract their
      Offer, Need, and contact preference.

      Write "offer" and "need" in the FIRST PERSON, as if the member themselves is speaking
      directly ("I run a logistics company delivering to retailers across three counties..." /
      "I'm looking for a lender who understands seasonal cash-flow gaps"). NEVER write in the
      third person ("The user is..." / "They are looking for...") - that reads like a case file,
      not a direct personal statement, and this text is shown back to the member as their own
      profile ("Your Offer"/"Your Need").

      1. "offer": What is their core skill, business, or track record? (1-2 sentences, first
         person, direct - say it plainly, the way a real Kuzana member would describe their own
         business to a peer, not the way a pitch deck would).
      2. "need": What is their biggest bottleneck or requirement right now? (1-2 sentences, first
         person, specific and concrete).
      3. "contact_preference": how they'd rather connect with a future intro - exactly one of "call", "video", or "chat". Infer this from anything they said about preferring to talk, hop on video, or message first. Default to "call" if nothing indicates a preference.

      Rules:
      - Return ONLY a valid JSON object with keys "offer", "need", and "contact_preference".
      - DO NOT quote the raw conversation. Synthesize it into a clear, direct first-person
        statement, written as described above.
      - Never imply a ranking or judgment about the person's business stage, size, or sector - an
        early-revenue founder and an institutional lender get exactly the same plain, respectful
        treatment. No "incredibly strong" or inflated confidence - just what's real.
      - If the conversation is cut off or missing details, make your best honest inference or
        write "Not explicitly stated".

      Conversation Transcript:
      #{transcript}
      """

    body = %{
      contents: [%{parts: [%{text: prompt}]}],
      generationConfig: %{
        responseMimeType: "application/json"
      }
    }

    case gemini_post("gemini-3.5-flash:generateContent", body) do
      {:ok, %Req.Response{status: 200, body: data}} ->
        try do
          text_response = data["candidates"] |> hd() |> get_in(["content", "parts"]) |> hd() |> Map.get("text")
          parsed = Jason.decode!(extract_json_object(text_response))

          offer = parsed["offer"] || "Not specified"
          need = parsed["need"] || "Not specified"
          contact_preference = parse_contact_preference(parsed["contact_preference"])

          {:ok, offer, need, contact_preference}
        rescue
          e ->
            Logger.error("Vokazi.AI: failed to parse extract_summary JSON: #{inspect(e)}. Raw text: #{inspect(get_in(data, ["candidates", Access.at(0), "content", "parts", Access.at(0), "text"]))}")
            {:error, "Failed to parse JSON"}
        end

      {:error, :missing_api_key} = error ->
        error

      error ->
        Logger.error("Vokazi.AI: Gemini summary extraction failed: #{inspect(error)}")
        {:error, "Failed to call Gemini"}
    end
  end

  defp parse_contact_preference(pref) when pref in ["call", "video", "chat"], do: pref
  defp parse_contact_preference(_), do: "call"

  @doc """
  Classifies an already-saved offer_text/need_text pair into the fixed
  connection-tag vocabulary (`Vokazi.Accounts.Profile.connection_tags/0`) -
  deliberately separate from `extract_summary/1` so it can run against
  existing profiles (the one-off `mix backfill_tags` for anyone who
  completed their interview before these fields existed) without
  re-deriving or risking overwriting offer_text/need_text itself.

  Returns `{:ok, %{looking_for_tags: [...], can_help_tags: [...]}}` - both
  lists are sanitized against the allowed vocabulary regardless of what
  Gemini returns, since this is untrusted model output feeding a validated
  field. Empty lists are a valid, expected result when nothing genuinely
  fits - the prompt is explicit that tags shouldn't be forced.
  """
  def extract_tags(offer_text, need_text) do
    allowed_tags = Vokazi.Accounts.Profile.connection_tags()
    tags_csv = Enum.join(allowed_tags, ", ")

    prompt = """
      You are classifying a professional's stated Offer and Need into a fixed set of
      connection-intent tags, used to filter a member directory. The ONLY allowed
      tags are: #{tags_csv}.

      Offer: #{offer_text}
      Need: #{need_text}

      Return ONLY a valid JSON object with two keys:
      - "looking_for_tags": a list of 0-3 tags from the allowed set that best describe
        what this person is looking FOR, based on their Need. Only include a tag if
        it's genuinely supported by the text - do not force a match just to fill the list.
      - "can_help_tags": a list of 0-3 tags from the allowed set that best describe
        what this person can OFFER others, based on their Offer. Same rule - only
        include a tag if it's genuinely supported.

      Use only tags from the allowed set above, spelled exactly as given. Return an
      empty array for either key if nothing in the allowed set genuinely applies.
      """

    body = %{
      contents: [%{parts: [%{text: prompt}]}],
      generationConfig: %{responseMimeType: "application/json"}
    }

    case gemini_post("gemini-3.5-flash:generateContent", body) do
      {:ok, %Req.Response{status: 200, body: data}} ->
        try do
          text_response = data["candidates"] |> hd() |> get_in(["content", "parts"]) |> hd() |> Map.get("text")
          parsed = Jason.decode!(extract_json_object(text_response))

          {:ok,
           %{
             looking_for_tags: sanitize_tags(parsed["looking_for_tags"], allowed_tags),
             can_help_tags: sanitize_tags(parsed["can_help_tags"], allowed_tags)
           }}
        rescue
          e ->
            Logger.error("Vokazi.AI: failed to parse extract_tags JSON: #{inspect(e)}")
            {:error, "Failed to parse JSON"}
        end

      {:error, :missing_api_key} = error ->
        error

      error ->
        Logger.error("Vokazi.AI: Gemini tag extraction failed: #{inspect(error)}")
        {:error, "Failed to call Gemini"}
    end
  end

  defp sanitize_tags(tags, allowed) when is_list(tags) do
    tags |> Enum.filter(&(&1 in allowed)) |> Enum.uniq()
  end

  defp sanitize_tags(_not_a_list, _allowed), do: []

  @doc """
  Asks Gemini to make the final call on whether a pgvector-shortlisted
  candidate pair is a *genuinely* complementary match, not just a lexically
  similar one. pgvector narrows the field; this is the judgment layer on
  top of it, and it doubles as the source of the "why you two should meet"
  introduction copy so we don't need a second LLM call for that later.

  `user_a` and `user_b` are maps with `:offer_text`, `:need_text`, `:role`.
  Returns `{:ok, %{score:, is_valid:, reasoning:, strengths:, gaps:, intro_message:, pitch_a:, pitch_b:}}`.

  `reasoning`/`strengths`/`gaps` are the shared, third-person analyst
  verdict (kept for internal/logging use). `pitch_a` and `pitch_b` are
  what each person actually sees: a personalized, second-person
  `%{"headline", "strengths", "gaps"}` written directly to that person
  ("you need X because...") rather than an unexplained percentage or a
  report about two strangers - the goal is for the match screen to feel
  like Kuzana Connect already knows this person and their needs, since that
  trust is what makes someone willing to say yes.
  """
  def validate_match(user_a, user_b) do
    name_a = user_a[:name] || "Person A"
    name_b = user_b[:name] || "Person B"

    prompt = """
      You are a sharp, skeptical judge of whether two Kuzana Connect members are a genuinely
      useful match - not just two people who used similar words. Two members were shortlisted
      as a potential introduction by a vector-similarity search.
      Your job is to catch false positives: pairs that merely *sound* similar in
      wording, but where one person's Need is not actually satisfied by the other's
      Offer (in either direction) - and to be transparent about exactly what does
      and doesn't line up, so neither person is just handed an unexplained number.

      #{name_a} (role: #{user_a[:role] || "unspecified"}):
        Offer: #{user_a[:offer_text]}
        Need: #{user_a[:need_text]}

      #{name_b} (role: #{user_b[:role] || "unspecified"}):
        Offer: #{user_b[:offer_text]}
        Need: #{user_b[:need_text]}

      Evaluate strictly:
      1. Does #{name_b}'s Offer concretely satisfy #{name_a}'s Need?
      2. Does #{name_a}'s Offer concretely satisfy #{name_b}'s Need?
      3. Is this a specific, actionable match, or vague/generic overlap that wouldn't
         actually lead anywhere?

      Return ONLY a valid JSON object with these exact keys:
      - "score": integer 0-100, your confidence this is a genuinely valuable introduction
      - "is_valid": boolean, true only if this is a real, actionable complementary match
      - "reasoning": one or two sentences summarizing your overall verdict
      - "strengths": a list of 2-4 short, specific strings on exactly what lines up well
        between them (e.g. "Both are targeting the same industry vertical"). Only include
        things genuinely present in their text - don't pad this list.
      - "gaps": a list of 1-3 short, specific strings on what's uncertain, unaddressed, or
        a partial mismatch (e.g. "Person A wants funding now; Person B's check size and
        timeline aren't mentioned"). This is what explains the gap between the score and
        100 - be honest even when is_valid is true, since a 90% match still has caveats
        worth surfacing. Only list real gaps found in their text, never invent generic ones.
      - "intro_message": if is_valid is true, a warm 2-3 sentence introduction addressed to
        both #{name_a} and #{name_b} by name, explaining why they should meet and what each
        brings the other. If is_valid is false, an empty string.
      - "pitch_a": a personalized pitch shown only to #{name_a}, written speaking directly
        to them as "you" (never in the third person, never call them by name) - as if you
        already know them and their business. An object with:
          - "headline": one or two warm, confident sentences on why THEY specifically
            should meet #{name_b} - e.g. "You need capital and go-to-market muscle to scale
            past your infrastructure bottleneck - #{name_b} brings exactly that."
          - "strengths": 2-4 short strings, second person, on what #{name_b} concretely
            brings that answers #{name_a}'s stated need (e.g. "#{name_b} directly covers
            your need for dedicated funding and GTM execution").
          - "gaps": 1-3 short strings, second person, on what's still uncertain or worth
            asking about before committing (e.g. "Worth confirming whether #{name_b}'s
            check size matches what you're raising").
      - "pitch_b": the mirror of "pitch_a" - shown only to #{name_b}, speaking to them as
        "you", explaining why #{name_a} answers THEIR need. Same object shape.
      Both pitches must be grounded in the actual Offer/Need text above - never invent
      details, and keep the same honesty bar as "gaps": a 90% match still has real
      caveats worth naming.
      """

    body = %{
      contents: [%{parts: [%{text: prompt}]}],
      generationConfig: %{
        responseMimeType: "application/json"
      }
    }

    case gemini_post("gemini-3.5-flash:generateContent", body) do
      {:ok, %Req.Response{status: 200, body: data}} ->
        try do
          text_response = data["candidates"] |> hd() |> get_in(["content", "parts"]) |> hd() |> Map.get("text")
          parsed = Jason.decode!(extract_json_object(text_response))

          {:ok,
           %{
             score: parsed["score"] || 0,
             is_valid: parsed["is_valid"] || false,
             reasoning: parsed["reasoning"] || "",
             strengths: List.wrap(parsed["strengths"]),
             gaps: List.wrap(parsed["gaps"]),
             intro_message: parsed["intro_message"] || "",
             pitch_a: parse_pitch(parsed["pitch_a"]),
             pitch_b: parse_pitch(parsed["pitch_b"])
           }}
        rescue
          e ->
            Logger.error("Vokazi.AI: failed to parse match validation JSON: #{inspect(e)}")
            {:error, "Failed to parse JSON"}
        end

      {:error, :missing_api_key} = error ->
        error

      error ->
        Logger.error("Vokazi.AI: Gemini match validation call failed: #{inspect(error)}")
        {:error, "Failed to call Gemini"}
    end
  end

  @doc """
  Despite `responseMimeType: "application/json"`, gemini-3.5-flash
  sometimes appends a stray extra "}" (or other trailing bytes) after an
  otherwise complete, valid JSON object - which makes `Jason.decode!`
  reject the whole string since it requires no trailing content. This
  scans for the first structurally-balanced `{...}` (tracking string
  literals/escapes so braces inside quoted text don't miscount) and
  decodes only that, discarding anything Gemini tacked on afterward.
  Public so other Gemini-calling modules (e.g. `Vokazi.Scheduling.Briefing`)
  can reuse the same fix instead of duplicating it.
  """
  def extract_json_object(text) do
    trimmed = String.trim(text)

    case find_balanced_object_end(trimmed) do
      nil -> trimmed
      end_index -> String.slice(trimmed, 0, end_index)
    end
  end

  defp find_balanced_object_end(text) do
    text
    |> String.to_charlist()
    |> Enum.with_index()
    |> Enum.reduce_while({0, false, false}, fn {char, index}, {depth, in_string, escaped} ->
      cond do
        escaped -> {:cont, {depth, in_string, false}}
        char == ?\\ and in_string -> {:cont, {depth, in_string, true}}
        char == ?" -> {:cont, {depth, not in_string, false}}
        in_string -> {:cont, {depth, in_string, false}}
        char == ?{ -> {:cont, {depth + 1, in_string, false}}
        char == ?} and depth - 1 == 0 -> {:halt, index + 1}
        char == ?} -> {:cont, {depth - 1, in_string, false}}
        true -> {:cont, {depth, in_string, false}}
      end
    end)
    |> case do
      index when is_integer(index) -> index
      _ -> nil
    end
  end

  defp parse_pitch(%{} = pitch) do
    %{
      "headline" => pitch["headline"] || "",
      "strengths" => List.wrap(pitch["strengths"]),
      "gaps" => List.wrap(pitch["gaps"])
    }
  end

  defp parse_pitch(_), do: %{"headline" => "", "strengths" => [], "gaps" => []}
end
