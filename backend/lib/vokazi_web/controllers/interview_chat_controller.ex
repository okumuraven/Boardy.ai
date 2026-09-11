defmodule VokaziWeb.InterviewChatController do
  use VokaziWeb, :controller
  require Logger

  alias Vokazi.Accounts.Profile

  @doc """
  One turn of the chat interview - never touches the Profile, purely a
  live Gemini call. Identity always comes from the verified session
  (conn.assigns.current_user_id), same as every other authenticated
  route, though it isn't actually needed here since Vokazi.AI.chat_reply/1
  is stateless; kept behind AuthPlug anyway so this can't be hit
  anonymously as a free Gemini proxy.
  """
  def message(conn, params) do
    history = Map.get(params, "history", [])

    case Vokazi.AI.chat_reply(history) do
      {:ok, %{reply: reply, ready_to_finish: ready_to_finish}} ->
        json(conn, %{reply: reply, ready_to_finish: ready_to_finish})

      {:error, reason} ->
        Logger.error("InterviewChatController: chat_reply failed for user_id=#{conn.assigns.current_user_id}: #{inspect(reason)}")
        conn |> put_status(502) |> json(%{error: "Couldn't reach the assistant. Please try again."})
    end
  end

  @doc """
  Finalizes the chat interview - the chat equivalent of what Vapi's
  end-of-call webhook does for voice. Originally ran this synchronously
  in the request (no third-party webhook to race here, so it seemed
  simpler) - reverted after production showed a single Gemini call can
  take 125s+ working through a long key-rotation list, and this path
  chains up to four of them (extract_summary, extract_tags, two
  embeddings). Async-then-poll, same as Vapi's webhook, so the HTTP
  request itself can never hang on that chain.
  """
  def finish(conn, params) do
    history = Map.get(params, "history", [])
    user_id = conn.assigns.current_user_id
    profile = Vokazi.Repo.get_by(Profile, user_id: user_id)

    transcript =
      history
      |> Enum.map(fn turn ->
        speaker = if turn["role"] == "agent", do: "Kuzana Connect", else: "You"
        "#{speaker}: #{turn["text"]}"
      end)
      |> Enum.join("\n")

    cond do
      is_nil(profile) ->
        conn |> put_status(404) |> json(%{error: "Profile not found"})

      transcript == "" ->
        conn |> put_status(422) |> json(%{error: "No conversation to finish yet"})

      true ->
        Task.start(fn ->
          try do
            {offer, need, contact_preference} =
              case Vokazi.AI.extract_summary(transcript) do
                {:ok, o, n, pref} ->
                  {o, n, pref}

                {:error, reason} ->
                  Logger.error("InterviewChatController: extract_summary failed for user_id=#{user_id}: #{inspect(reason)}")
                  {transcript, "Requires manual parsing. Raw transcript saved.", "chat"}
              end

            Vokazi.Interviews.save_and_process(profile, %{
              raw_transcript: transcript,
              offer_text: offer,
              need_text: need,
              contact_preference: contact_preference,
              interview_channel: "chat"
            })
          rescue
            e -> Logger.error("InterviewChatController: finish task failed for user_id=#{user_id}: #{inspect(e)}")
          end
        end)

        json(conn, %{status: "processing"})
    end
  end
end
