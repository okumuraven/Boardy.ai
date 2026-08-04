defmodule Vokazi.Chat.ChatRoom do
  use Ecto.Schema
  import Ecto.Changeset

  schema "chat_rooms" do
    field :is_active, :boolean, default: true
    belongs_to :match, Vokazi.Matchmaking.Match
    belongs_to :bizi_application, Vokazi.Bizi.Application
    has_many :messages, Vokazi.Chat.Message

    timestamps()
  end

  @doc false
  def changeset(chat_room, attrs) do
    chat_room
    |> cast(attrs, [:is_active, :match_id, :bizi_application_id])
    |> validate_required([:is_active])
    |> validate_exactly_one_lineage()
    |> unique_constraint(:match_id)
    |> unique_constraint(:bizi_application_id)
  end

  # A room belongs to exactly one lineage - a match chat or a Bizi
  # verification thread, never both, never neither. The DB's own check
  # constraint (see the migration) is the real enforcement; this just
  # gives a readable changeset error instead of a raw Postgrex one.
  defp validate_exactly_one_lineage(changeset) do
    match_id = get_field(changeset, :match_id)
    bizi_application_id = get_field(changeset, :bizi_application_id)

    case {match_id, bizi_application_id} do
      {nil, nil} -> add_error(changeset, :match_id, "must belong to either a match or a Bizi application")
      {m, b} when not is_nil(m) and not is_nil(b) -> add_error(changeset, :match_id, "cannot belong to both a match and a Bizi application")
      _ -> changeset
    end
  end
end
