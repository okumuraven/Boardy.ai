defmodule Vokazi.Admin.FeatureAnnouncement do
  use Ecto.Schema
  import Ecto.Changeset

  schema "feature_announcements" do
    field :title, :string
    field :message, :string

    belongs_to :sent_by_admin, Vokazi.Accounts.User

    timestamps(updated_at: false)
  end

  @doc false
  def changeset(announcement, attrs) do
    announcement
    |> cast(attrs, [:title, :message, :sent_by_admin_id])
    |> validate_required([:title, :message])
  end
end
