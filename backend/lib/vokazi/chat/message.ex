defmodule Vokazi.Chat.Message do
  use Ecto.Schema
  import Ecto.Changeset

  schema "messages" do
    field :content, :string
    belongs_to :chat_room, Vokazi.Chat.ChatRoom
    belongs_to :sender, Vokazi.Accounts.User
    has_one :attachment, Vokazi.Chat.Attachment
    # Optional - the WhatsApp-style "swipe to reply" quote. Always
    # validated (Vokazi.Chat.create_message/1) to point at a message in
    # the SAME chat_room as this one, before this ever reaches the DB -
    # the FK alone doesn't stop someone quoting a message from a room
    # they're not even in.
    belongs_to :reply_to, __MODULE__

    timestamps()
  end

  @max_content_length 4_000

  # `:content` is deliberately not in validate_required - an
  # attachment-only send has none, and `Vokazi.Chat.create_message/1`
  # already rejects the truly-empty case (no text AND no attachment)
  # before this changeset ever runs. The `content :text null: false` DB
  # column stays satisfied because that same function normalizes a
  # missing/blank value to "" rather than nil - but `cast/3` defaults
  # `empty_values: [""]`, which treats an explicit "" as *absent* and
  # silently skips it, leaving the struct's own nil in place and hitting
  # the NOT NULL constraint at the SQL level instead (caught only by
  # actually sending an attachment-only message, not by reading this).
  # `empty_values: []` makes "" a real, castable value again.
  @doc false
  def changeset(message, attrs) do
    message
    |> cast(attrs, [:content, :chat_room_id, :sender_id, :reply_to_id], empty_values: [])
    |> update_change(:content, &(&1 && String.trim(&1)))
    |> validate_required([:chat_room_id, :sender_id])
    |> validate_length(:content, max: @max_content_length)
  end
end
