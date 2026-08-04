defmodule Vokazi.Repo.Migrations.CreateBiziApplicationDocuments do
  use Ecto.Migration

  # Tags one attachment already sitting in the verification chat
  # (bizi_verification_build_plan.md §Phase C) as one of the real
  # document types Kuzana's DD stage asks for - a thin join, not a
  # duplicate upload path. One attachment can only ever be one document.
  def change do
    create table(:bizi_application_documents) do
      add :bizi_application_id, references(:bizi_applications, on_delete: :delete_all), null: false
      add :message_attachment_id, references(:message_attachments, on_delete: :delete_all), null: false
      add :document_type, :string, null: false
      add :tagged_by_admin_id, references(:users, on_delete: :nilify_all)

      timestamps()
    end

    create index(:bizi_application_documents, [:bizi_application_id])
    create unique_index(:bizi_application_documents, [:message_attachment_id])
  end
end
