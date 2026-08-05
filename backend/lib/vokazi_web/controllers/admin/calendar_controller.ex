defmodule VokaziWeb.Admin.CalendarController do
  use VokaziWeb, :controller

  alias Vokazi.Scheduling
  alias Vokazi.Admin.BiziApplications

  @doc "Whether the current admin has a Google Calendar connected to book Bizi verification calls with."
  def status(conn, _params) do
    json(conn, %{connected: BiziApplications.calendar_connected?(conn.assigns.current_admin.id)})
  end

  @doc "The Google consent URL to redirect this admin's own browser to (Phase D, bizi_verification_build_plan.md)."
  def connect_url(conn, _params) do
    {:ok, url} = Scheduling.connect_admin_calendar_url(conn.assigns.current_admin.id)
    json(conn, %{url: url})
  end
end
