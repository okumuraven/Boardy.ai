defmodule Vokazi.Bizi do
  @moduledoc """
  Apply + Rulebook only (bizi_flow.md) - the digitized front door to
  Kuzana's real accelerator application, built directly from the live
  form at form.kuzana.co/apply (kuzana_website.md §9). Everything past
  `submitted` - the real screening call, DD visit, board approval, all
  legal/equity paperwork - stays exactly where it already lives; this
  module's only job is to capture a real, structured application and
  tell staff it happened.
  """

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Bizi.Application
  alias Vokazi.Notifications

  @doc """
  Kuzana's real form rejects anyone but the operating founder outright
  ("Applications from transaction advisors, non-operational investors,
  CFO or Executive Assistants not accepted" - kuzana_website.md §9).
  Connect already knows `role`, so this is checked before the feature is
  ever shown (bizi_flow.md §1), not just discovered at submit time -
  checked here too, since a hidden button is a UI nicety, not a security
  boundary; the real enforcement has to live in the context/controller.
  """
  def eligible_role?(role), do: role == "founder"

  @doc """
  Every application this user has ever submitted, newest first -
  re-application is a normal, expected path (the real form's own
  "Reapplication" lead-source option), never hidden or overwritten.
  """
  def list_for_user(user_id) do
    Application
    |> where([a], a.user_id == ^user_id)
    |> order_by([a], desc: a.inserted_at)
    |> Repo.all()
  end

  @doc """
  The one real authorization check behind the member-facing verification
  chat endpoint - `nil` for any id that isn't this user's own
  application, same "not found" either way a stranger's id would get.
  """
  def get_own_application(user_id, application_id) do
    Repo.get_by(Application, id: application_id, user_id: user_id)
  end

  @doc """
  This user's own upcoming Bizi verification calls, across every
  application they've submitted - the Calendar tab's Bizi source
  (Phase D, bizi_verification_build_plan.md). Merged client-side with
  `Vokazi.Scheduling.CalendarOverview`'s match schedules, the same way
  personal events already merge in - Bizi calls aren't match-scoped, so
  they don't belong inside that module's own aggregation.
  """
  def list_scheduled_calls(user_id) do
    Application
    |> where([a], a.user_id == ^user_id and not is_nil(a.scheduled_call_at))
    |> order_by([a], asc: a.scheduled_call_at)
    |> Repo.all()
    |> Enum.map(fn a ->
      %{
        application_id: a.id,
        company_name: a.company_name,
        scheduled_call_at: a.scheduled_call_at,
        meet_link: a.scheduled_call_meet_link
      }
    end)
  end

  @doc """
  Creates the application, then notifies every active Superadmin through
  the same in-app Bell they already use for a new match or chat message
  (bizi_flow.md §6) - no new admin screen. The notification is
  best-effort: a failure there never blocks the application itself from
  being recorded, since the row is the durable record either way.
  """
  def create_application(user_id, attrs) do
    %Application{}
    |> Application.changeset(Map.put(attrs, "user_id", user_id))
    |> Repo.insert()
    |> case do
      {:ok, application} ->
        notify_superadmins(application)
        {:ok, application}

      error ->
        error
    end
  end

  defp notify_superadmins(application) do
    User
    |> where([u], u.admin_role == "superadmin" and u.admin_status == "active")
    |> select([u], u.id)
    |> Repo.all()
    |> Enum.each(fn admin_id ->
      Notifications.notify(admin_id, "bizi_application", "New Bizi application: #{application.company_name}")
    end)
  end
end
