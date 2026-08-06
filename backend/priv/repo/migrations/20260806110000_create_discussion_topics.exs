defmodule Vokazi.Repo.Migrations.CreateDiscussionTopics do
  use Ecto.Migration

  def change do
    create table(:discussion_topics) do
      add :title, :string, null: false
      add :body, :text, null: false
      add :posted_by_admin_id, references(:users, on_delete: :nilify_all)

      timestamps(updated_at: false)
    end
  end
end
