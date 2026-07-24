defmodule Mix.Tasks.BackfillTags do
  @moduledoc """
  One-off backfill: classifies existing profiles' offer_text/need_text
  into the connection-tag vocabulary (`Vokazi.Accounts.Profile.connection_tags/0`)
  for anyone who completed their voice interview before
  looking_for_tags/can_help_tags existed (Phase 4 Stage B). Safe to re-run -
  only touches profiles that have both offer_text and need_text set but
  still have empty tags, so it never overwrites a real extraction.

      mix backfill_tags
  """
  use Mix.Task
  import Ecto.Query

  alias Vokazi.Repo
  alias Vokazi.Accounts.Profile

  @shortdoc "Backfills looking_for_tags/can_help_tags for existing profiles"

  def run(_args) do
    Mix.Task.run("app.start")

    profiles =
      Repo.all(
        from(p in Profile,
          where: not is_nil(p.offer_text) and not is_nil(p.need_text),
          where: p.looking_for_tags == ^[] and p.can_help_tags == ^[]
        )
      )

    Mix.shell().info("Backfilling tags for #{length(profiles)} profile(s)...")

    Enum.each(profiles, fn profile ->
      case Vokazi.AI.extract_tags(profile.offer_text, profile.need_text) do
        {:ok, %{looking_for_tags: looking_for, can_help_tags: can_help}} ->
          profile
          |> Profile.changeset(%{looking_for_tags: looking_for, can_help_tags: can_help})
          |> Repo.update!()

          Mix.shell().info(
            "  user_id=#{profile.user_id}: looking_for=#{inspect(looking_for)} can_help=#{inspect(can_help)}"
          )

        {:error, reason} ->
          Mix.shell().error("  user_id=#{profile.user_id}: failed (#{inspect(reason)})")
      end
    end)

    Mix.shell().info("Done.")
  end
end
