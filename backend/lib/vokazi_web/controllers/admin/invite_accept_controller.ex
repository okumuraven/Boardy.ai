defmodule VokaziWeb.Admin.InviteAcceptController do
  use VokaziWeb, :controller

  alias Vokazi.Admin.Admins
  alias Vokazi.Auth.{GoogleSignIn, Session}

  @doc """
  Public, unauthenticated - lets the accept-invite screen show "you've
  been invited as Moderator, expires July 28" (or a clean "this invite
  has expired" message) before asking anyone to sign in with anything.
  """
  def show(conn, %{"token" => token}) do
    case Admins.get_invite_preview(token) do
      {:ok, preview} -> json(conn, preview)
      {:error, :expired} -> conn |> put_status(410) |> json(%{error: "This invite has expired"})
      {:error, :not_found} -> conn |> put_status(404) |> json(%{error: "Invite not found"})
    end
  end

  @doc """
  Public, unauthenticated - the only way an invite is ever consumed.
  Verifies the Google ID token for real, then requires the signed-in
  email to match the invite exactly and the invite to still be within
  its window - see `Vokazi.Admin.Admins.accept_invite/4`.
  """
  def accept(conn, %{"token" => token, "id_token" => id_token}) do
    with {:ok, %{sub: sub, email: email, name: name}} <- GoogleSignIn.verify_id_token(id_token),
         {:ok, user} <- Admins.accept_invite(token, sub, email, name) do
      json(conn, %{
        token: Session.issue_token(user.id),
        user: %{id: user.id, email: user.email, admin_role: user.admin_role, full_name: user.full_name, location: user.location},
        needs_profile: is_nil(user.location)
      })
    else
      {:error, :expired} ->
        conn |> put_status(410) |> json(%{error: "This invite has expired"})

      {:error, :not_found} ->
        conn |> put_status(404) |> json(%{error: "Invite not found"})

      {:error, {:email_mismatch, expected_email}} ->
        conn
        |> put_status(422)
        |> json(%{error: "This invite was sent to #{expected_email} - please sign in with that Google account.", expected_email: expected_email})

      {:error, _reason} ->
        conn |> put_status(401) |> json(%{error: "Could not verify Google sign-in"})
    end
  end
end
