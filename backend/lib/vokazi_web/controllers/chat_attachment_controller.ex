defmodule VokaziWeb.ChatAttachmentController do
  use VokaziWeb, :controller

  alias Vokazi.Chat

  @doc "Uploads a file to a chat room ahead of the message that will reference it - see the migration's note on why this has to be a separate HTTP step from the channel-only chat protocol."
  def create(conn, %{"id" => room_id, "file" => %Plug.Upload{} = upload}) do
    user_id = conn.assigns.current_user_id
    room_id = String.to_integer(room_id)

    if Chat.participant?(room_id, user_id) do
      case Chat.create_attachment(upload, room_id, user_id) do
        {:ok, attachment} ->
          json(conn, %{
            id: attachment.id,
            filename: attachment.filename,
            content_type: attachment.content_type,
            byte_size: attachment.byte_size
          })

        {:error, :file_too_large} ->
          conn |> put_status(:payload_too_large) |> json(%{error: "File is too large."})

        {:error, changeset} ->
          conn |> put_status(:unprocessable_entity) |> json(%{error: VokaziWeb.ChangesetErrors.format(changeset)})
      end
    else
      conn |> put_status(:forbidden) |> json(%{error: "Not a participant in this chat room."})
    end
  rescue
    ArgumentError -> conn |> put_status(:not_found) |> json(%{error: "Chat room not found."})
  end

  def create(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "Missing file."})
  end

  @doc "Streams a previously-uploaded attachment back, gated the same way sending one is - must be a participant in its room."
  def show(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Chat.get_attachment(id) do
      nil ->
        conn |> put_status(:not_found) |> json(%{error: "Attachment not found."})

      attachment ->
        if Chat.participant?(attachment.chat_room_id, user_id) do
          conn
          |> put_resp_content_type(attachment.content_type)
          |> put_resp_header("content-disposition", disposition(attachment))
          |> send_file(200, Vokazi.Chat.Storage.absolute_path(attachment.storage_path))
        else
          conn |> put_status(:forbidden) |> json(%{error: "Not a participant in this chat room."})
        end
    end
  end

  # Images render inline in the chat bubble; everything else downloads -
  # a browser trying to inline-render, say, a .zip is worse UX than a
  # save-as prompt.
  defp disposition(attachment) do
    kind = if String.starts_with?(attachment.content_type, "image/"), do: "inline", else: "attachment"
    safe_filename = String.replace(attachment.filename, "\"", "'")
    ~s(#{kind}; filename="#{safe_filename}")
  end
end
