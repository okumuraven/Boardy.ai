defmodule VokaziWeb.Admin.StatsController do
  use VokaziWeb, :controller

  alias Vokazi.Admin.Stats

  @doc "Support+ - aggregate dashboard counts, including the named capital-side slice (§9)."
  def show(conn, _params) do
    json(conn, Stats.summary())
  end
end
