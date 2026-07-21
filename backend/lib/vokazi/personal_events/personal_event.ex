defmodule Vokazi.PersonalEvents.PersonalEvent do
  use Ecto.Schema
  import Ecto.Changeset

  schema "personal_events" do
    field :title, :string
    field :date, :date
    field :start_time, :time
    field :end_time, :time

    belongs_to :user, Vokazi.Accounts.User

    timestamps()
  end

  @doc false
  def changeset(event, attrs) do
    event
    |> cast(attrs, [:user_id, :title, :date, :start_time, :end_time])
    |> validate_required([:user_id, :title, :date, :start_time, :end_time])
    |> validate_end_after_start()
  end

  defp validate_end_after_start(changeset) do
    start_time = get_field(changeset, :start_time)
    end_time = get_field(changeset, :end_time)

    if start_time && end_time && Time.compare(end_time, start_time) != :gt do
      add_error(changeset, :end_time, "must be after the start time")
    else
      changeset
    end
  end
end
