defmodule Vokazi.AI do
  @doc """
  Calls Gemini to generate a real pgvector embedding.
  Pads the 768-dimensional Gemini vector to 1536 dimensions so we don't have to alter the database schema.
  """
  def generate_embedding(text) do
    api_key = System.get_env("GEMINI_API_KEY")
    
    if is_nil(api_key) or api_key == "" do
      IO.puts("WARNING: GEMINI_API_KEY is not set. Cannot generate real vectors.")
      {:error, :missing_api_key}
    else
      url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=#{api_key}"
      
      body = %{
        model: "models/gemini-embedding-2",
        content: %{
          parts: [%{text: text}]
        }
      }
      
      case Req.post(url, json: body, receive_timeout: 60_000, retry: :transient) do
        {:ok, %Req.Response{status: 200, body: data}} ->
          embedding = data["embedding"]["values"]
          
          # Gemini 2 returns a massive 3072 dimensions. Our DB is strictly 1536 dimensions.
          # We slice the first 1536 elements to perfectly align with the schema.
          padded_embedding = Enum.take(embedding, 1536)
          
          {:ok, Pgvector.new(padded_embedding)}
          
        error ->
          IO.inspect(error, label: "GEMINI_ERROR")
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
          IO.inspect(error, label: "GEMINI_SUMMARY_ERROR")
          {:error, "Failed to call Gemini"}
      end
    end
  end
end
