defmodule Vokazi.Repo.Migrations.CreatePushSubscriptions do
  use Ecto.Migration

  def change do
    create table(:push_subscriptions) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :endpoint, :text, null: false
      add :p256dh_key, :string, null: false
      add :auth_key, :string, null: false

      timestamps()
    end

    # A user can have more than one subscription (e.g. two browsers),
    # but the same browser subscription should never be stored twice.
    create unique_index(:push_subscriptions, [:endpoint])
    create index(:push_subscriptions, [:user_id])
  end
end
