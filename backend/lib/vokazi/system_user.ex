defmodule Vokazi.SystemUser do
  @moduledoc """
  The one real `Vokazi.Accounts.User` row automated Kuzana Connect
  processes (Phase E's reminder worker) post chat messages as - real
  attribution ("Kuzana Connect"), not a NULL sender or a human
  misattributed as the source. Never a real login target - `google_sub`
  is a fixed placeholder no real Google account can ever present, so
  the sign-in flow could never accidentally authenticate as this
  identity. get_or_create is idempotent and safe to call from any
  process; the id is cached process-wide the same way `Vokazi.AI`
  already caches its last-good Gemini key.
  """

  alias Vokazi.Repo
  alias Vokazi.Accounts.User

  @email "system@kuzana.co"
  @google_sub "system-kuzana-connect"

  def id do
    case :persistent_term.get({__MODULE__, :id}, nil) do
      nil ->
        found_id = fetch_or_create_id()
        :persistent_term.put({__MODULE__, :id}, found_id)
        found_id

      cached_id ->
        cached_id
    end
  end

  defp fetch_or_create_id do
    case Repo.get_by(User, email: @email) do
      nil ->
        {:ok, user} =
          %User{}
          |> User.google_signin_changeset(%{google_sub: @google_sub, email: @email, full_name: "Kuzana Connect"})
          |> Repo.insert()

        user.id

      user ->
        user.id
    end
  end
end
