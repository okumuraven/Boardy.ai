defmodule Vokazi.Chat.ChatRoom do
  use Ecto.Schema
  import Ecto.Changeset

  schema "chat_rooms" do
    field :is_active, :boolean, default: true
    belongs_to :match, Vokazi.Matchmaking.Match
    has_many :messages, Vokazi.Chat.Message

    timestamps()
  end

  @doc false
  def changeset(chat_room, attrs) do
    chat_room
    |> cast(attrs, [:is_active, :match_id])
    |> validate_required([:is_active, :match_id])
    |> unique_constraint(:match_id)
  end
end
