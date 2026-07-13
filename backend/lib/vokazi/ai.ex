defmodule Vokazi.AI do
  require Logger

  @doc """
  Calls Gemini to generate a real pgvector embedding, requesting the
  1536-dim output directly via `outputDimensionality` so the vector we get
  back is Google's properly-normalized Matryoshka truncation (unit norm),
  not a manual slice of the raw 3072-dim output (which isn't normalized).
  """
  def generate_embedding(text) do
    api_key = System.get_env("GEMINI_API_KEY")

    if is_nil(api_key) or api_key == "" do
      Logger.error("Vokazi.AI: GEMINI_API_KEY is not set. Cannot generate real vectors.")
      {:error, :missing_api_key}
    else
      url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=#{api_key}"

      body = %{
        model: "models/gemini-embedding-2",
        content: %{
          parts: [%{text: text}]
        },
        outputDimensionality: 1536
      }

      case Req.post(url, json: body, receive_timeout: 60_000, retry: :transient) do
        {:ok, %Req.Response{status: 200, body: data}} ->
          embedding = data["embedding"]["values"]
          {:ok, Pgvector.new(embedding)}

        error ->
          Logger.error("Vokazi.AI: Gemini embedding call failed: #{inspect(error)}")
          {:error, "Failed to generate embedding"}
      end
    end
  end

  @doc """
  Calls Gemini 1.5 Flash to intelligently extract the user's Offer and Need from the raw transcript.
  """
  def extract_summary(transcript) do
    api_key = System.get_env("GEMINI_API_KEY")
    
    if is_nil(api_key) or api_key == "" do
      {:error, :missing_api_key}
    else
      url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=#{api_key}"
      
      prompt = """
      You are an expert B2B matchmaker and executive summary writer. Read the conversation below and extract the user's Offer and Need.
      1. "offer": What is the user's core skill, product, or value proposition? (1-2 sentences). Make it sound incredibly strong, professional, and confident. Use high-impact action verbs.
      2. "need": What is the user's biggest bottleneck or requirement? (1-2 sentences). Frame this professionally as a strategic requirement or investment opportunity.
      
      Rules:
      - Return ONLY a valid JSON object with keys "offer" and "need".
      - DO NOT quote the raw conversation. Synthesize it into a highly polished, professional executive summary.
      - Ensure the tone is persuasive, strong, and business-focused.
      - If the conversation is cut off or missing details, make your best professional inference or write "Not explicitly stated".
      
      Conversation Transcript:
      #{transcript}
      """

      body = %{
        contents: [%{parts: [%{text: prompt}]}],
        generationConfig: %{
          responseMimeType: "application/json"
        }
      }
      
      case Req.post(url, json: body, receive_timeout: 60_000, retry: :transient) do
        {:ok, %Req.Response{status: 200, body: data}} ->
          try do
            text_response = data["candidates"] |> hd() |> get_in(["content", "parts"]) |> hd() |> Map.get("text")
            parsed = Jason.decode!(text_response)

            offer = parsed["offer"] || "Not specified"
            need = parsed["need"] || "Not specified"

            {:ok, offer, need}
          rescue
            _ -> {:error, "Failed to parse JSON"}
          end
        error ->
          Logger.error("Vokazi.AI: Gemini summary extraction failed: #{inspect(error)}")
          {:error, "Failed to call Gemini"}
      end
    end
  end

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
  like Vokazi already knows this person and their needs, since that
  trust is what makes someone willing to pay the commitment stake.
  """
  def validate_match(user_a, user_b) do
    api_key = System.get_env("GEMINI_API_KEY")

    if is_nil(api_key) or api_key == "" do
      {:error, :missing_api_key}
    else
      url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=#{api_key}"

      name_a = user_a[:name] || "Person A"
      name_b = user_b[:name] || "Person B"

      prompt = """
      You are a skeptical, senior B2B matchmaking analyst. Two founders/professionals
      were shortlisted as a potential introduction by a vector-similarity search.
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

      case Req.post(url, json: body, receive_timeout: 60_000, retry: :transient) do
        {:ok, %Req.Response{status: 200, body: data}} ->
          try do
            text_response = data["candidates"] |> hd() |> get_in(["content", "parts"]) |> hd() |> Map.get("text")
            parsed = Jason.decode!(text_response)

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

        error ->
          Logger.error("Vokazi.AI: Gemini match validation call failed: #{inspect(error)}")
          {:error, "Failed to call Gemini"}
      end
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
