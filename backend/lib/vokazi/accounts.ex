defmodule Vokazi.Accounts do
  @moduledoc """
  Shared account-identity reconciliation used by every Google Sign-In
  entry point (the regular member sign-in and the admin accept-invite
  flow) - kept in one place so the two never drift into subtly
  different rules for "who is this Google account, in our system."
  """

  alias Vokazi.Repo
  alias Vokazi.Accounts.User

  @doc """
  Finds the `User` this verified Google identity belongs to, creating
  one if this is a first-ever sign-in. Falls back to matching by email
  when no row has this exact `google_sub` yet - a row may already exist
  for this email from before this app had real Google verification (the
  pre-migration Thirdweb era stored a wallet-style placeholder in this
  same column). Adopting the freshly-verified sub onto that row is the
  correct one-time reconciliation; a bare insert would instead hit
  `unique_constraint(:email)` and fail a real, legitimate sign-in.

  Returns `{:ok, user, :created | :existing}` - this function is shared
  by both the member sign-in AND the admin accept-invite flow, and only
  the former should ever react to "was this account just created" (e.g.
  sending a member welcome email), so the tag is left for the caller to
  act on rather than baked in here.
  """
  def find_or_create_by_google(sub, email, name) do
    case Repo.get_by(User, google_sub: sub) do
      nil -> find_by_email_or_create(email, sub, name)
      user -> {:ok, user, :existing}
    end
  end

  defp find_by_email_or_create(email, sub, name) do
    case email && Repo.get_by(User, email: email) do
      nil ->
        %User{}
        |> User.google_signin_changeset(%{google_sub: sub, email: email, full_name: name})
        |> Repo.insert()
        |> tag_result(:created)

      existing ->
        existing
        |> User.google_signin_changeset(%{google_sub: sub, email: email, full_name: name})
        |> Repo.update()
        |> tag_result(:existing)
    end
  end

  defp tag_result({:ok, user}, tag), do: {:ok, user, tag}
  defp tag_result(error, _tag), do: error
end
