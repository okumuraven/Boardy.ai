defmodule Vokazi.Feedback.Submission do
  use Ecto.Schema
  import Ecto.Changeset

  schema "feedback" do
    field :rating, :integer
    field :message, :string

    belongs_to :user, Vokazi.Accounts.User

    timestamps(updated_at: false)
  end

  @doc false
  def changeset(submission, attrs) do
    submission
    |> cast(attrs, [:user_id, :rating, :message])
    |> validate_required([:user_id, :rating])
    |> validate_inclusion(:rating, 1..5)
  end
end
