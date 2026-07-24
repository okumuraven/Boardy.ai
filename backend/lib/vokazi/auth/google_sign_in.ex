defmodule Vokazi.Auth.GoogleSignIn do
  @moduledoc """
  Verifies a Google ID token from the frontend's direct Google Sign-In
  (`@react-oauth/google`) - the real identity check for this app, no
  Thirdweb/wallet detour involved. Uses Google's `tokeninfo` endpoint
  (a single call, matching the same `Req`-based style as
  `Vokazi.SocialProfiles.GithubOAuth`/`Vokazi.Scheduling.GoogleOAuth`)
  rather than local JWKS signature verification - simpler, and entirely
  adequate at this app's scale since it only runs once per sign-in, not
  once per request.

  Deliberately a *separate* OAuth client from Calendar's
  (`GOOGLE_SIGNIN_CLIENT_ID` vs `GOOGLE_CALENDAR_CLIENT_ID`) - same
  one-client-per-purpose convention already used for Calendar vs GitHub.
  """

  require Logger

  @tokeninfo_url "https://oauth2.googleapis.com/tokeninfo"

  @doc """
  `{:ok, %{sub:, email:, name:}}` once the token is confirmed valid,
  unexpired, and issued for *this* app specifically - never trust a
  token whose `aud` doesn't match our own client id, or a token from a
  different Google app could be replayed to impersonate a user here.
  """
  def verify_id_token(id_token) when is_binary(id_token) and id_token != "" do
    with {:ok, %Req.Response{status: 200, body: body}} <-
           Req.get(@tokeninfo_url, params: [id_token: id_token], receive_timeout: 15_000),
         true <- body["aud"] == client_id(),
         {:ok, sub} <- fetch_present(body, "sub"),
         {:ok, email} <- fetch_present(body, "email") do
      {:ok, %{sub: sub, email: email, name: body["name"]}}
    else
      false ->
        Logger.error("Vokazi.Auth.GoogleSignIn: token audience did not match our client id")
        {:error, :invalid_audience}

      {:error, :missing_claim} = error ->
        error

      {:ok, %Req.Response{status: status, body: resp_body}} ->
        Logger.error("Vokazi.Auth.GoogleSignIn: tokeninfo rejected token status=#{status} body=#{inspect(resp_body)}")
        {:error, :invalid_token}

      {:error, reason} ->
        Logger.error("Vokazi.Auth.GoogleSignIn: tokeninfo request error: #{inspect(reason)}")
        {:error, :verification_failed}
    end
  end

  def verify_id_token(_), do: {:error, :invalid_token}

  defp fetch_present(body, key) do
    case body[key] do
      v when is_binary(v) and v != "" -> {:ok, v}
      _ -> {:error, :missing_claim}
    end
  end

  defp client_id, do: System.fetch_env!("GOOGLE_SIGNIN_CLIENT_ID")
end
