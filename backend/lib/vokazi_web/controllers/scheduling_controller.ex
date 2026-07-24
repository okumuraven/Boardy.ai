defmodule VokaziWeb.SchedulingController do
  use VokaziWeb, :controller

  alias Vokazi.Scheduling

  @doc "Every unlocked match's scheduling state for this user - the Calendar tab."
  def calendar(conn, _params) do
    json(conn, %{schedules: Scheduling.list_for_user(conn.assigns.current_user_id)})
  end

  @doc "Fetches (or creates) this match's intro schedule for the calling user."
  def show(conn, %{"id" => match_id}) do
    respond(conn, Scheduling.get_or_create_schedule(to_int(match_id), conn.assigns.current_user_id))
  end

  @doc "Lightweight polling target once a schedule already exists."
  def status(conn, %{"id" => match_id}) do
    respond(conn, Scheduling.get_status(to_int(match_id), conn.assigns.current_user_id))
  end

  @doc "Returns the Google consent URL to redirect the browser to for this specific intro."
  def connect_url(conn, %{"id" => match_id}) do
    case Scheduling.connect_calendar_url(to_int(match_id), conn.assigns.current_user_id) do
      {:ok, url} -> json(conn, %{connect_url: url})
      error -> respond(conn, error)
    end
  end

  @doc "This user's real free days for the next few days - powers the assisted day-picker."
  def my_free_days(conn, %{"id" => match_id}) do
    case Scheduling.my_free_days(to_int(match_id), conn.assigns.current_user_id) do
      {:ok, days} -> json(conn, %{days: days})
      error -> respond(conn, error)
    end
  end

  @doc "Declines Calendar access for this intro - manual availability follows."
  def decline_calendar(conn, %{"id" => match_id}) do
    respond(conn, Scheduling.decline_calendar(to_int(match_id), conn.assigns.current_user_id))
  end

  @doc "Manual fallback availability when a side declines/lacks Calendar access."
  def submit_availability(conn, %{"id" => match_id, "slots" => slots}) do
    respond(conn, Scheduling.submit_manual_availability(to_int(match_id), conn.assigns.current_user_id, slots))
  end

  @doc "Per-intro override of this user's default contact preference."
  def set_contact_preference(conn, %{"id" => match_id, "mode" => mode}) do
    respond(conn, Scheduling.set_contact_override(to_int(match_id), conn.assigns.current_user_id, mode))
  end

  @doc "Records this user's pick among the proposed slots."
  def select_slot(conn, %{"id" => match_id, "slot" => slot}) do
    respond(conn, Scheduling.select_slot(to_int(match_id), conn.assigns.current_user_id, slot))
  end

  @doc "Nudges the other side with a rate-limited chat reminder."
  def remind(conn, %{"id" => match_id}) do
    respond(conn, Scheduling.send_reminder(to_int(match_id), conn.assigns.current_user_id))
  end

  defp respond(conn, {:ok, data}), do: json(conn, data)

  defp respond(conn, {:error, :not_a_participant}),
    do: conn |> put_status(:forbidden) |> json(%{error: "Not a participant in this match"})

  defp respond(conn, {:error, :match_not_unlocked}),
    do: conn |> put_status(:unprocessable_entity) |> json(%{error: "This match hasn't unlocked chat yet"})

  defp respond(conn, {:error, :not_found}),
    do: conn |> put_status(:not_found) |> json(%{error: "Match not found"})

  defp respond(conn, {:error, :schedule_not_found}),
    do: conn |> put_status(:not_found) |> json(%{error: "No schedule started for this match yet"})

  defp respond(conn, {:error, :invalid_slot}),
    do: conn |> put_status(:unprocessable_entity) |> json(%{error: "That slot is no longer available"})

  defp respond(conn, {:error, :reminder_on_cooldown}),
    do: conn |> put_status(:too_many_requests) |> json(%{error: "You've already sent a reminder recently"})

  defp respond(conn, {:error, :calendar_not_connected}),
    do: conn |> put_status(:unprocessable_entity) |> json(%{error: "Calendar isn't connected for this intro"})

  defp respond(conn, {:error, :calendar_reauth_required}),
    do: conn |> put_status(:unprocessable_entity) |> json(%{error: "calendar_reauth_required", message: "Your Calendar connection needs to be renewed"})

  defp respond(conn, {:error, _reason}),
    do: conn |> put_status(:unprocessable_entity) |> json(%{error: "Request failed"})

  defp to_int(id) when is_integer(id), do: id
  defp to_int(id) when is_binary(id), do: String.to_integer(id)
end
