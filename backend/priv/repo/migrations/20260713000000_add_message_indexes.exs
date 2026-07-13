defmodule Vokazi.Repo.Migrations.AddMessageIndexes do
  use Ecto.Migration

  def change do
    # Every room join/scroll-back runs "messages for this room, ordered by
    # id" (id, not inserted_at, as the pagination cursor - monotonic and
    # collision-free even if two messages land in the same millisecond).
    # Without this index it's a full table scan across every message
    # system-wide, and it gets worse as the whole platform grows, not just
    # any one room.
    create index(:messages, [:chat_room_id, :id])

    # Supports future per-user history/moderation queries.
    create index(:messages, [:sender_id])
  end
end
