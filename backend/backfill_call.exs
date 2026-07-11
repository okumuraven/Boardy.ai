# Recovers a past Vapi call that was never saved (e.g. calls made before the
# vokazi_user_id metadata fix) by pulling the transcript/structured data back
# from Vapi's REST API and replaying it through the real /api/vapi webhook,
# so it goes through the same save -> embed -> match pipeline as a live call.
#
# Usage (run inside the backend container, where Mix deps + env vars live):
#   docker compose exec backend mix run backfill_call.exs <vapi_call_id> <user_id>

[call_id, user_id_str] = System.argv()
user_id = String.to_integer(user_id_str)

private_key =
  System.get_env("VAPI_PRIVATE_KEY") ||
    raise "Set VAPI_PRIVATE_KEY in backend/.env (Vapi Dashboard -> API Keys -> Private Key), then recreate the backend container."

IO.puts("Fetching call #{call_id} from Vapi...")

case Req.get("https://api.vapi.ai/call/#{call_id}", headers: [{"authorization", "Bearer #{private_key}"}]) do
  {:ok, %Req.Response{status: 200, body: call}} ->
    transcript = get_in(call, ["artifact", "transcript"]) || ""
    structured_data = get_in(call, ["analysis", "structuredData"]) || %{}

    if transcript == "" do
      IO.puts("WARNING: no transcript found on this call. Aborting so we don't overwrite good data with blanks.")
    else
      IO.puts("Got transcript (#{String.length(transcript)} chars). offer_text/need_text present: #{Map.has_key?(structured_data, "offer_text")}/#{Map.has_key?(structured_data, "need_text")}")

      payload = %{
        "message" => %{
          "type" => "end-of-call-report",
          "call" => %{
            "id" => call_id,
            "assistantOverrides" => %{"metadata" => %{"vokazi_user_id" => user_id}}
          },
          "transcript" => transcript,
          "analysis" => %{"structuredData" => structured_data}
        }
      }

      case Req.post("http://localhost:4000/api/vapi", json: payload) do
        {:ok, %Req.Response{status: 200}} ->
          IO.puts("Replayed call #{call_id} into the webhook for user_id=#{user_id}. Check `docker compose logs backend` for the save/embedding confirmation.")

        other ->
          IO.inspect(other, label: "Webhook replay failed")
      end
    end

  {:ok, %Req.Response{status: status, body: body}} ->
    IO.puts("Vapi API returned HTTP #{status}:")
    IO.inspect(body)

  {:error, reason} ->
    IO.inspect(reason, label: "Request to Vapi failed")
end
