defmodule Vokazi.AI do
  require Logger

  @doc """
  Posts a request body to a Gemini model endpoint, rotating through every
  configured API key on any non-2xx result - an HTTP error status
  (429 quota exhausted, 503 model overloaded, etc) or a transport-level
  exception (timeout, connection refused) both mean "try the next key,"
  not just the specific failure shapes seen in production so far.

  Three things make this fast instead of making a real user sit through it:

  1. No per-key retry backoff (`retry: false`) - a failed key isn't going
     to succeed in the next second either, so retrying it 3 times with
     1s/2s/4s backoff before even trying the next key (the old behavior)
     turned a 10-key rotation into a 100+ second wait. Each dead key now
     costs only its own network round-trip.
  2. A short 10s `receive_timeout` per key - a hung connection likely
     isn't going to resolve at 30s either, and with several keys each
     capable of hanging, that adds up fast.
  3. Rotation starts from whichever key last actually worked
     (`:persistent_term`, process-wide), not always from the top of the
     list - once key 1 is exhausted for the day, every request from
     every user would otherwise pay the cost of re-discovering that
     before reaching a working key.

  `GEMINI_API_KEYS` is a comma-separated list of keys, each from a separate
  Google account/project so each carries its own independent free-tier
  daily quota - falls back to the single `GEMINI_API_KEY` env var if unset,
  so single-key setups (e.g. local dev) are unaffected.
  """
  def gemini_post(model_and_action, body) do
    case gemini_api_keys() do
      [] -> {:error, :missing_api_key}
      keys -> post_with_key_rotation(rotate_from_last_good(keys), model_and_action, body)
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

  @last_good_key_id {__MODULE__, :last_good_key}

  defp rotate_from_last_good(keys) do
    case Enum.find_index(keys, &(&1 == :persistent_term.get(@last_good_key_id, nil))) do
      nil -> keys
      index -> Enum.drop(keys, index) ++ Enum.take(keys, index)
    end
  end

  defp post_with_key_rotation([key], model_and_action, body) do
    result = do_gemini_post(key, model_and_action, body)
    remember_if_good(key, result)
    result
  end

  defp post_with_key_rotation([key | rest], model_and_action, body) do
    result = do_gemini_post(key, model_and_action, body)

    if success?(result) do
      remember_if_good(key, result)
      result
    else
      Logger.warning("Vokazi.AI: Gemini key failed (#{inspect(failure_reason(result))}), rotating to next key")
      post_with_key_rotation(rest, model_and_action, body)
    end
  end

  # A failure is anything that isn't a 2xx - an HTTP error status
  # (429/503/etc) and a transport-level exception (timeout, connection
  # refused) both mean "try the next key," not just the specific status
  # codes we happened to have seen in production so far.
  defp success?({:ok, %Req.Response{status: status}}), do: status in 200..299
  defp success?(_), do: false

  defp failure_reason({:ok, %Req.Response{status: status}}), do: status
  defp failure_reason({:error, %{reason: reason}}), do: reason
  defp failure_reason(_), do: :unknown

  defp remember_if_good(key, result) do
    if success?(result) and :persistent_term.get(@last_good_key_id, nil) != key do
      :persistent_term.put(@last_good_key_id, key)
    end
  end

  defp do_gemini_post(key, model_and_action, body) do
    url = "https://generativelanguage.googleapis.com/v1beta/models/#{model_and_action}?key=#{key}"
    Req.post(url, json: body, receive_timeout: 10_000, retry: false)
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

    case gemini_post("gemini-flash-latest:generateContent", body) do
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

    case gemini_post("gemini-flash-latest:generateContent", body) do
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
  Returns `{:ok, %{score:, is_valid:, reasoning:, strengths:, gaps:, intro_message:, pitch_a:, pitch_b:, opener_a:, opener_b:}}`.

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
      - "opener_a": a single ready-to-send first message #{name_a} could actually send
        #{name_b} to kick off their conversation - written in #{name_a}'s own voice
        (first person: "I"/"my", never third person), addressed to #{name_b} by name,
        naming the specific, concrete reason this match makes sense (grounded in the
        real Offer/Need text above - never generic small talk like "Hi, how are you" or
        "Excited to connect"). One to three sentences, ending in a real, specific
        question #{name_b} can actually answer. If is_valid is false, an empty string.
      - "opener_b": the mirror of "opener_a" - #{name_b}'s own ready-to-send first
        message to #{name_a}, same rules, same voice.
      Both pitches must be grounded in the actual Offer/Need text above - never invent
      details, and keep the same honesty bar as "gaps": a 90% match still has real
      caveats worth naming. The openers must be specific enough that neither person
      could mistake them for a template - if you couldn't tell #{name_a} and #{name_b}
      apart from the message alone, rewrite it.
      """

    body = %{
      contents: [%{parts: [%{text: prompt}]}],
      generationConfig: %{
        responseMimeType: "application/json"
      }
    }

    case gemini_post("gemini-flash-latest:generateContent", body) do
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
             pitch_b: parse_pitch(parsed["pitch_b"]),
             opener_a: parsed["opener_a"] || "",
             opener_b: parsed["opener_b"] || ""
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
  Drafts opener_a/opener_b on demand for a match that already exists and
  was already judged valid - used by `Vokazi.Matchmaking.get_or_generate_opener/2`
  for the chat's "Suggest something to say" button (covers both matches
  created before this feature shipped, and a conversation that's gone
  quiet after starting - not just the very first message). Deliberately
  a separate, smaller call from validate_match/2 rather than re-running
  the whole thing: the score/validity verdict is already settled, and
  redoing it risks a different, inconsistent answer for no reason.

  `user_a`/`user_b` are the same `%{:name, :offer_text, :need_text,
  :role}` shape validate_match/2 takes. Returns `{:ok, %{opener_a:,
  opener_b:}}`.
  """
  def generate_openers(user_a, user_b) do
    name_a = user_a[:name] || "Person A"
    name_b = user_b[:name] || "Person B"

    prompt = """
      #{name_a} and #{name_b} are two Kuzana Connect members who've already matched and can
      already message each other - but their conversation hasn't really started yet, or has
      gone quiet. Based on what each is offering and looking for, write one ready-to-send
      message each of them could send right now to actually get the conversation going.

      #{name_a} (role: #{user_a[:role] || "unspecified"}):
        Offer: #{user_a[:offer_text]}
        Need: #{user_a[:need_text]}

      #{name_b} (role: #{user_b[:role] || "unspecified"}):
        Offer: #{user_b[:offer_text]}
        Need: #{user_b[:need_text]}

      Return ONLY a valid JSON object with these exact keys:
      - "opener_a": a single ready-to-send message #{name_a} could actually send #{name_b} -
        written in #{name_a}'s own voice (first person: "I"/"my", never third person),
        addressed to #{name_b} by name, naming the specific, concrete reason this match makes
        sense (grounded in the real Offer/Need text above - never generic small talk like
        "Hi, how are you" or "Excited to connect"). One to three sentences, ending in a real,
        specific question #{name_b} can actually answer.
      - "opener_b": the mirror of "opener_a" - #{name_b}'s own ready-to-send message to
        #{name_a}, same rules, same voice.
      Both must be grounded in the actual Offer/Need text above - never invent details, and
      specific enough that neither person could mistake it for a template.
      """

    body = %{
      contents: [%{parts: [%{text: prompt}]}],
      generationConfig: %{
        responseMimeType: "application/json"
      }
    }

    case gemini_post("gemini-flash-latest:generateContent", body) do
      {:ok, %Req.Response{status: 200, body: data}} ->
        try do
          text_response = data["candidates"] |> hd() |> get_in(["content", "parts"]) |> hd() |> Map.get("text")
          parsed = Jason.decode!(extract_json_object(text_response))

          {:ok,
           %{
             opener_a: parsed["opener_a"] || "",
             opener_b: parsed["opener_b"] || ""
           }}
        rescue
          e ->
            Logger.error("Vokazi.AI: failed to parse opener generation JSON: #{inspect(e)}")
            {:error, "Failed to parse JSON"}
        end

      {:error, :missing_api_key} = error ->
        error

      error ->
        Logger.error("Vokazi.AI: Gemini opener generation call failed: #{inspect(error)}")
        {:error, "Failed to call Gemini"}
    end
  end

  @doc """
  Kuzana's real first-stage screening (bizi_verification.md), automated -
  reviews a submitted application for completeness/consistency and, if
  something's missing or contradictory, drafts a clarifying question for
  staff to review and send. Never sent automatically - "AI drafts, human
  sends" is the same boundary this app already holds for match intro
  messages, just applied here too. Structured reasoning, same as
  `validate_match/2`, never a bare verdict.
  """
  def screen_bizi_application(application) do
    prompt = """
      You are a careful, experienced screener for Kuzana's Bizi accelerator program,
      reviewing a founder's application before a human screening call. Your job is to
      catch what's incomplete, vague, or internally inconsistent - not to judge whether
      the business itself is good, only whether the APPLICATION gives Kuzana's team
      enough to work with.

      Company: #{application.company_name}
      What the business does: #{application.business_description}
      Track(s): #{Enum.join(application.track || [], ", ")}
      Heard about Kuzana via: #{application.heard_about_us}
      Question for Kuzana: #{application.question_for_us || "(none)"}

      Look specifically for:
      1. A business description that's too vague to act on (buzzwords, no concrete
         product/customer/revenue model described).
      2. Any internal inconsistency (e.g. the track selected doesn't match what the
         description actually says the business does).
      3. Anything a screener would obviously need to ask about before a call, that
         isn't already answered above.

      Return ONLY a valid JSON object with these exact keys:
      - "summary": one or two sentences, your overall read on this application's readiness
        for a screening call.
      - "concerns": a list of 0-4 short, specific strings - each a real, concrete issue you
        found (e.g. "Business description doesn't say who the paying customer is"). Empty
        list if there's genuinely nothing to flag - don't invent concerns to fill the list.
      - "needs_clarification": boolean, true only if there's something concrete enough to
        ask the applicant directly before proceeding.
      - "drafted_message": if needs_clarification is true, a warm, professional 1-3
        sentence message addressed directly to the applicant asking for exactly what's
        missing - written as Kuzana's team would write it, specific to what's actually
        missing above, never generic. If needs_clarification is false, an empty string.
      """

    body = %{
      contents: [%{parts: [%{text: prompt}]}],
      generationConfig: %{
        responseMimeType: "application/json"
      }
    }

    case gemini_post("gemini-flash-latest:generateContent", body) do
      {:ok, %Req.Response{status: 200, body: data}} ->
        try do
          text_response = data["candidates"] |> hd() |> get_in(["content", "parts"]) |> hd() |> Map.get("text")
          parsed = Jason.decode!(extract_json_object(text_response))

          {:ok,
           %{
             summary: parsed["summary"] || "",
             concerns: List.wrap(parsed["concerns"]),
             needs_clarification: parsed["needs_clarification"] || false,
             drafted_message: parsed["drafted_message"] || ""
           }}
        rescue
          e ->
            Logger.error("Vokazi.AI: failed to parse Bizi screening JSON: #{inspect(e)}")
            {:error, "Failed to parse JSON"}
        end

      {:error, :missing_api_key} = error ->
        error

      error ->
        Logger.error("Vokazi.AI: Gemini Bizi screening call failed: #{inspect(error)}")
        {:error, "Failed to call Gemini"}
    end
  end

  @doc """
  Despite `responseMimeType: "application/json"`, Gemini's flash models
  sometimes append a stray extra "}" (or other trailing bytes) after an
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
