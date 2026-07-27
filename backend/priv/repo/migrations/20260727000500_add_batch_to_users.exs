defmodule Vokazi.Repo.Migrations.AddBatchToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :batch, :string
    end
  end
end
