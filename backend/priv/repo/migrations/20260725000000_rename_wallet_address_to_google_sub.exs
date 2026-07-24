defmodule Vokazi.Repo.Migrations.RenameWalletAddressToGoogleSub do
  use Ecto.Migration

  def change do
    rename table(:users), :wallet_address, to: :google_sub

    # Postgres doesn't rename the index automatically when the column
    # it's on is renamed - do it explicitly so the constraint name
    # matches what `Profile.changeset/2`'s `unique_constraint/2` expects
    # by convention (`users_google_sub_index`), not the stale name.
    execute "ALTER INDEX users_wallet_address_index RENAME TO users_google_sub_index",
            "ALTER INDEX users_google_sub_index RENAME TO users_wallet_address_index"
  end
end
