defmodule Vokazi.Repo.Migrations.CreateSocialProfiles do
  use Ecto.Migration

  def change do
    create table(:social_profiles) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :github_username, :string
      add :github_summary, :map
      add :linkedin_url, :string
      add :x_url, :string
      add :portfolio_url, :string

      timestamps()
    end

    create unique_index(:social_profiles, [:user_id])
  end
end
