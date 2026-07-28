defmodule VokaziWeb.AuthController do
  use VokaziWeb, :controller

  alias Vokazi.Accounts
  alias Vokazi.Auth.{GoogleSignIn, Session}

  @doc """
  The one real entry point into this app - verifies a Google ID token
  from the frontend's direct Google Sign-In, finds or creates the
  account by Google's stable subject id (`google_sub`, never a
  client-supplied claim), and issues a backend session token. Every
  other route requires this token (`VokaziWeb.AuthPlug`) - there is no
  other way to become "logged in" as any account, including your own.

  This never grants admin access as a side effect, even if the
  signing-in email happens to have a pending invite - that only happens
  through the dedicated `VokaziWeb.Admin.InviteAcceptController` flow,
  which enforces the invite's expiry and exact-account match. See
  "Admin panel.md" §3, §6.
  """
  def google_signin(conn, %{"id_token" => id_token}) do
    with {:ok, %{sub: sub, email: email, name: name}} <- GoogleSignIn.verify_id_token(id_token),
         {:ok, user, tag} <- Accounts.find_or_create_by_google(sub, email, name) do
      if tag == :created, do: enqueue_welcome_email(user)
      json(conn, %{token: Session.issue_token(user.id), user: %{id: user.id, onboarding_completed: user.onboarding_completed}})
    else
      {:error, _reason} ->
        conn |> put_status(401) |> json(%{error: "Could not verify Google sign-in"})
    end
  end

  def google_signin(conn, _params) do
    conn |> put_status(400) |> json(%{error: "Missing id_token"})
  end

  defp enqueue_welcome_email(user) do
    %{user_id: user.id}
    |> Vokazi.Accounts.WelcomeEmailWorker.new()
    |> Oban.insert()
  end
end
