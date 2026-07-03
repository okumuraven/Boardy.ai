defmodule BoardyWeb.ProfileController do
  use BoardyWeb, :controller

  alias Boardy.Accounts.{User, Profile}

  def show(conn, %{"id" => wallet_address}) do
    case Boardy.Repo.get_by(User, wallet_address: wallet_address) |> Boardy.Repo.preload(:profile) do
      nil ->
        conn |> put_status(404) |> json(%{error: "Not found"})
      user ->
        # Just return the basics needed by the frontend App.jsx
        json(conn, %{
          id: user.id,
          wallet_address: user.wallet_address,
          full_name: user.full_name,
          role: user.role,
          onboarding_completed: user.onboarding_completed,
          offer_text: if(user.profile, do: user.profile.offer_text, else: nil),
          need_text: if(user.profile, do: user.profile.need_text, else: nil)
        })
    end
  end

  def create(conn, params) do
    wallet_address = params["wallet_address"]
    
    # 1. Try to find the user by wallet address or create an empty struct
    user = Boardy.Repo.get_by(User, wallet_address: wallet_address) || %User{}
    
    # 2. Update user basic info
    user_changeset = User.changeset(user, %{
      wallet_address: wallet_address,
      full_name: params["full_name"],
      role: params["role"],
      onboarding_completed: true
    })

    Boardy.Repo.transaction(fn ->
      case Boardy.Repo.insert_or_update(user_changeset) do
        {:ok, updated_user} ->
          # 3. Create or update profile with the phone number
          profile = Boardy.Repo.get_by(Profile, user_id: updated_user.id) || %Profile{user_id: updated_user.id}
          
          profile_changeset = Profile.changeset(profile, %{
            phone_number: params["phone_number"],
            user_id: updated_user.id
          })
          
          case Boardy.Repo.insert_or_update(profile_changeset) do
            {:ok, _} -> updated_user
            {:error, reason} -> Boardy.Repo.rollback(reason)
          end
        {:error, reason} -> 
          Boardy.Repo.rollback(reason)
      end
    end)
    |> case do
      {:ok, user} ->
        json(conn, %{
          id: user.id,
          wallet_address: user.wallet_address,
          full_name: user.full_name,
          role: user.role,
          onboarding_completed: user.onboarding_completed
        })
      {:error, reason} ->
        IO.inspect(reason, label: "DB_ERROR")
        conn |> put_status(500) |> json(%{error: "Database error", details: inspect(reason)})
    end
  end

  # Local dev bypass to simulate Vapi Webhook + OpenAI Embeddings
  def sync_mock(conn, %{"id" => user_id}) do
    profile = Boardy.Repo.get_by(Profile, user_id: user_id)
    
    if profile do
      # Generate a mock 1536-dimensional vector for pgvector
      mock_vector = Pgvector.new(for _ <- 1..1536, do: :rand.uniform() |> Float.round(4))
      
      changeset = Profile.changeset(profile, %{
        offer_text: "AI: I am an expert Web3 and React developer looking for a fast-paced team.",
        need_text: "Need: Looking for a blockchain startup with a solid product roadmap.",
        offer_vector: mock_vector,
        need_vector: mock_vector
      })
      
      Boardy.Repo.update!(changeset)
      json(conn, %{success: true})
    else
      conn |> put_status(404) |> json(%{error: "Profile not found"})
    end
  end

  # Real data pipeline bypassing Vapi webhooks
  def sync_real_transcript(conn, %{"id" => user_id, "transcript" => transcript}) do
    profile = Boardy.Repo.get_by(Profile, user_id: user_id)
    
    if profile do
      # Extract intelligent summary via Gemini Flash
      {offer, need} = case Boardy.AI.extract_summary(transcript) do
        {:ok, o, n} -> {o, n}
        _ -> {"Raw Transcript Captured: " <> String.slice(transcript, 0, 500) <> "...", "Raw Transcript Captured: " <> String.slice(transcript, 0, 500) <> "..."}
      end

      # 1. Save the raw transcript AND the extracted summaries
      changeset = Profile.changeset(profile, %{
        raw_transcript: transcript,
        offer_text: offer,
        need_text: need
      })
      updated_profile = Boardy.Repo.update!(changeset)
      
      # 2. Use Gemini to generate REAL pgvector embeddings from the REAL transcript
      Task.start(fn ->
        case Boardy.AI.generate_embedding(transcript) do
          {:ok, vector} ->
            vector_changeset = Profile.changeset(updated_profile, %{
              offer_vector: vector,
              need_vector: vector
            })
            Boardy.Repo.update!(vector_changeset)
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
