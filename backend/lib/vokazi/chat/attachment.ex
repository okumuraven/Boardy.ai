defmodule Vokazi.Chat.Attachment do
  use Ecto.Schema
  import Ecto.Changeset

  schema "message_attachments" do
    field :filename, :string
    field :content_type, :string
    field :byte_size, :integer
    field :storage_path, :string

    belongs_to :chat_room, Vokazi.Chat.ChatRoom
    belongs_to :message, Vokazi.Chat.Message
    belongs_to :uploaded_by, Vokazi.Accounts.User

    timestamps()
  end

  @doc "Created at upload time (`Vokazi.Chat.Storage.save/3`), before the message that will reference it exists."
  def upload_changeset(attachment, attrs) do
    attachment
    |> cast(attrs, [:chat_room_id, :uploaded_by_id, :filename, :content_type, :byte_size, :storage_path])
    |> validate_required([:chat_room_id, :uploaded_by_id, :filename, :content_type, :byte_size, :storage_path])
  end

  @doc "Links a previously-uploaded attachment to the message it belongs to - see `Vokazi.Chat.maybe_attach/2`."
  def attach_changeset(attachment, message_id) do
    attachment
    |> cast(%{message_id: message_id}, [:message_id])
    |> validate_required([:message_id])
  end
end
