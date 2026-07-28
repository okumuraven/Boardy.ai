import Config

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.

# ## Using releases
#
# If you use `mix release`, you need to explicitly enable the server
# by passing the PHX_SERVER=true when you start it:
#
#     PHX_SERVER=true bin/vokazi start
#
# Alternatively, you can use `mix phx.gen.release` to generate a `bin/server`
# script that automatically sets the env var above.
if System.get_env("PHX_SERVER") do
  config :vokazi, VokaziWeb.Endpoint, server: true
end

config :vokazi, VokaziWeb.Endpoint,
  http: [port: String.to_integer(System.get_env("PORT", "4000"))],
  # Restricts which origins may open the chat/calls/notifications
  # WebSocket - previously `false` (any origin allowed), which combined
  # with the equally-wide-open CORS config let any website connect to
  # the socket with a stolen/leaked token. Keep in sync with the CORS
  # allowlist in config/prod.exs.
  check_origin: [
    "https://kuzanaconnect.tech",
    "https://www.kuzanaconnect.tech",
    "https://kuzana-connect.vercel.app",
    "https://parrot.tail780ac1.ts.net",
    "https://zr34p1lt-5173.use.devtunnels.ms",
    "http://localhost:5173"
  ]

# Web Push (VAPID) - notification_system.md Phase 2. Keys are generated
# once via `mix generate.vapid.keys`, free, no third-party account.
config :web_push_elixir,
  vapid_public_key: System.get_env("VAPID_PUBLIC_KEY"),
  vapid_private_key: System.get_env("VAPID_PRIVATE_KEY"),
  vapid_subject: System.get_env("VAPID_SUBJECT") || "mailto:team@vokazi.app"

# Durable retryable delivery jobs for Web Push and transactional email
# (free, open-source Oban core only - no Oban Web/Pro). Cron plugin
# drives three scheduled sweeps: the Bizi Buddy System's weekly check-in
# reminder (kuzana_playbook.md §6) at Monday 9am UTC, the one-shot
# interview reminder daily at 8am UTC, and the one-shot feedback
# reminder hourly (its own @delay_hours is only a few hours right now,
# during active hackathon testing, so a daily cron would be too coarse -
# switch this to daily once that delay moves to days post-hackathon).
config :vokazi, Oban,
  engine: Oban.Engines.Basic,
  repo: Vokazi.Repo,
  queues: [push: 5, buddy_checkins: 1, mailers: 5],
  plugins: [
    {Oban.Plugins.Cron,
     crontab: [
       {"0 9 * * 1", Vokazi.BuddyPairings.CheckInReminderWorker},
       {"0 8 * * *", Vokazi.Accounts.InterviewReminderWorker},
       {"0 * * * *", Vokazi.Accounts.FeedbackReminderWorker}
     ]}
  ]

if config_env() == :prod do
  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      For example: ecto://USER:PASS@HOST/DATABASE
      """

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  config :vokazi, Vokazi.Repo,
    ssl: false,
    # ssl_opts: [verify: :verify_none],
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    # For machines with several cores, consider starting multiple pools of `pool_size`
    # pool_count: 4,
    socket_options: maybe_ipv6

  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  host = System.get_env("PHX_HOST") || "example.com"

  config :vokazi, :dns_cluster_query, System.get_env("DNS_CLUSTER_QUERY")

  config :vokazi, VokaziWeb.Endpoint,
    url: [host: host, port: 443, scheme: "https"],
    http: [
      # Enable IPv6 and bind on all interfaces.
      # Set it to  {0, 0, 0, 0, 0, 0, 0, 1} for local network only access.
      # See the documentation on https://bandit.hexdocs.pm/Bandit.html#t:options/0
      # for details about using IPv6 vs IPv4 and loopback vs public addresses.
      ip: {0, 0, 0, 0, 0, 0, 0, 0}
    ],
    secret_key_base: secret_key_base

  # ## SSL Support
  #
  # To get SSL working, you will need to add the `https` key
  # to your endpoint configuration:
  #
  #     config :vokazi, VokaziWeb.Endpoint,
  #       https: [
  #         ...,
  #         port: 443,
  #         cipher_suite: :strong,
  #         keyfile: System.get_env("SOME_APP_SSL_KEY_PATH"),
  #         certfile: System.get_env("SOME_APP_SSL_CERT_PATH")
  #       ]
  #
  # The `cipher_suite` is set to `:strong` to support only the
  # latest and more secure SSL ciphers. This means old browsers
  # and clients may not be supported. You can set it to
  # `:compatible` for wider support.
  #
  # `:keyfile` and `:certfile` expect an absolute path to the key
  # and cert in disk or a relative path inside priv, for example
  # "priv/ssl/server.key". For all supported SSL configuration
  # options, see https://plug.hexdocs.pm/Plug.SSL.html#configure/1
  #
  # We also recommend setting `force_ssl` in your config/prod.exs,
  # ensuring no data is ever sent via http, always redirecting to https:
  #
  #     config :vokazi, VokaziWeb.Endpoint,
  #       force_ssl: [hsts: true]
  #
  # Check `Plug.SSL` for all available options in `force_ssl`.
end
