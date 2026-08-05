defmodule Vokazi.Repo.Migrations.AddBusinessPhotosToProfiles do
  use Ecto.Migration

  def change do
    alter table(:profiles) do
      add :business_photos, {:array, :string}, default: [], null: false
      add :business_photos_public, :boolean, default: false, null: false
    end
  end
end
