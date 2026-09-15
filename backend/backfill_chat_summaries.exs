# Fixes chat-interview profiles that never got properly summarized - a bug
# in InterviewChatController.finish/2 (now fixed) fell back to dumping the
# ENTIRE raw transcript into offer_text on any Vokazi.AI.extract_summary
# failure, instead of a bounded fallback. Anyone who hit that failure has a
# member-facing "Your Offer" that's actually a full raw back-and-forth
# conversation dump, and - worse - offer/need embeddings generated from
# that same raw text, which quietly degrades their matchmaking quality too.
#
# Re-runs extract_summary against each affected profile's already-saved
# raw_transcript and, on success, saves through the same
# Vokazi.Interviews.save_and_process/2 pipeline every real interview uses
# (re-classifies tags, regenerates the *separate* offer/need embeddings,
# and re-triggers matchmaking against the corrected text). Leaves anyone
# who still fails untouched rather than overwriting real data with another
# guess - printed at the end for manual follow-up.
#
# Usage (run inside the backend container, where Mix deps + env vars live):
#   docker compose exec backend mix run backfill_chat_summaries.exs

alias Vokazi.Repo
alias Vokazi.Accounts.Profile
import Ecto.Query

query =
  from p in Profile,
    where:
      p.interview_channel == "chat" and
        (p.need_text == "Requires manual parsing. Raw transcript saved." or
           like(p.offer_text, "Kuzana Connect:%")),
    where: not is_nil(p.raw_transcript) and p.raw_transcript != ""

affected = Repo.all(query)
IO.puts("Found #{length(affected)} chat-interview profile(s) with an unsummarized offer/need.")

{fixed, still_broken} =
  Enum.reduce(affected, {[], []}, fn profile, {fixed, still_broken} ->
    case Vokazi.AI.extract_summary(profile.raw_transcript) do
      {:ok, offer, need, contact_preference} ->
        Vokazi.Interviews.save_and_process(profile, %{
          offer_text: offer,
          need_text: need,
          contact_preference: contact_preference
        })

        IO.puts("Fixed user_id=#{profile.user_id}")
        {[profile.user_id | fixed], still_broken}

      {:error, reason} ->
        IO.puts("Still failing for user_id=#{profile.user_id}: #{inspect(reason)}")
        {fixed, [profile.user_id | still_broken]}
    end
  end)

IO.puts("\nDone. Fixed #{length(fixed)}, still needs attention: #{length(still_broken)}.")
if still_broken != [], do: IO.puts("Unresolved user_ids: #{inspect(Enum.reverse(still_broken))}")
