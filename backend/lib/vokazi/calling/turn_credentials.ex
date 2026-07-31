defmodule Vokazi.Calling.TurnCredentials do
  @moduledoc """
  Returns ICE server config for in-app calling, backed by Metered's Open
  Relay Project (openrelay.metered.ca) - a free, publicly shared TURN
  server (20GB/month relay data, no signup required). Its username and
  credential are the same fixed, publicly published values for every
  user of the service, not secrets - there's nothing per-user to
  generate, unlike the self-hosted coturn HMAC scheme this replaced
  (docker-compose.yml's local `coturn` service was never actually
  reachable from the public internet, so it could never serve real
  production calls).
  """

  @username "openrelayproject"
  @credential "openrelayproject"

  @doc """
  Returns `%{ice_servers: [...]}`, ready to hand straight to
  `RTCPeerConnection`'s `iceServers` config.
  """
  def generate(_user_id) do
    %{
      ice_servers: [
        %{urls: "stun:stun.relay.metered.ca:80"},
        %{urls: "turn:relay.metered.ca:80", username: @username, credential: @credential},
        %{urls: "turn:relay.metered.ca:443", username: @username, credential: @credential},
        %{urls: "turn:relay.metered.ca:443?transport=tcp", username: @username, credential: @credential}
      ]
    }
  end
end
