defmodule Vokazi.Interviews.RetryUnsummarizedWorker do
  @moduledoc """
  Daily sweep that retries Gemini summarization for any profile still
  stuck in the bounded raw-transcript fallback - both interview channels
  (InterviewChatController.finish/2 for chat, VapiController's
  end-of-call handling for voice) fall back to the same
  "Raw Transcript Captured: ..." shape when Vokazi.AI.extract_summary/1
  fails even after its own inline retry. A single LLM call/key rotation
  being unlucky twice in a row doesn't mean it'll be unlucky again
  tomorrow, so most of these self-heal within a day or two without ever
  needing another manual backfill run (backfill_chat_summaries.exs was
  the one-off version of exactly this sweep, written to fix the first
  member caught by this bug before this worker existed).

  Fired by the `Oban.Plugins.Cron` entry in config/runtime.exs, not
  called directly.
  """
  use Oban.Worker, queue: :interview_retries, max_attempts: 3

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.Profile

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    unsummarized_profiles()
    |> Enum.each(&retry/1)

    :ok
  end

  defp unsummarized_profiles do
    from(p in Profile,
      where: not is_nil(p.raw_transcript) and p.raw_transcript != "",
      where: like(p.offer_text, "Raw Transcript Captured:%")
    )
    |> Repo.all()
  end

  defp retry(profile) do
    case Vokazi.AI.extract_summary(profile.raw_transcript) do
      {:ok, offer, need, contact_preference} ->
        Vokazi.Interviews.save_and_process(profile, %{
          offer_text: offer,
          need_text: need,
          contact_preference: contact_preference
        })

      {:error, _reason} ->
        # Already alerted once when the fallback was first written - no
        # need to re-alert on every failed daily retry attempt too.
        :ok
    end
  end
end
