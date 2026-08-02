defmodule Vokazi.Repo.Migrations.BiziTrackToArray do
  use Ecto.Migration

  # The real form says "Track(s)" - plural, multi-select - not a single
  # choice. Caught during a manual walkthrough after the first real
  # submission only recorded one track. No production data to preserve
  # yet (hackathon build) - a clean type change, not a backfill.
  def change do
    alter table(:bizi_applications) do
      remove :track, :string
      add :track, {:array, :string}, null: false, default: []
    end
  end
end
