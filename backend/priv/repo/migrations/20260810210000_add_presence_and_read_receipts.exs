defmodule Vokazi.Repo.Migrations.AddPresenceAndReadReceipts do
  use Ecto.Migration

  def change do
    # Stamped whenever a user's presence is untracked - either they
    # explicitly signal "backgrounded" (ChatRoomChannel's "set_away", the
    # Page Visibility API) or their socket disconnects for real
    # (ChatRoomChannel.terminate/2). Shown as "Last seen ..." whenever
    # they're not currently online.
    alter table(:users) do
      add :last_seen_at, :utc_datetime
    end

    # A read CURSOR, not a per-message flag - "this person has seen
    # everything up to message X in this room," the same model
    # WhatsApp/most real chat systems use, since a row per
    # (message, reader) would grow unboundedly for no benefit here (a
    # 1:1 or small-group room only ever needs the latest cursor, never
    # the history of what was read when).
    create table(:chat_room_reads) do
      add :chat_room_id, references(:chat_rooms, on_delete: :delete_all), null: false
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :last_read_message_id, references(:messages, on_delete: :nilify_all)

      timestamps()
    end

    create unique_index(:chat_room_reads, [:chat_room_id, :user_id])
  end
end
