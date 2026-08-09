defmodule Vokazi.Chat do
  @moduledoc """
  The Chat context.
  """
  import Ecto.Query, warn: false
  alias Vokazi.Repo
  alias Vokazi.Chat.{ChatRoom, Message, Attachment, Storage}
  alias Vokazi.Matchmaking.Match
  alias Vokazi.Bizi.Application
  alias Vokazi.Accounts.User
  alias Vokazi.Notifications

  # Plug.Parsers' own :multipart :length cap (8MB by default) already
  # bounds any single upload, but that default lives in endpoint config
  # and could drift independently of this - checking again here means
  # this module's contract doesn't depend on remembering that link.
  @max_attachment_bytes 15_000_000

  def create_chat_room(attrs \\ %{}) do
    %ChatRoom{}
    |> ChatRoom.changeset(attrs)
    |> Repo.insert()
  end

  def get_chat_room!(id), do: Repo.get!(ChatRoom, id)

  def get_chat_room_by_match_id!(match_id) do
    Repo.get_by!(ChatRoom, match_id: match_id)
  end

  @doc """
  Whether `user_id` is allowed to join or send in this room - the only
  person on either a match chat, or (the applicant OR any active admin)
  on a Bizi verification chat (bizi_verification_build_plan.md §Phase C).
  """
  def participant?(room_id, user_id) do
    case Repo.get(ChatRoom, room_id) do
      nil -> false
      %ChatRoom{match_id: match_id} when not is_nil(match_id) -> match_participant?(match_id, user_id)
      %ChatRoom{bizi_application_id: application_id} -> bizi_participant?(application_id, user_id)
    end
  end

  defp match_participant?(match_id, user_id) do
    Repo.exists?(from(m in Match, where: m.id == ^match_id and (m.user_a_id == ^user_id or m.user_b_id == ^user_id)))
  end

  defp bizi_participant?(application_id, user_id) do
    Repo.exists?(from(a in Application, where: a.id == ^application_id and a.user_id == ^user_id)) or
      Repo.exists?(from(u in User, where: u.id == ^user_id and not is_nil(u.admin_role) and u.admin_status == "active"))
  end

  @doc """
  Saves a message, optionally attaching a file uploaded moments earlier
  via `create_attachment/3` (pass its id as `:attachment_id`). Also fires
  an in-app notification for the recipient if they aren't currently
  connected to this room's channel - this is the single choke point for
  that check, since both real chat messages
  (`ChatRoomChannel.handle_in/3`) and `Vokazi.Scheduling`'s reminder
  nudges both funnel through this one function. Pass
  `notification_type: "calendar_reminder"` in `attrs` for the latter -
  it's read here but never persisted onto the `Message` itself
  (`Message.changeset/2`'s cast allowlist simply ignores it), only used
  to decide what kind of notification (if any) to fire.

  Rejects a truly-empty send (no text and no attachment) up front,
  before either the changeset or the attach step ever runs.
  """
  def create_message(attrs \\ %{}) do
    notification_type = Map.get(attrs, :notification_type) || "chat_message"
    attachment_id = Map.get(attrs, :attachment_id)
    reply_to_id = Map.get(attrs, :reply_to_id)
    chat_room_id = Map.get(attrs, :chat_room_id)
    content = (Map.get(attrs, :content) || "") |> to_string() |> String.trim()

    cond do
      content == "" and is_nil(attachment_id) ->
        {:error, :empty_message}

      not valid_reply_to?(reply_to_id, chat_room_id) ->
        {:error, :invalid_reply_to}

      true ->
        attrs
        |> Map.put(:content, content)
        |> do_create_message(attachment_id, notification_type)
    end
  end

  # A reply can only ever quote a message already sitting in the SAME
  # room - the FK alone would happily accept any message id in the
  # table, letting someone quote a private message from a room they
  # aren't even a participant in.
  defp valid_reply_to?(nil, _chat_room_id), do: true

  defp valid_reply_to?(reply_to_id, chat_room_id) do
    Repo.exists?(from(m in Message, where: m.id == ^reply_to_id and m.chat_room_id == ^chat_room_id))
  end

  defp do_create_message(attrs, attachment_id, notification_type) do
    Repo.transaction(fn ->
      with {:ok, message} <- %Message{} |> Message.changeset(attrs) |> Repo.insert(),
           {:ok, _attachment} <- maybe_attach(attachment_id, message) do
        message
        |> Repo.preload([:sender, :attachment, reply_to: :sender])
        |> tap(&notify_recipient_if_absent(&1, notification_type))
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp maybe_attach(nil, _message), do: {:ok, nil}

  defp maybe_attach(attachment_id, message) do
    case Repo.get(Attachment, attachment_id) do
      nil ->
        {:error, :attachment_not_found}

      %Attachment{message_id: message_id} when not is_nil(message_id) ->
        {:error, :attachment_already_used}

      %Attachment{chat_room_id: room_id} when room_id != message.chat_room_id ->
        {:error, :attachment_room_mismatch}

      %Attachment{uploaded_by_id: uploader_id} when uploader_id != message.sender_id ->
        {:error, :attachment_not_owned}

      attachment ->
        attachment |> Attachment.attach_changeset(message.id) |> Repo.update()
    end
  end

  @doc """
  Persists an uploaded file to disk and records it, unattached to any
  message yet (see the migration's note on why `chat_room_id` alone has
  to be enough to gate this). `create_message/1` links it to a real
  message right after, in the same request from the caller's point of
  view.
  """
  def create_attachment(%Plug.Upload{} = upload, chat_room_id, uploaded_by_id) do
    %{size: byte_size} = File.stat!(upload.path)

    if byte_size > @max_attachment_bytes do
      {:error, :file_too_large}
    else
      storage_path = Storage.save(upload, chat_room_id)

      %Attachment{}
      |> Attachment.upload_changeset(%{
        chat_room_id: chat_room_id,
        uploaded_by_id: uploaded_by_id,
        filename: Path.basename(upload.filename),
        content_type: upload.content_type || "application/octet-stream",
        byte_size: byte_size,
        storage_path: storage_path
      })
      |> Repo.insert()
    end
  end

  def get_attachment(id), do: Repo.get(Attachment, id)

  # Bizi verification rooms have no single fixed "other side" to notify -
  # any of several active admins could be the one who should see it, and
  # building that fan-out isn't asked for yet (bizi_verification_build_plan.md
  # leaves this to a later phase's reminder worker). Staff and applicants
  # both currently rely on checking the admin panel / Profile tab directly.
  defp notify_recipient_if_absent(message, notification_type) do
    room = Repo.get!(ChatRoom, message.chat_room_id)
    if room.match_id, do: notify_match_recipient(room, message, notification_type)
  end

  defp notify_match_recipient(room, message, notification_type) do
    match = Repo.get!(Match, room.match_id)
    recipient_id = if match.user_a_id == message.sender_id, do: match.user_b_id, else: match.user_a_id

    present? =
      "chat_room:#{room.id}"
      |> VokaziWeb.Presence.list()
      |> Map.has_key?(to_string(recipient_id))

    unless present? do
      preview = message_preview(message)

      # Carries everything the frontend needs to land the recipient
      # somewhere useful - the chat room, but also the match (so the
      # "Schedule Intro Call" button has what it needs), the sender's
      # name (so the header shows a real person instead of "Your
      # match"), and whether to open straight into the scheduling
      # screen rather than the raw chat thread.
      link =
        Jason.encode!(%{
          room_id: room.id,
          match_id: match.id,
          partner_name: message.sender.full_name,
          open_scheduling: notification_type == "calendar_reminder"
        })

      Notifications.notify(recipient_id, notification_type, notification_body(notification_type, message, preview), link)
    end
  end

  # A reminder's content ("🔔 Reminder from X: ...") already names the
  # sender in third person - prefixing it again with "X: " would repeat
  # the name twice. Regular messages still get the "Sender: preview"
  # convention.
  defp notification_body("calendar_reminder", _message, preview), do: preview
  defp notification_body(_type, message, preview), do: "#{message.sender.full_name}: #{preview}"

  defp message_preview(%{content: ""} = message) do
    case message.attachment do
      %Attachment{filename: filename} -> "📎 #{filename}"
      _ -> "📎 sent an attachment"
    end
  end

  defp message_preview(message), do: String.slice(message.content, 0, 80)

  @doc """
  Most recent `limit` messages in a room, oldest-first (ready to render
  top-to-bottom) - not the full history, so a long-lived room never ships
  its entire backlog on every join/reconnect.
  """
  def list_recent_messages(room_id, limit \\ 50) do
    Message
    |> where([m], m.chat_room_id == ^room_id)
    |> order_by([m], desc: m.id)
    |> limit(^limit)
    |> preload([:sender, :attachment, reply_to: :sender])
    |> Repo.all()
    |> Enum.reverse()
  end

  @doc """
  Keyset pagination for scrolling further back - messages strictly before
  `before_id`, oldest-first, ready to prepend to what's already loaded.
  """
  def list_messages_before(room_id, before_id, limit \\ 50) do
    Message
    |> where([m], m.chat_room_id == ^room_id and m.id < ^before_id)
    |> order_by([m], desc: m.id)
    |> limit(^limit)
    |> preload([:sender, :attachment, reply_to: :sender])
    |> Repo.all()
    |> Enum.reverse()
  end
end
