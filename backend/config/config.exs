# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :vokazi,
  ecto_repos: [Vokazi.Repo],
  generators: [timestamp_type: :utc_datetime]

config :vokazi, Vokazi.Repo,
  types: Vokazi.PostgresTypes

# Configure the endpoint
config :vokazi, VokaziWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: VokaziWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: Vokazi.PubSub,
  live_view: [signing_salt: "mJs3eHMQ"]

# Configure Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
