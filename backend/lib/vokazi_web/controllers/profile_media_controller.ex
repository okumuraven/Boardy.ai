defmodule VokaziWeb.ProfileMediaController do
  use VokaziWeb, :controller

  alias Vokazi.Repo
  alias Vokazi.Accounts.{User, Profile, ProfileMedia, MediaStorage}

  @doc "Uploads/replaces the current member's avatar."
  def upload_avatar(conn, %{"file" => %Plug.Upload{} = upload}) do
    user = Repo.get!(User, conn.assigns.current_user_id)

    case ProfileMedia.set_avatar(user, upload) do
      {:ok, user} -> json(conn, %{avatar_url: avatar_url(user)})
      {:error, reason} -> error_response(conn, reason)
    end
  end

  def upload_avatar(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "Missing file."})
  end

  @doc "Removes the current member's avatar."
  def delete_avatar(conn, _params) do
    user = Repo.get!(User, conn.assigns.current_user_id)

    case ProfileMedia.remove_avatar(user) do
      {:ok, _user} -> json(conn, %{avatar_url: nil})
      {:error, reason} -> error_response(conn, reason)
    end
  end

  @doc "Streams a member's avatar - avatars are visible to any signed-in member, same as the rest of the Directory."
  def show_avatar(conn, %{"user_id" => user_id}) do
    case Repo.get(User, user_id) do
      %User{avatar_path: path} when not is_nil(path) ->
        send_image(conn, path)

      _ ->
        conn |> put_status(:not_found) |> json(%{error: "No avatar."})
    end
  end

  @doc "Adds one business photo to the current member's profile (max 3)."
  def add_business_photo(conn, %{"file" => %Plug.Upload{} = upload}) do
    with_own_profile(conn, fn profile ->
      case ProfileMedia.add_business_photo(profile, upload) do
        {:ok, profile} -> json(conn, %{business_photos: photo_urls(profile)})
        {:error, reason} -> error_response(conn, reason)
      end
    end)
  end

  def add_business_photo(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "Missing file."})
  end

  @doc "Removes one business photo by its current index."
  def remove_business_photo(conn, %{"index" => index}) do
    with_own_profile(conn, fn profile ->
      case ProfileMedia.remove_business_photo(profile, String.to_integer(index)) do
        {:ok, profile} -> json(conn, %{business_photos: photo_urls(profile)})
        {:error, reason} -> error_response(conn, reason)
      end
    end)
  end

  @doc "Toggles whether the current member's business photos are visible to other members."
  def set_visibility(conn, %{"public" => public?}) do
    with_own_profile(conn, fn profile ->
      case ProfileMedia.set_photos_visibility(profile, !!public?) do
        {:ok, profile} -> json(conn, %{business_photos_public: profile.business_photos_public})
        {:error, reason} -> error_response(conn, reason)
      end
    end)
  end

  @doc "Streams a business photo - visible to its owner always, or to anyone once that member has switched visibility on."
  def show_business_photo(conn, %{"user_id" => user_id, "index" => index}) do
    with %Profile{} = profile <- Repo.get_by(Profile, user_id: user_id),
         true <- profile.business_photos_public or profile.user_id == conn.assigns.current_user_id,
         path when not is_nil(path) <- Enum.at(profile.business_photos, String.to_integer(index)) do
      send_image(conn, path)
    else
      _ -> conn |> put_status(:not_found) |> json(%{error: "Photo not found."})
    end
  end

  # Business photos live on Profile, which doesn't exist yet for a
  # member who hasn't completed ProfileSetup (it requires a phone
  # number) - guard here rather than let ProfileMedia's functions crash
  # on a nil profile.
  defp with_own_profile(conn, fun) do
    case Repo.get_by(Profile, user_id: conn.assigns.current_user_id) do
      nil -> conn |> put_status(:unprocessable_entity) |> json(%{error: "Complete your profile setup first."})
      profile -> fun.(profile)
    end
  end

  defp send_image(conn, storage_path) do
    conn
    |> put_resp_content_type(MIME.from_path(storage_path))
    |> send_file(200, MediaStorage.absolute_path(storage_path))
  end

  defp avatar_url(%User{avatar_path: nil}), do: nil
  defp avatar_url(%User{id: id, avatar_path: _path}), do: "/api/profiles/#{id}/avatar"

  defp photo_urls(%Profile{user_id: user_id, business_photos: photos}) do
    photos
    |> Enum.with_index()
    |> Enum.map(fn {_path, index} -> "/api/profiles/#{user_id}/business_photos/#{index}" end)
  end

  defp error_response(conn, :file_too_large),
    do: conn |> put_status(:payload_too_large) |> json(%{error: "Image is too large (max 8MB)."})

  defp error_response(conn, :invalid_image_type),
    do: conn |> put_status(:unprocessable_entity) |> json(%{error: "Only JPEG, PNG, or WebP images are allowed."})

  defp error_response(conn, :too_many_photos),
    do: conn |> put_status(:unprocessable_entity) |> json(%{error: "You can only add up to 3 business photos."})

  defp error_response(conn, :not_found),
    do: conn |> put_status(:not_found) |> json(%{error: "Photo not found."})

  defp error_response(conn, %Ecto.Changeset{} = changeset),
    do: conn |> put_status(:unprocessable_entity) |> json(%{error: VokaziWeb.ChangesetErrors.format(changeset)})
end
