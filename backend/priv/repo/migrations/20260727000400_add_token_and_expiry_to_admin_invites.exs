defmodule Vokazi.Repo.Migrations.AddTokenAndExpiryToAdminInvites do
  use Ecto.Migration

  def change do
    alter table(:admin_invites) do
      add :token, :string
      add :expires_at, :utc_datetime
    end

    create unique_index(:admin_invites, [:token])
  end
end
