defmodule Vokazi.Repo.Migrations.CreateAdminInvites do
  use Ecto.Migration

  # Lets a Superadmin grant access to an email address before that person
  # has ever signed in - Kuzana staff aren't community members and
  # shouldn't have to go through voice-interview onboarding to get admin
  # access. Consumed (deleted) the moment the invited email actually signs
  # in with Google. See "Admin panel.md" §3.
  def change do
    create table(:admin_invites) do
      add :email, :string, null: false
      add :admin_role, :string, null: false
      add :invited_by_user_id, references(:users), null: false

      timestamps(updated_at: false)
    end

    create unique_index(:admin_invites, [:email])
  end
end
