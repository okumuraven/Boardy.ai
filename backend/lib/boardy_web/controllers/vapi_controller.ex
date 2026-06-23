defmodule BoardyWeb.VapiController do
  use BoardyWeb, :controller
  alias Boardy.Accounts.Profile
  alias Boardy.Repo

  def webhook(conn, %{"message" => message}) do
    # Vapi sends different types of messages. We only care about the end-of-call report.
    case message["type"] do
      "end-of-call-report" ->
        handle_end_of_call(message)
        json(conn, %{status: "received"})
      _ ->
        # Other webhooks (e.g., tool calls, call-start), just ack them.
        json(conn, %{status: "ignored"})
    end
  end
  
  # Handle the case where no message key is provided (some ping payloads)
  def webhook(conn, _params) do
    json(conn, %{status: "ok"})
  end

  defp handle_end_of_call(message) do
    # Vapi passes back our variableValues if we sent them.
    # We injected wallet_address (which maps to the DB ID in our frontend snippet)
    user_id = get_in(message, ["call", "assistantOverrides", "variableValues", "wallet_address"]) ||
              get_in(message, ["call", "customer", "number"]) # fallback
              
    transcript = message["transcript"]
    
    # If the user added the structured output in Vapi dashboard:
    analysis = message["analysis"] || %{}
    structured_data = analysis["structuredData"] || %{}
    offer = structured_data["professional_offer"]
    need = structured_data["professional_need"]

    if user_id do
      case Repo.get_by(Profile, user_id: user_id) do
        nil -> 
          IO.puts("Profile not found for user ID: #{user_id}")
        profile ->
          # Update the profile with the extracted data
          changeset = Profile.changeset(profile, %{
            raw_transcript: transcript,
            offer_text: offer || transcript, # fallback to transcript if Vapi didn't extract
            need_text: need || "Needs data extraction"
          })
          Repo.update!(changeset)
          
          # NOTE: Here we would trigger the OpenAI embeddings generation in the background!
          IO.puts("Successfully saved Vapi interview for user #{user_id}")
      end
    end
  end
end
