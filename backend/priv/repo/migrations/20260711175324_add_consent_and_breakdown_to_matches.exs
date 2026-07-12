defmodule Vokazi.Repo.Migrations.AddConsentAndBreakdownToMatches do
  use Ecto.Migration

  def change do
    alter table(:matches) do
      # Each side's independent decision on whether to proceed with this
      # match, reviewed before either party is asked to commit to anything.
      add :user_a_response, :string, default: "pending", null: false
      add :user_b_response, :string, default: "pending", null: false

      # Transparent match breakdown: not just a score, but *why* it scored
      # that way, and what's missing so a 60% match doesn't read as a
      # black box.
      add :ai_strengths, {:array, :string}, default: []
      add :ai_gaps, {:array, :string}, default: []
    end
  end
end
