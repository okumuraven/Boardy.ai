defmodule Vokazi.Repo.Migrations.CreateCalendarCredentials do
  use Ecto.Migration

  def change do
    create table(:calendar_credentials) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :google_email, :string, null: false

      # AES-256-GCM encrypted at the application layer
      # (Vokazi.Scheduling.EncryptedField) - never stored in plaintext.
      add :access_token, :string, null: false
      add :refresh_token, :string, null: false

      add :expires_at, :utc_datetime, null: false
      add :scope, :string, null: false

      timestamps()
    end

    # One Calendar link per user - reconnecting overwrites rather than
    # duplicating.
    create unique_index(:calendar_credentials, [:user_id])
  end
end
