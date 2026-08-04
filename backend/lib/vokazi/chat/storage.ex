defmodule Vokazi.Chat.Storage do
  @moduledoc """
  Local-disk storage for chat attachments (Phase B,
  bizi_verification_build_plan.md). Files live under
  priv/chat_attachments/<room_id>/, outside priv/static so
  `Plug.Static`'s fixed `only:` allowlist never serves them directly -
  every read has to go through `VokaziWeb.ChatAttachmentController`'s
  participant check instead. Not solved here: this needs a persistent
  Fly volume in production, same open note as `bizi_verification_system.md`
  already carries for this exact gap.
  """

  @doc "Persists an uploaded file under its room's directory. Returns the relative `storage_path` to record on the Attachment row."
  def save(%Plug.Upload{path: tmp_path, filename: filename}, chat_room_id) do
    dir = room_dir(chat_room_id)
    File.mkdir_p!(dir)

    # A random prefix, not the original filename alone - two people in
    # the same room uploading "invoice.pdf" minutes apart must not
    # collide or overwrite each other on disk. Path.basename/1 also
    # strips any directory components a hostile filename might carry.
    safe_name = "#{random_prefix()}-#{Path.basename(filename)}"
    dest = Path.join(dir, safe_name)
    File.cp!(tmp_path, dest)

    Path.join(to_string(chat_room_id), safe_name)
  end

  @doc "Absolute path on disk for a stored `storage_path`, for the download action to `send_file/3` from."
  def absolute_path(storage_path), do: Path.join(root_dir(), storage_path)

  defp room_dir(chat_room_id), do: Path.join(root_dir(), to_string(chat_room_id))

  defp root_dir do
    Application.get_env(:vokazi, :chat_attachments_dir) ||
      Path.join(:code.priv_dir(:vokazi), "chat_attachments")
  end

  defp random_prefix, do: :crypto.strong_rand_bytes(8) |> Base.url_encode64(padding: false)
end
