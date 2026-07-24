defmodule Vokazi.Auth.Session do
  @moduledoc """
  Backend-issued session tokens - what every authenticated request
  (both the JSON API via `VokaziWeb.AuthPlug` and the WebSocket layer
  via `VokaziWeb.UserSocket`) actually trusts as "who is this request
  from," instead of a client-supplied `user_id`/`wallet_address` param.

  Built on `Phoenix.Token` - already part of Phoenix, so no new
  dependency, and the same class of primitive `Vokazi.Scheduling.
  GoogleOAuth`/`Vokazi.SocialProfiles.GithubOAuth` already use (via
  `Plug.Crypto.MessageVerifier`) for their signed `state` params.
  """

  @salt "user_auth"
  @max_age_seconds 60 * 60 * 24 * 30

  @doc "A signed, expiring token embedding this user's real, already-verified id."
  def issue_token(user_id) do
    Phoenix.Token.sign(VokaziWeb.Endpoint, @salt, user_id)
  end

  @doc "`{:ok, user_id}` if `token` is a genuine, unexpired session token - else `{:error, reason}`."
  def verify_token(token) when is_binary(token) do
    Phoenix.Token.verify(VokaziWeb.Endpoint, @salt, token, max_age: @max_age_seconds)
  end

  def verify_token(_), do: {:error, :invalid}
end
