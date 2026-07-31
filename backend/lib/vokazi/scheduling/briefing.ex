defmodule Vokazi.Scheduling.Briefing do
  @moduledoc """
  Generates each side's private pre-call briefing: a short agenda
  summarizing who the *other* person is and what to bring up on the
  call. Reuses `Vokazi.AI`'s Gemini call pattern, but is a distinct
  module because the audience and goal differ from match validation -
  this is written for one person about their counterpart, and is never
  shown to the other side of the match.
  """

  require Logger

  @doc """
  Returns `{:ok, %{summary:, talking_points:}}` written in the second
  person, addressed to `viewer` about `counterpart`.
  """
  def generate(viewer, counterpart) do
    viewer_name = viewer[:name] || "you"
    counterpart_name = counterpart[:name] || "the other person"

    prompt = """
    You are preparing #{viewer_name} for a real intro call with #{counterpart_name}
    in the next few minutes. Write a short, private briefing - only #{viewer_name}
    will ever see this.

    About #{counterpart_name}:
      Offer: #{counterpart[:offer_text]}
      Need: #{counterpart[:need_text]}

    Return ONLY a valid JSON object with:
    - "summary": 1-2 warm, confident sentences reminding #{viewer_name} who they're
      about to talk to and why this match makes sense, second person ("you").
    - "talking_points": a list of 2-3 short, concrete things worth raising on the call,
      grounded in the actual Offer/Need text above - never invent details.
    """

    body = %{
      contents: [%{parts: [%{text: prompt}]}],
      generationConfig: %{responseMimeType: "application/json"}
    }

    case Vokazi.AI.gemini_post("gemini-flash-latest:generateContent", body) do
      {:ok, %Req.Response{status: 200, body: data}} ->
        try do
          text = data["candidates"] |> hd() |> get_in(["content", "parts"]) |> hd() |> Map.get("text")
          parsed = Jason.decode!(Vokazi.AI.extract_json_object(text))
          {:ok, %{summary: parsed["summary"] || "", talking_points: List.wrap(parsed["talking_points"])}}
        rescue
          e ->
            Logger.error("Vokazi.Scheduling.Briefing: failed to parse JSON: #{inspect(e)}")
            {:error, :parse_failed}
        end

      {:error, :missing_api_key} = error ->
        error

      error ->
        Logger.error("Vokazi.Scheduling.Briefing: Gemini call failed: #{inspect(error)}")
        {:error, :gemini_call_failed}
    end
  end
end
