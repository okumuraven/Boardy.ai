defmodule Vokazi.Repo.Migrations.AddLocationCompanyBioToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :location, :string
      add :company, :string
      add :bio, :text
    end
  end
end
