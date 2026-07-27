defmodule Vokazi.Admin.Schedules do
  @moduledoc """
  Admin read visibility into the Google Calendar intro-scheduling
  pipeline (`Vokazi.Scheduling`) - currently a total black box with no
  way to answer "why didn't this Bizi ever get their calendar invite."
  Status-only for Support; briefing content and credential health are
  genuinely Tier 2/3 (a private, AI-generated summary about a specific
  member for a specific counterpart), so only Moderator+ sees them. See
  "Admin panel.md" §8.
  """

  import Ecto.Query, warn: false

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Matchmaking.Match
  alias Vokazi.Scheduling.{IntroSchedule, CalendarCredential}

  @per_page 25
  # No real progress in this many days despite the intro being live -
  # worth a look, regardless of which specific status it's stuck at.
  @stuck_threshold_days 5

  @doc "`opts` (all optional): :status, :page."
  def list_schedules(opts \\ %{}) do
    page = max(Map.get(opts, :page, 1), 1)
    status = blank_to_nil(Map.get(opts, :status))

    base_query = from(s in IntroSchedule) |> maybe_filter_status(status)
    total_count = base_query |> select([s], count(s.id)) |> Repo.one()

    rows =
      base_query
      |> order_by([s], desc: s.updated_at)
      |> limit(^@per_page)
      |> offset(^((page - 1) * @per_page))
      |> Repo.all()

    %{
      schedules: Enum.map(rows, &to_summary/1),
      page: page,
      per_page: @per_page,
      total_count: total_count,
      total_pages: max(ceil(total_count / @per_page), 1)
    }
  end

  defp to_summary(schedule) do
    match = Repo.get(Match, schedule.match_id)
    user_a = match && Repo.get(User, match.user_a_id)
    user_b = match && Repo.get(User, match.user_b_id)

    %{
      id: schedule.id,
      match_id: schedule.match_id,
      status: schedule.status,
      user_a: %{id: match && match.user_a_id, name: user_a && user_a.full_name},
      user_b: %{id: match && match.user_b_id, name: user_b && user_b.full_name},
      stuck: stuck?(schedule),
      updated_at: schedule.updated_at,
      inserted_at: schedule.inserted_at
    }
  end

  defp stuck?(%{status: status}) when status in ["confirmed", "declined"], do: false

  defp stuck?(schedule) do
    NaiveDateTime.diff(NaiveDateTime.utc_now(), schedule.updated_at, :day) > @stuck_threshold_days
  end

  @doc """
  Status-only projection for Support; `full_detail?: true` (Moderator+)
  additionally includes briefing content and per-side Calendar
  credential health.
  """
  def get_schedule(id, full_detail?) do
    case Repo.get(IntroSchedule, id) do
      nil ->
        nil

      schedule ->
        base = to_summary(schedule)

        if full_detail? do
          match = Repo.get(Match, schedule.match_id)

          Map.merge(base, %{
            proposed_slots: schedule.proposed_slots,
            selected_slot_a: schedule.selected_slot_a,
            selected_slot_b: schedule.selected_slot_b,
            agenda_summary_a: schedule.agenda_summary_a,
            agenda_summary_b: schedule.agenda_summary_b,
            confirmed_start: schedule.confirmed_start,
            confirmed_end: schedule.confirmed_end,
            google_meet_link: schedule.google_meet_link,
            credential_health: %{
              user_a: credential_health(match && match.user_a_id),
              user_b: credential_health(match && match.user_b_id)
            }
          })
        else
          base
        end
    end
  end

  defp credential_health(nil), do: nil

  defp credential_health(user_id) do
    case Repo.get_by(CalendarCredential, user_id: user_id) do
      nil -> %{connected: false}
      cred -> %{connected: true, expired: DateTime.compare(cred.expires_at, DateTime.utc_now()) != :gt}
    end
  end

  defp blank_to_nil(nil), do: nil
  defp blank_to_nil(""), do: nil
  defp blank_to_nil(value), do: value

  defp maybe_filter_status(query, nil), do: query
  defp maybe_filter_status(query, status), do: where(query, [s], s.status == ^status)
end
