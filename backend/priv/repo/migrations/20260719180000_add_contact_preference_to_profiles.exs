defmodule Vokazi.Repo.Migrations.AddContactPreferenceToProfiles do
  use Ecto.Migration

  def change do
    alter table(:profiles) do
      # AI-inferred from the voice-interview transcript ("call" | "video" |
      # "chat") - the default shown on the scheduling briefing card,
      # editable per introduction without changing this stored default.
      add :contact_preference, :string, default: "call", null: false
    end
  end
end
