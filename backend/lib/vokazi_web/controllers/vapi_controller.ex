defmodule VokaziWeb.VapiController do
  use VokaziWeb, :controller
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
            e -> IO.puts("CRITICAL TASK ERROR: #{inspect(e)}")
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

    # 🔗 Pillar 2: Identity Resolution (Transcript Extraction)
    # We parse the secret system message we injected via React!
    user_id = case Regex.run(~r/\[VOKAZI_SYSTEM_IDENTITY:\s*user_id=(\d+)\]/i, transcript) do
      [_, id] -> String.to_integer(id)
      _ -> get_in(message, ["call", "customer", "number"]) # Fallback
    end
    
    # 🛡️ Pillar 3: Graceful AI Fallbacks
    analysis = message["analysis"] || %{}
    structured_data = analysis["structuredData"] || %{}
    
    # Defensive fallback to raw transcript if AI fails to extract
    offer = structured_data["offer_text"] || transcript
    need = structured_data["need_text"] || "Requires manual parsing. Raw transcript saved."

    if user_id do
      case Repo.get_by(Profile, user_id: user_id) do
        nil -> 
          IO.puts("Profile not found for user ID: #{user_id}")
        profile ->
          changeset = Profile.changeset(profile, %{
            raw_transcript: transcript,
            offer_text: offer,
            need_text: need
          })
          
          updated_profile = Repo.update!(changeset)
          IO.puts("Successfully saved transcript and structured data for user #{user_id}")
          
          # Trigger OpenAI Vector Math asynchronously
          generate_vectors(updated_profile)
      end
    else
      IO.puts("Webhook Warning: No user_id found in metadata. Cannot save profile data.")
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
        IO.puts("Successfully generated and saved pgvector embeddings for user #{profile.user_id}")
        
        # 🔥 Phase 2: Instant Asynchronous Matchmaking
        Vokazi.Matchmaking.find_pending_match(updated_profile)
        
      {:error, _reason} ->
        IO.puts("Failed to generate vector for user #{profile.user_id}")
    end
  end
end
