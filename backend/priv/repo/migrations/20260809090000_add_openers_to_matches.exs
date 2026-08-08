defmodule Vokazi.Repo.Migrations.AddOpenersToMatches do
  use Ecto.Migration

  # A ready-to-send first message for each side (Vokazi.AI.validate_match/2
  # generates both alongside intro_message/pitch_a/pitch_b in the same
  # Gemini call) - replaces the chat's generic "say hello" empty state,
  # which is what was actually producing dead conversations (a match
  # opens a private room with zero context, so both people just see a
  # blank thread).
  def change do
    alter table(:matches) do
      add :opener_a, :text
      add :opener_b, :text
    end
  end
end
