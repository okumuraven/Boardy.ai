defmodule Vokazi.Scheduling.CredentialStore do
  @moduledoc """
  Owns the Calendar OAuth credential lifecycle - upserting a fresh token
  pair from `Vokazi.Scheduling.GoogleOAuth.exchange_code/1`, and
  transparently refreshing an expired access token before handing it
  back out. Kept separate from `Vokazi.Scheduling` so the orchestrator
  doesn't also have to know token-expiry mechanics.
  """

  alias Vokazi.Repo
  alias Vokazi.Scheduling.{CalendarCredential, GoogleOAuth}

  @doc "A valid access token for `user_id`'s linked Calendar, refreshing first if expired."
  def token_for(user_id) do
    case Repo.get_by(CalendarCredential, user_id: user_id) do
      nil ->
        {:error, :not_connected}

      %{expires_at: expires_at} = cred ->
        if DateTime.compare(expires_at, DateTime.utc_now()) == :gt do
          {:ok, cred.access_token}
        else
          refresh_and_store(cred)
        end
    end
  end

  @doc """
  Stores (or refreshes) `user_id`'s Calendar credential from a token
  response. Google only returns a `refresh_token` on the *first* consent
  for an account - a reconnect without one keeps the previously stored
  value rather than nulling it out.
  """
  def upsert(user_id, tokens) do
    expires_at = expires_at_from(tokens.expires_in)

    attrs = %{
      user_id: user_id,
      google_email: tokens.google_email,
      access_token: tokens.access_token,
      scope: tokens.scope,
      expires_at: expires_at
    }

    case Repo.get_by(CalendarCredential, user_id: user_id) do
      nil ->
        %CalendarCredential{}
        |> CalendarCredential.changeset(Map.put(attrs, :refresh_token, tokens.refresh_token))
        |> Repo.insert!()

      existing ->
        attrs = if tokens.refresh_token, do: Map.put(attrs, :refresh_token, tokens.refresh_token), else: attrs
        existing |> CalendarCredential.changeset(attrs) |> Repo.update!()
    end
  end

  defp refresh_and_store(cred) do
    case GoogleOAuth.refresh_access_token(cred.refresh_token) do
      {:ok, %{access_token: token, expires_in: expires_in}} ->
        cred
        |> CalendarCredential.changeset(%{access_token: token, expires_at: expires_at_from(expires_in)})
        |> Repo.update!()

        {:ok, token}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp expires_at_from(expires_in) do
    DateTime.utc_now() |> DateTime.add(expires_in || 3600, :second) |> DateTime.truncate(:second)
  end
end
