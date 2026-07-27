defmodule VokaziWeb.HealthController do
  use VokaziWeb, :controller

  @doc "Fly.io's health check target - always 200 once the app has booted, no auth involved."
  def show(conn, _params) do
    text(conn, "ok")
  end
end
