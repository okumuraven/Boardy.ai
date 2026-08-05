defmodule Vokazi.Accounts.MediaStorage do
  @moduledoc """
  Local-disk storage for profile media (avatars + optional business
  photos), mirroring `Vokazi.Chat.Storage`'s exact pattern. Files live
  under <uploads_dir>/avatars/<user_id>/ and
  <uploads_dir>/business_photos/<user_id>/, outside priv/static so
  `Plug.Static` never serves them directly - every read goes through
  `VokaziWeb.ProfileMediaController`'s owner-or-public gate instead.
  Shares its root with `Vokazi.Chat.Storage` so one Fly volume mount
  covers every kind of user upload.
  """

  @doc "Persists an uploaded avatar under this user's directory. Returns the relative storage_path to record on the User row."
  def save_avatar(%Plug.Upload{} = upload, user_id), do: save(upload, "avatars", user_id)

  @doc "Persists an uploaded business photo under this user's directory. Returns the relative storage_path to append to the Profile's business_photos array."
  def save_business_photo(%Plug.Upload{} = upload, user_id), do: save(upload, "business_photos", user_id)

  @doc "Absolute path on disk for a stored storage_path, for the serving action to send_file/3 from."
  def absolute_path(storage_path), do: Path.join(root_dir(), storage_path)

  @doc "Deletes a previously-stored file, if it exists - used both when replacing an avatar and when removing a business photo."
  def delete(nil), do: :ok

  def delete(storage_path) do
    File.rm(absolute_path(storage_path))
    :ok
  end

  defp save(%Plug.Upload{path: tmp_path, filename: filename}, kind, user_id) do
    dir = Path.join([root_dir(), kind, to_string(user_id)])
    File.mkdir_p!(dir)

    # A random prefix, not the original filename alone - re-uploading a
    # file named "photo.jpg" twice must not collide with the previous
    # one still referenced elsewhere. Path.basename/1 also strips any
    # directory components a hostile filename might carry.
    safe_name = "#{random_prefix()}-#{Path.basename(filename)}"
    dest = Path.join(dir, safe_name)
    File.cp!(tmp_path, dest)

    Path.join([kind, to_string(user_id), safe_name])
  end

  defp root_dir do
    Application.get_env(:vokazi, :uploads_dir) || Path.join(:code.priv_dir(:vokazi), "uploads")
  end

  defp random_prefix, do: :crypto.strong_rand_bytes(8) |> Base.url_encode64(padding: false)
end
