defmodule Vokazi.Repo.Migrations.AddAiValidationToMatches do
  use Ecto.Migration

  def change do
    alter table(:matches) do
      # AI's own 0-100 confidence that this is a genuinely complementary
      # match, distinct from the raw pgvector similarity_score.
      add :ai_score, :float
      # Why the AI accepted (or, during development, rejected) the match.
      add :ai_reasoning, :text
      # Ready-to-send "why you two should meet" copy for the introduction.
      add :intro_message, :text
    end
  end
end
