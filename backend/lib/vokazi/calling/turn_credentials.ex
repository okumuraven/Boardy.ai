defmodule Vokazi.Calling.TurnCredentials do
  @moduledoc """
  Returns ICE server config for in-app calling, backed by a real Metered
  TURN Server account (dashboard.metered.ca) - this replaced the
  anonymous, no-signup "openrelayproject" shared credentials every free
  Metered user gets pointed at by default, which stopped actually
  allocating TURN relays at some point (confirmed live: two real calls
  across different networks each gathered `host` candidates and at most
  one `srflx` candidate, but zero `relay` candidates from either side -
  direct protocol tests against the shared server's TURN port got no
  response at all, not even the standard 401 challenge every live TURN
  server sends first). A relay is the only thing that lets two people on
  genuinely different networks (e.g. mobile carrier NAT) exchange audio,
  so without one, calls could ring and "connect" cosmetically but never
  actually carry sound - exactly what got reported live.

  `METERED_DOMAIN`/`METERED_API_KEY` are this app's own dedicated
  account (free tier: 20GB TURN usage/month) - dynamic, short-lived
  credentials generated per request, not shared with the rest of the
  internet.
  """

  require Logger

  @doc """
  Returns `{:ok, %{ice_servers: [...]}}` ready to hand straight to
  `RTCPeerConnection`'s `iceServers` config, or `{:error, reason}` if
  Metered's API can't be reached or isn't configured - the caller
  (TurnCredentialsController) turns that into a real error response
  rather than silently handing back a broken/empty ICE server list.
  """
  def generate(_user_id) do
    with {:ok, domain} <- fetch_env("METERED_DOMAIN"),
         {:ok, api_key} <- fetch_env("METERED_API_KEY"),
         {:ok, %Req.Response{status: 200, body: servers}} when is_list(servers) <-
           Req.get("https://#{domain}/api/v1/turn/credentials",
             params: [apiKey: api_key],
             receive_timeout: 10_000
           ) do
      # Google's public STUN alongside Metered's own - direct-connection
      # discovery only (no relay, no credentials needed), but widens the
      # candidate pool for the common case where a direct/STUN path
      # actually is available and a relay hop isn't even needed.
      {:ok, %{ice_servers: [%{urls: "stun:stun.l.google.com:19302"} | servers]}}
    else
      {:error, :missing_env, key} ->
        Logger.error("Vokazi.Calling.TurnCredentials: #{key} is not configured")
        {:error, :not_configured}

      {:ok, %Req.Response{status: status, body: body}} ->
        Logger.error("Vokazi.Calling.TurnCredentials: Metered API returned status=#{status} body=#{inspect(body)}")
        {:error, :provider_error}

      {:error, reason} ->
        Logger.error("Vokazi.Calling.TurnCredentials: request to Metered failed: #{inspect(reason)}")
        {:error, :provider_error}
    end
  end

  defp fetch_env(key) do
    case System.get_env(key) do
      value when is_binary(value) and value != "" -> {:ok, value}
      _ -> {:error, :missing_env, key}
    end
  end
end
