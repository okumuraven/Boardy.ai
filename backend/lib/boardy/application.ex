defmodule Boardy.Application do
  # See https://elixir.hexdocs.pm/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      BoardyWeb.Telemetry,
      Boardy.Repo,
      {DNSCluster, query: Application.get_env(:boardy, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Boardy.PubSub},
      # Start a worker by calling: Boardy.Worker.start_link(arg)
      # {Boardy.Worker, arg},
      # Start to serve requests, typically the last entry
      BoardyWeb.Endpoint
    ]

    # See https://elixir.hexdocs.pm/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Boardy.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    BoardyWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
