defmodule Vokazi.Scheduling.GoogleOAuth do
  @moduledoc """
  Google OAuth (authorization code flow) for Calendar access - a
  separate consent screen from Thirdweb's identity-only Google sign-in
  (`Login.jsx`), since that flow only ever requests `openid email
  profile`, never `calendar.events`.

  The `state` parameter is HMAC-signed (`Plug.Crypto.MessageVerifier`,
  keyed off `SECRET_KEY_BASE`) so the callback can trust exactly which
  `user_id`/`match_id` initiated it - without this, an attacker could
  swap in their own `user_id` on the callback and hijack another user's
  Calendar link (classic OAuth callback CSRF).
  """

  require Logger

  @scope "openid email https://www.googleapis.com/auth/calendar.events"
  @token_url "https://oauth2.googleapis.com/token"
  @userinfo_url "https://openidconnect.googleapis.com/v1/userinfo"

  @doc """
  Builds the URL to redirect the user's browser to for Google's consent
  screen, with a signed `state` binding this specific `user_id` +
  `match_id`.
  """
  def authorize_url(user_id, match_id) do
    state = sign_state(%{"user_id" => user_id, "match_id" => match_id})

    params = %{
      client_id: client_id(),
      redirect_uri: redirect_uri(),
      response_type: "code",
      scope: @scope,
      access_type: "offline",
      prompt: "consent",
      state: state
    }

    "https://accounts.google.com/o/oauth2/v2/auth?" <> URI.encode_query(params)
  end

  @doc """
  Verifies and decodes a `state` param from the callback. Returns
  `{:error, :invalid_state}` for anything tampered, expired, or from a
  different `SECRET_KEY_BASE` (e.g. a stale link from another deploy).
  """
  def verify_state(state) do
    with {:ok, json} <- Plug.Crypto.MessageVerifier.verify(state, secret()),
         {:ok, payload} <- Jason.decode(json) do
      {:ok, %{user_id: payload["user_id"], match_id: payload["match_id"]}}
    else
      _ -> {:error, :invalid_state}
    end
  end

  defp sign_state(payload) do
    Plug.Crypto.MessageVerifier.sign(Jason.encode!(payload), secret())
  end

  @doc """
  Exchanges an authorization `code` for access/refresh tokens, then
  fetches the Google account's email so we know whose calendar this is.
  """
  def exchange_code(code) do
    body = %{
      code: code,
      client_id: client_id(),
      client_secret: client_secret(),
      redirect_uri: redirect_uri(),
      grant_type: "authorization_code"
    }

    with {:ok, %Req.Response{status: 200, body: tokens}} <-
           Req.post(@token_url, form: body, receive_timeout: 30_000),
         {:ok, email} <- fetch_email(tokens["access_token"]) do
      {:ok,
       %{
         access_token: tokens["access_token"],
         refresh_token: tokens["refresh_token"],
         expires_in: tokens["expires_in"],
         scope: tokens["scope"],
         google_email: email
       }}
    else
      {:ok, %Req.Response{status: status, body: resp_body}} ->
        Logger.error("Vokazi.Scheduling.GoogleOAuth: token exchange failed status=#{status} body=#{inspect(resp_body)}")
        {:error, :token_exchange_failed}

      {:error, reason} ->
        Logger.error("Vokazi.Scheduling.GoogleOAuth: token exchange error: #{inspect(reason)}")
        {:error, :token_exchange_failed}
    end
  end

  defp fetch_email(access_token) do
    case Req.get(@userinfo_url, auth: {:bearer, access_token}, receive_timeout: 15_000) do
      {:ok, %Req.Response{status: 200, body: %{"email" => email}}} ->
        {:ok, email}

      other ->
        Logger.error("Vokazi.Scheduling.GoogleOAuth: userinfo fetch failed: #{inspect(other)}")
        {:error, :userinfo_failed}
    end
  end

  @doc """
  Refreshes an expired access token using the stored refresh token.
  """
  def refresh_access_token(refresh_token) do
    body = %{
      refresh_token: refresh_token,
      client_id: client_id(),
      client_secret: client_secret(),
      grant_type: "refresh_token"
    }

    case Req.post(@token_url, form: body, receive_timeout: 30_000) do
      {:ok, %Req.Response{status: 200, body: tokens}} ->
        {:ok, %{access_token: tokens["access_token"], expires_in: tokens["expires_in"]}}

      other ->
        Logger.error("Vokazi.Scheduling.GoogleOAuth: refresh failed: #{inspect(other)}")
        {:error, :refresh_failed}
    end
  end

  defp client_id, do: System.fetch_env!("GOOGLE_CALENDAR_CLIENT_ID")
  defp client_secret, do: System.fetch_env!("GOOGLE_CALENDAR_CLIENT_SECRET")
  defp redirect_uri, do: System.fetch_env!("GOOGLE_CALENDAR_REDIRECT_URI")

  defp secret do
    :vokazi
    |> Application.fetch_env!(VokaziWeb.Endpoint)
    |> Keyword.fetch!(:secret_key_base)
  end
end
