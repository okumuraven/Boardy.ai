defmodule Vokazi.Accounts.ProfileMedia do
  @moduledoc """
  Profile photos: one optional avatar (User.avatar_path) plus up to 3
  optional "show your work" business photos (Profile.business_photos),
  gated behind a per-member visibility toggle
  (Profile.business_photos_public). Both are entirely optional - a
  member with neither set just falls back to initials on the frontend,
  same as today.

  Mirrors `Vokazi.Chat.create_attachment/3`'s exact validate-then-store
  shape, just against `Vokazi.Accounts.MediaStorage` instead of
  `Vokazi.Chat.Storage`.
  """

  alias Vokazi.Repo
  alias Vokazi.Accounts.{User, Profile, MediaStorage}

  @max_business_photos 3
  @max_image_bytes 8_000_000
  @allowed_content_types ~w(image/jpeg image/png image/webp)

  @doc """
  Replaces this user's avatar, deleting the previous file (if any) only
  after the new one is safely written and the row is updated - so a
  failed upload never leaves a member with no avatar file on disk.
  """
  def set_avatar(%User{} = user, %Plug.Upload{} = upload) do
    with :ok <- validate_image(upload) do
      storage_path = MediaStorage.save_avatar(upload, user.id)
      previous_path = user.avatar_path

      user
      |> User.avatar_changeset(%{avatar_path: storage_path})
      |> Repo.update()
      |> tap(fn
        {:ok, _user} -> MediaStorage.delete(previous_path)
        {:error, _changeset} -> MediaStorage.delete(storage_path)
      end)
    end
  end

  @doc "Clears this user's avatar and deletes the underlying file."
  def remove_avatar(%User{avatar_path: nil} = user), do: {:ok, user}

  def remove_avatar(%User{} = user) do
    previous_path = user.avatar_path

    user
    |> User.avatar_changeset(%{avatar_path: nil})
    |> Repo.update()
    |> tap(fn
      {:ok, _user} -> MediaStorage.delete(previous_path)
      _ -> :ok
    end)
  end

  @doc """
  Adds one business photo, rejecting a 4th - a member who wants to swap
  one out removes it first, the same "explicit replace, not silent
  eviction" behavior as everywhere else photos are user-managed.
  """
  def add_business_photo(%Profile{} = profile, %Plug.Upload{} = upload) do
    cond do
      length(profile.business_photos) >= @max_business_photos ->
        {:error, :too_many_photos}

      true ->
        with :ok <- validate_image(upload) do
          storage_path = MediaStorage.save_business_photo(upload, profile.user_id)

          profile
          |> Profile.photos_changeset(%{business_photos: profile.business_photos ++ [storage_path]})
          |> Repo.update()
          |> tap(fn
            {:error, _changeset} -> MediaStorage.delete(storage_path)
            _ -> :ok
          end)
        end
    end
  end

  @doc "Removes one business photo by its index in the current list (as returned to the frontend alongside the profile) and deletes the underlying file."
  def remove_business_photo(%Profile{} = profile, index) when is_integer(index) do
    case Enum.at(profile.business_photos, index) do
      nil ->
        {:error, :not_found}

      storage_path ->
        remaining = List.delete_at(profile.business_photos, index)

        profile
        |> Profile.photos_changeset(%{business_photos: remaining})
        |> Repo.update()
        |> tap(fn
          {:ok, _profile} -> MediaStorage.delete(storage_path)
          _ -> :ok
        end)
    end
  end

  @doc "Turns business-photo visibility on/off - the only thing a viewer's Directory card / connect request ever checks before showing them."
  def set_photos_visibility(%Profile{} = profile, public?) when is_boolean(public?) do
    profile
    |> Profile.photos_changeset(%{business_photos_public: public?})
    |> Repo.update()
  end

  defp validate_image(%Plug.Upload{} = upload) do
    %{size: byte_size} = File.stat!(upload.path)

    cond do
      byte_size > @max_image_bytes -> {:error, :file_too_large}
      upload.content_type not in @allowed_content_types -> {:error, :invalid_image_type}
      true -> :ok
    end
  end
end
