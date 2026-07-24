defmodule Vokazi.Calling.TurnCredentials do
  @moduledoc """
  Generates short-lived coturn credentials using its standard
  `--use-auth-secret` REST-API scheme (a timestamp-based username plus an
  HMAC-SHA1 password derived from a shared secret) - no network call to
  coturn itself is needed to generate them; the same shared secret
  (`TURN_SECRET`) is configured on both sides (see `docker-compose.yml`'s
  `coturn` service). This is what makes self-hosted `coturn` viable
  without a managed platform: the backend can hand out fresh,
  short-lived credentials per call rather than a single static password
  every client would otherwise share.
  """

  # Matches coturn's own default; long enough for a real intro call, not
  # so long that a leaked credential stays useful for hours.
  @ttl_seconds 3600

  @doc """
  Returns `%{username:, password:, ttl:, urls:}` for `user_id` - `urls`
  are ready to hand straight to `RTCPeerConnection`'s `iceServers` config
  once Phase 2 wires up real media.
  """
  def generate(user_id) do
    secret = turn_secret()
    expiry = System.system_time(:second) + @ttl_seconds
    username = "#{expiry}:user#{user_id}"
    password = username |> hmac_sha1(secret) |> Base.encode64()

    %{
      username: username,
      password: password,
      ttl: @ttl_seconds,
      urls: turn_urls()
    }
  end

  defp hmac_sha1(data, secret), do: :crypto.mac(:hmac, :sha, secret, data)

  defp turn_secret do
    case System.get_env("TURN_SECRET") do
      nil -> raise "TURN_SECRET is not set - coturn credentials cannot be generated"
      secret -> secret
    end
  end

  defp turn_urls do
    host = System.get_env("TURN_HOST") || "localhost"
    ["turn:#{host}:3478?transport=udp", "turn:#{host}:3478?transport=tcp"]
  end
end
