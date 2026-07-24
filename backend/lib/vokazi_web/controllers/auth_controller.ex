defmodule VokaziWeb.AuthController do
  use VokaziWeb, :controller

  alias Vokazi.Accounts.User
  alias Vokazi.Auth.{GoogleSignIn, Session}

  @doc """
  The one real entry point into this app - verifies a Google ID token
  from the frontend's direct Google Sign-In, finds or creates the
  account by Google's stable subject id (`google_sub`, never a
  client-supplied claim), and issues a backend session token. Every
  other route requires this token (`VokaziWeb.AuthPlug`) - there is no
  other way to become "logged in" as any account, including your own.
  """
  def google_signin(conn, %{"id_token" => id_token}) do
    with {:ok, %{sub: sub, email: email, name: name}} <- GoogleSignIn.verify_id_token(id_token),
         {:ok, user} <- find_or_create_user(sub, email, name) do
      json(conn, %{token: Session.issue_token(user.id), user: %{id: user.id, onboarding_completed: user.onboarding_completed}})
    else
      {:error, _reason} ->
        conn |> put_status(401) |> json(%{error: "Could not verify Google sign-in"})
    end
  end

  def google_signin(conn, _params) do
    conn |> put_status(400) |> json(%{error: "Missing id_token"})
  end

  defp find_or_create_user(sub, email, name) do
    case Vokazi.Repo.get_by(User, google_sub: sub) do
      nil ->
        %User{}
        |> User.google_signin_changeset(%{google_sub: sub, email: email, full_name: name})
        |> Vokazi.Repo.insert()

      user ->
        {:ok, user}
    end
  end
end
