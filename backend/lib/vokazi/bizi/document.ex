defmodule Vokazi.Bizi.Document do
  use Ecto.Schema
  import Ecto.Changeset

  # Kuzana's own real DD document ask (bizi_verification.md stage 5) -
  # not an open free-text field, so the admin detail view can render a
  # fixed "tag this as..." choice instead of staff typing labels by hand.
  @types ["management_accounts", "cr12", "purchase_sales_docs", "other"]

  schema "bizi_application_documents" do
    field :document_type, :string

    belongs_to :bizi_application, Vokazi.Bizi.Application
    belongs_to :message_attachment, Vokazi.Chat.Attachment
    belongs_to :tagged_by_admin, Vokazi.Accounts.User

    timestamps()
  end

  def types, do: @types

  @doc false
  def changeset(document, attrs) do
    document
    |> cast(attrs, [:bizi_application_id, :message_attachment_id, :document_type, :tagged_by_admin_id])
    |> validate_required([:bizi_application_id, :message_attachment_id, :document_type])
    |> validate_inclusion(:document_type, @types)
    |> unique_constraint(:message_attachment_id)
  end
end
