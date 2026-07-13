defmodule Vokazi.Repo.Migrations.AddPersonalizedPitchToMatches do
  use Ecto.Migration

  def change do
    alter table(:matches) do
      # Personalized, second-person pitch shown to each side ("you need
      # X because...") instead of a shared third-person analyst report.
      # Each is a map: %{"headline" => .., "strengths" => [..], "gaps" => [..]}.
      add :pitch_a, :map
      add :pitch_b, :map
    end
  end
end
