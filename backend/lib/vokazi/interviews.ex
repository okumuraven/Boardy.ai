defmodule Vokazi.Interviews do
  @moduledoc """
  The shared back half of every interview channel (Vapi voice webhook,
  the chat-interview finish endpoint): given a profile and its resolved
  offer/need attrs, save them, classify directory tags, and generate the
  separate offer/need embeddings that drive matchmaking. Originally lived
  as private functions on VokaziWeb.VapiController; extracted here so the
  chat interview can reuse the exact same pipeline instead of a parallel
  copy that could silently drift (e.g. the old sync_real_transcript dev
  bypass, which embeds one combined vector for both offer and need
  instead of two separate ones).
  """

  require Logger
  alias Vokazi.Accounts.Profile
  alias Vokazi.Repo

  def save_and_process(profile, attrs) do
    profile
    |> Profile.changeset(attrs)
    |> Repo.update!()
    |> save_tags()
    |> generate_vectors()
  end

  # Separate Gemini call from whatever resolved offer_text/need_text -
  # classifies whatever's already been saved, regardless of which
  # interview channel produced it, so this one step covers both
  # uniformly. Never blocks the profile save on failure - a bad/slow
  # classification call shouldn't cost someone their interview.
  defp save_tags(profile) do
    case Vokazi.AI.extract_tags(profile.offer_text, profile.need_text) do
      {:ok, %{looking_for_tags: looking_for, can_help_tags: can_help}} ->
        profile
        |> Profile.changeset(%{looking_for_tags: looking_for, can_help_tags: can_help})
        |> Repo.update!()

      {:error, reason} ->
        Logger.error("Vokazi.Interviews: tag extraction failed for user_id=#{profile.user_id}: #{inspect(reason)}")
        profile
    end
  end

  # Offer and Need are embedded *separately* so offer_vector and need_vector
  # actually represent different things. Embedding one combined string for
  # both meant every profile's two vectors were identical, which silently
  # turned "does their offer meet my need" matching into "does their whole
  # profile read like mine" matching.
  defp generate_vectors(profile) do
    with {:ok, offer_vector} <- Vokazi.AI.generate_embedding(profile.offer_text),
         {:ok, need_vector} <- Vokazi.AI.generate_embedding(profile.need_text) do
      vector_changeset =
        Profile.changeset(profile, %{
          offer_vector: offer_vector,
          need_vector: need_vector
        })

      updated_profile = Repo.update!(vector_changeset)
      Logger.info("Vokazi.Interviews: saved pgvector embeddings for user_id=#{profile.user_id}")

      Vokazi.Matchmaking.find_pending_match(updated_profile)
      updated_profile
    else
      {:error, reason} ->
        Logger.error("Vokazi.Interviews: failed to generate vector for user_id=#{profile.user_id}: #{inspect(reason)}")
        profile
    end
  end
end
