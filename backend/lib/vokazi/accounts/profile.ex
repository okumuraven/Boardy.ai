defmodule Vokazi.Accounts.Profile do
  use Ecto.Schema
  import Ecto.Changeset

  schema "profiles" do
    field :phone_number, :string
    field :raw_transcript, :string
    field :need_text, :string
    field :offer_text, :string
    field :need_vector, Pgvector.Ecto.Vector
    field :offer_vector, Pgvector.Ecto.Vector
    # AI-inferred from the voice-interview transcript ("call" | "video" |
    # "chat") - the default shown on the scheduling briefing card.
    field :contact_preference, :string, default: "call"
    # Auto-extracted (Vokazi.AI.extract_tags/2) from offer_text/need_text -
    # what the Directory (Vokazi.Directory) filters on, separate from the
    # free-text semantic matching pgvector already does.
    field :looking_for_tags, {:array, :string}, default: []
    field :can_help_tags, {:array, :string}, default: []

    belongs_to :user, Vokazi.Accounts.User

    timestamps()
  end

  # Closed set - drawn directly from what Kuzana's own members named in
  # kuzana_connect_discovery.md ("What they are looking for"). Any tag
  # outside this set is either an AI extraction bug or a hand-crafted
  # request that doesn't belong in a filterable field.
  @connection_tags ["funding", "customers", "partners", "mentors", "hiring"]

  def connection_tags, do: @connection_tags

  @doc false
  def changeset(profile, attrs) do
    profile
    |> cast(attrs, [
      :phone_number,
      :raw_transcript,
      :need_text,
      :offer_text,
      :need_vector,
      :offer_vector,
      :contact_preference,
      :looking_for_tags,
      :can_help_tags,
      :user_id
    ])
    |> validate_required([:user_id, :phone_number])
    |> validate_inclusion(:contact_preference, ["call", "video", "chat"])
    |> validate_tags(:looking_for_tags)
    |> validate_tags(:can_help_tags)
    |> unique_constraint(:user_id)
    |> unique_constraint(:phone_number, message: "is already registered to another account")
  end

  defp validate_tags(changeset, field) do
    validate_change(changeset, field, fn ^field, tags ->
      invalid = Enum.reject(tags, &(&1 in @connection_tags))
      if invalid == [], do: [], else: [{field, "contains invalid tags: #{Enum.join(invalid, ", ")}"}]
    end)
  end
end
