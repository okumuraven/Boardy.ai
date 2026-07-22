defmodule Vokazi.SocialProfiles.GithubOAuth do
  @moduledoc """
  GitHub OAuth for verifying account ownership before connecting a
  GitHub profile - a separate consent screen from both Thirdweb's
  identity sign-in and `Vokazi.Scheduling.GoogleOAuth`'s Calendar access.

  Requests no scope at all - GitHub's no-scope grant already exposes the
  authenticated user's public profile via `GET /user`, and that's all
  this needs. The OAuth step exists purely to prove *this* user owns the
  GitHub account, not to request any data-access permission beyond what
  was already public.

  The `state` parameter is HMAC-signed (`Plug.Crypto.MessageVerifier`,
  same secret as `GoogleOAuth`) so the callback can trust which
  `user_id` initiated it - without this, an attacker could swap in their
  own `user_id` on the callback and attach their GitHub to someone
  else's Vokazi account.
  """

  require Logger

  @authorize_url "https://github.com/login/oauth/authorize"
  @token_url "https://github.com/login/oauth/access_token"
  @user_url "https://api.github.com/user"

  @doc "Builds the URL to redirect the user's browser to for GitHub's consent screen."
  def authorize_url(user_id) do
    state = sign_state(%{"user_id" => user_id})

    params = %{
      client_id: client_id(),
      redirect_uri: redirect_uri(),
      state: state
    }

    @authorize_url <> "?" <> URI.encode_query(params)
  end

  @doc "Verifies and decodes a `state` param from the callback."
  def verify_state(state) do
    with {:ok, json} <- Plug.Crypto.MessageVerifier.verify(state, secret()),
         {:ok, payload} <- Jason.decode(json) do
      {:ok, %{user_id: payload["user_id"]}}
    else
      _ -> {:error, :invalid_state}
    end
  end

  defp sign_state(payload), do: Plug.Crypto.MessageVerifier.sign(Jason.encode!(payload), secret())

  @doc """
  Exchanges an authorization `code` for an access token, then fetches
  the authenticated user's public profile to learn their verified
  GitHub username.
  """
  def exchange_code(code) do
    body = %{code: code, client_id: client_id(), client_secret: client_secret(), redirect_uri: redirect_uri()}

    with {:ok, %Req.Response{status: 200, body: %{"access_token" => token}}} <-
           Req.post(@token_url, form: body, headers: [{"accept", "application/json"}], receive_timeout: 30_000),
         {:ok, %Req.Response{status: 200, body: %{"login" => username}}} <-
           Req.get(@user_url, auth: {:bearer, token}, receive_timeout: 15_000) do
      {:ok, %{access_token: token, github_username: username}}
    else
      {:ok, %Req.Response{status: status, body: resp_body}} ->
        Logger.error("Vokazi.SocialProfiles.GithubOAuth: exchange failed status=#{status} body=#{inspect(resp_body)}")
        {:error, :github_exchange_failed}

      {:error, reason} ->
        Logger.error("Vokazi.SocialProfiles.GithubOAuth: exchange error: #{inspect(reason)}")
        {:error, :github_exchange_failed}
    end
  end

  defp client_id, do: System.fetch_env!("GITHUB_CLIENT_ID")
  defp client_secret, do: System.fetch_env!("GITHUB_CLIENT_SECRET")
  defp redirect_uri, do: System.fetch_env!("GITHUB_REDIRECT_URI")

  defp secret do
    :vokazi
    |> Application.fetch_env!(VokaziWeb.Endpoint)
    |> Keyword.fetch!(:secret_key_base)
  end
end
