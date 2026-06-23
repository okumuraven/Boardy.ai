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
end
