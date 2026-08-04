defmodule Vokazi.Repo.Migrations.CreateMessageAttachments do
  use Ecto.Migration

  # `chat_room_id` (not `message_id` alone) is required from the start -
  # the file is uploaded over plain HTTP before the message that will
  # reference it exists (chat itself is channel-only, but raw bytes can't
  # ride a WebSocket text frame the way this app's protocol is shaped),
  # so the room is the only thing available to gate the upload/download
  # participant-check against until the attach step links `message_id`.
  def change do
    create table(:message_attachments) do
      add :chat_room_id, references(:chat_rooms, on_delete: :delete_all), null: false
      add :message_id, references(:messages, on_delete: :delete_all)
      add :uploaded_by_id, references(:users, on_delete: :nilify_all), null: false
      add :filename, :string, null: false
      add :content_type, :string, null: false
      add :byte_size, :integer, null: false
      add :storage_path, :string, null: false

      timestamps()
    end

    create index(:message_attachments, [:chat_room_id])

    # One attachment per message (has_one on Message) - partial because
    # an uploaded-but-not-yet-attached row legitimately has a nil
    # message_id, and plenty of those can coexist.
    create unique_index(:message_attachments, [:message_id], where: "message_id IS NOT NULL")
  end
end
