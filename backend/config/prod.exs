import Config

# Force using SSL in production. This also sets the "strict-security-transport" header,
# known as HSTS. If you have a health check endpoint, you may want to exclude it below.
# Note `:force_ssl` is required to be set at compile-time.
config :vokazi, VokaziWeb.Endpoint,
  force_ssl: [
    rewrite_on: [:x_forwarded_proto],
    exclude: [
      paths: ["/api/health"],
      # Local-only test access (LAN IP + this machine's Tailscale IP) -
      # there's no TLS listener in this docker-compose setup, so forcing
      # SSL here just breaks every non-localhost request with a redirect
      # to the unconfigured PHX_HOST placeholder. A real deployment uses
      # a real public domain and isn't in this list.
      hosts: ["localhost", "127.0.0.1", "192.168.88.52", "100.82.22.60"]
    ]
  ]

# Do not print debug messages in production
config :logger, level: :info

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
