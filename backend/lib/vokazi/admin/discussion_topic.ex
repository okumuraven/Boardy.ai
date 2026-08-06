defmodule Vokazi.Admin.DiscussionTopic do
  use Ecto.Schema
  import Ecto.Changeset

  schema "discussion_topics" do
    field :title, :string
    field :body, :string

    belongs_to :posted_by_admin, Vokazi.Accounts.User

    timestamps(updated_at: false)
  end

  @doc false
  def changeset(topic, attrs) do
    topic
    |> cast(attrs, [:title, :body, :posted_by_admin_id])
    |> validate_required([:title, :body])
  end
end
