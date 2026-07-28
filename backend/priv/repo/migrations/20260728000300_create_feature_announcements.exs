defmodule Vokazi.Repo.Migrations.CreateFeatureAnnouncements do
  use Ecto.Migration

  def change do
    create table(:feature_announcements) do
      add :title, :string, null: false
      add :message, :text, null: false
      add :sent_by_admin_id, references(:users, on_delete: :nilify_all)

      timestamps(updated_at: false)
    end
  end
end
