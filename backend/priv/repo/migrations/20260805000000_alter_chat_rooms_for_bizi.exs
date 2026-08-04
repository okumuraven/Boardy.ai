defmodule Vokazi.Repo.Migrations.AlterChatRoomsForBizi do
  use Ecto.Migration

  # Phase C (bizi_verification_build_plan.md) reuses the exact same room
  # concept for a Bizi verification thread - the alternative was a
  # parallel bizi_chat_rooms table duplicating messages/attachments
  # wiring for no real reason. A room now belongs to exactly one lineage
  # (match XOR bizi_application), enforced below at the DB level, not
  # just in the changeset - Postgres unique indexes already treat
  # multiple NULLs as non-conflicting, so the existing unique index on
  # match_id needs no change to keep working once it's nullable.
  def change do
    alter table(:chat_rooms) do
      modify :match_id, :bigint, null: true
      add :bizi_application_id, references(:bizi_applications, on_delete: :delete_all)
    end

    create unique_index(:chat_rooms, [:bizi_application_id], where: "bizi_application_id IS NOT NULL")

    create constraint(:chat_rooms, :match_xor_bizi_application,
             check: "(match_id IS NOT NULL)::int + (bizi_application_id IS NOT NULL)::int = 1"
           )
  end
end
