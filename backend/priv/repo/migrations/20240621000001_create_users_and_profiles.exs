defmodule Boardy.Repo.Migrations.CreateUsersAndProfiles do
  use Ecto.Migration

  def up do
    # Enable the pgvector extension for AI matchmaking
    execute("CREATE EXTENSION IF NOT EXISTS vector")

    create table(:users) do
      add :email, :string
      add :full_name, :string
      add :role, :string
      add :wallet_address, :string # Avalanche wallet
      add :onboarding_completed, :boolean, default: false

      timestamps()
    end

    create unique_index(:users, [:email])
    create unique_index(:users, [:wallet_address])

    create table(:profiles) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :phone_number, :string
      add :raw_transcript, :text
      add :need_text, :text
      add :offer_text, :text

      # pgvector columns for high-dimensional matching (OpenAI uses 1536 dimensions)
      add :need_vector, :vector, size: 1536
      add :offer_vector, :vector, size: 1536

      timestamps()
    end

    create unique_index(:profiles, [:user_id])
    create unique_index(:profiles, [:phone_number])
  end

  def down do
    drop table(:profiles)
    drop table(:users)
    execute("DROP EXTENSION IF EXISTS vector")
  end
end
