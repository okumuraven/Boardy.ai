defmodule VokaziWeb.ProfileController do
  use VokaziWeb, :controller

  alias Vokazi.Accounts.{User, Profile}

  @doc "The signed-in user's own full profile - identity always comes from the verified session, never a URL param."
  def show(conn, _params) do
    case Vokazi.Repo.get(User, conn.assigns.current_user_id) |> Vokazi.Repo.preload(:profile) do
      nil ->
        conn |> put_status(404) |> json(%{error: "Not found"})

      user ->
        json(conn, %{
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          industry: user.industry,
          location: user.location,
          company: user.company,
          bio: user.bio,
          onboarding_completed: user.onboarding_completed,
          is_bizi: user.is_bizi,
          offer_text: if(user.profile, do: user.profile.offer_text, else: nil),
          need_text: if(user.profile, do: user.profile.need_text, else: nil),
          phone_number: if(user.profile, do: user.profile.phone_number, else: nil),
          contact_preference: if(user.profile, do: user.profile.contact_preference, else: "call"),
          looking_for_tags: if(user.profile, do: user.profile.looking_for_tags, else: []),
          can_help_tags: if(user.profile, do: user.profile.can_help_tags, else: []),
          avatar_url: if(user.avatar_path, do: "/api/profiles/#{user.id}/avatar", else: nil),
          business_photos: business_photo_urls(user),
          business_photos_public: if(user.profile, do: user.profile.business_photos_public, else: false)
        })
    end
  end

  @doc """
  Completes/edits the signed-in user's own profile details (name, role,
  industry, company, location, bio, phone, contact preference). Never
  creates a *new* account - that only ever happens via
  `VokaziWeb.AuthController.google_signin/2` - this always operates on
  `conn.assigns.current_user_id`, the account the verified session
  belongs to.
  """
  def update(conn, params) do
    user_id = conn.assigns.current_user_id
    user = Vokazi.Repo.get!(User, user_id)

    user_changeset =
      User.changeset(user, %{
        full_name: params["full_name"],
        role: params["role"],
        industry: params["industry"],
        location: params["location"],
        company: params["company"],
        bio: params["bio"],
        onboarding_completed: true
      })

    Vokazi.Repo.transaction(fn ->
      case Vokazi.Repo.update(user_changeset) do
        {:ok, updated_user} ->
          profile = Vokazi.Repo.get_by(Profile, user_id: updated_user.id) || %Profile{user_id: updated_user.id}

          # contact_preference is only ever set here when the caller (the
          # Profile edit view) actually sends one - never overwrite the
          # AI-inferred value from the voice interview with a blank one
          # just because an older caller (initial onboarding) doesn't know
          # about this field.
          profile_attrs = %{phone_number: params["phone_number"], user_id: updated_user.id}

          profile_attrs =
            if params["contact_preference"],
              do: Map.put(profile_attrs, :contact_preference, params["contact_preference"]),
              else: profile_attrs

          profile_changeset = Profile.changeset(profile, profile_attrs)

          case Vokazi.Repo.insert_or_update(profile_changeset) do
            {:ok, _} -> updated_user
            {:error, reason} -> Vokazi.Repo.rollback(reason)
          end

        {:error, reason} ->
          Vokazi.Repo.rollback(reason)
      end
    end)
    |> case do
      {:ok, user} ->
        json(conn, %{
          id: user.id,
          full_name: user.full_name,
          role: user.role,
          onboarding_completed: user.onboarding_completed
        })

      {:error, %Ecto.Changeset{} = changeset} ->
        error_msg =
          Enum.reduce(changeset.errors, "Validation failed", fn {field, {msg, _}}, _acc ->
            "#{field} #{msg}"
          end)

        conn |> put_status(400) |> json(%{error: error_msg})

      {:error, reason} ->
        IO.inspect(reason, label: "DB_ERROR")
        conn |> put_status(500) |> json(%{error: "Database error", details: inspect(reason)})
    end
  end

  # A member always sees the full list of their own business photos here
  # regardless of business_photos_public - that flag only gates what
  # *other* members see (Vokazi.Directory.to_member/3), never the owner's
  # own view of their own data.
  defp business_photo_urls(%User{profile: nil}), do: []

  defp business_photo_urls(%User{id: user_id, profile: profile}) do
    profile.business_photos
    |> Enum.with_index()
    |> Enum.map(fn {_path, index} -> "/api/profiles/#{user_id}/business_photos/#{index}" end)
  end

  # Local dev bypass to simulate Vapi Webhook + OpenAI Embeddings - always
  # targets the signed-in user's own profile now, same as every other
  # authenticated route (previously took an arbitrary `:id` param).
  def sync_mock(conn, _params) do
    profile = Vokazi.Repo.get_by(Profile, user_id: conn.assigns.current_user_id)

    if profile do
      mock_vector = Pgvector.new(for _ <- 1..1536, do: :rand.uniform() |> Float.round(4))

      changeset =
        Profile.changeset(profile, %{
          offer_text: "I run a logistics company handling last-mile delivery for retailers across three counties.",
          need_text: "Looking for a lender who understands seasonal cash-flow gaps in logistics.",
          contact_preference: "call",
          offer_vector: mock_vector,
          need_vector: mock_vector
        })

      Vokazi.Repo.update!(changeset)
      json(conn, %{success: true})
    else
      conn |> put_status(404) |> json(%{error: "Profile not found"})
    end
  end

  # Real data pipeline bypassing Vapi webhooks - same self-only scoping as sync_mock/2 above.
  def sync_real_transcript(conn, %{"transcript" => transcript}) do
    user_id = conn.assigns.current_user_id
    profile = Vokazi.Repo.get_by(Profile, user_id: user_id)

    if profile do
      {offer, need, contact_preference} =
        case Vokazi.AI.extract_summary(transcript) do
          {:ok, o, n, pref} ->
            {o, n, pref}

          _ ->
            fallback = "Raw Transcript Captured: " <> String.slice(transcript, 0, 500) <> "..."
            {fallback, fallback, "call"}
        end

      changeset =
        Profile.changeset(profile, %{
          raw_transcript: transcript,
          offer_text: offer,
          need_text: need,
          contact_preference: contact_preference
        })

      updated_profile = Vokazi.Repo.update!(changeset)

      Task.start(fn ->
        case Vokazi.AI.generate_embedding(transcript) do
          {:ok, vector} ->
            vector_changeset = Profile.changeset(updated_profile, %{offer_vector: vector, need_vector: vector})
            Vokazi.Repo.update!(vector_changeset)
            IO.puts("Successfully generated REAL Gemini vector for user #{user_id}")

          _ ->
            IO.puts("Failed to generate Gemini vector")
        end
      end)

      json(conn, %{success: true})
    else
      conn |> put_status(404) |> json(%{error: "Profile not found"})
    end
  end
end
