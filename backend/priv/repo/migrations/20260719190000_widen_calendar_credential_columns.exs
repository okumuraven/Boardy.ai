defmodule Vokazi.Repo.Migrations.WidenCalendarCredentialColumns do
  use Ecto.Migration

  def change do
    alter table(:calendar_credentials) do
      # access_token/refresh_token here are AES-256-GCM ciphertext,
      # base64-encoded (Vokazi.Scheduling.EncryptedField) - well past the
      # default varchar(255), and Google's granted `scope` string can
      # also run long once it echoes back multiple space-separated
      # scope URLs.
      modify :access_token, :text
      modify :refresh_token, :text
      modify :scope, :text
    end
  end
end
