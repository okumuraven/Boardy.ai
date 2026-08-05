defmodule Vokazi.Repo.Migrations.AddMetadataToBiziApplicationStageEvents do
  use Ecto.Migration

  # Phase E's AI screening needs the drafted message + concerns list back
  # as real structured data (so the admin panel can show/edit them), not
  # buried in the free-text `comment` a human would have to re-parse -
  # same %{} pattern Vokazi.Admin.AuditLog already uses for its own
  # metadata column.
  def change do
    alter table(:bizi_application_stage_events) do
      add :metadata, :map, default: %{}
    end
  end
end
