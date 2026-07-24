defmodule Vokazi.Repo.Migrations.AddConnectionTagsToProfiles do
  use Ecto.Migration

  # Structured "looking for" / "can help with" tags (Phase 4 Stage B,
  # kuzana_connect_discovery.md) - auto-extracted from the same
  # offer_text/need_text the voice interview already produces, so the
  # Directory can be filtered by intent, not just searched by keyword.
  def change do
    alter table(:profiles) do
      add :looking_for_tags, {:array, :string}, default: [], null: false
      add :can_help_tags, {:array, :string}, default: [], null: false
    end
  end
end
