defmodule Vokazi.Scheduling.SlotProposal do
  @moduledoc """
  Background step that runs once both sides of an intro have resolved
  their availability source (Calendar or manual): intersects free
  windows into mutual candidate slots and generates each side's private
  AI briefing about the other person. Triggered by `Vokazi.Scheduling`,
  never called synchronously from a controller.
  """

  require Logger
  alias Vokazi.Repo
  alias Vokazi.Accounts.{User, Profile}
  alias Vokazi.Scheduling.{IntroSchedule, CredentialStore, GoogleCalendarClient, SlotMatcher, Briefing}

  @availability_window_days 7
  @business_start_hour 8
  @business_end_hour 18

  def maybe_run(match, %{consent_a: a, consent_b: b} = schedule) when not is_nil(a) and not is_nil(b) do
    Task.start(fn -> run(match, schedule) end)
  end

  def maybe_run(_match, _schedule), do: :ok

  defp run(match, schedule) do
    windows_a = availability_windows(match.user_a_id, schedule.consent_a, schedule.manual_availability_a)
    windows_b = availability_windows(match.user_b_id, schedule.consent_b, schedule.manual_availability_b)

    slots =
      SlotMatcher.propose_slots(windows_a, windows_b)
      |> Enum.map(&%{"start" => DateTime.to_iso8601(&1.start), "end" => DateTime.to_iso8601(&1.end)})

    {agenda_a, agenda_b} = generate_briefings(match)

    schedule
    |> IntroSchedule.changeset(%{
      proposed_slots: slots,
      agenda_summary_a: agenda_a,
      agenda_summary_b: agenda_b,
      status: if(slots == [], do: schedule.status, else: "slot_proposed")
    })
    |> Repo.update!()
  rescue
    e -> Logger.error("Vokazi.Scheduling.SlotProposal: failed for match #{match.id}: #{inspect(e)}")
  end

  defp availability_windows(user_id, true, _manual) do
    with {:ok, access_token} <- CredentialStore.token_for(user_id) do
      range_start = DateTime.utc_now()
      range_end = DateTime.add(range_start, @availability_window_days * 24 * 3600, :second)

      case GoogleCalendarClient.freebusy(access_token, range_start, range_end) do
        {:ok, busy} ->
          SlotMatcher.free_windows_from_busy(busy, range_start, range_end, @business_start_hour, @business_end_hour)

        {:error, _} ->
          []
      end
    else
      _ -> []
    end
  end

  defp availability_windows(_user_id, _consent, manual), do: SlotMatcher.free_windows_from_manual(manual)

  defp generate_briefings(match) do
    user_a = Repo.get!(User, match.user_a_id)
    user_b = Repo.get!(User, match.user_b_id)
    profile_a = Repo.get_by!(Profile, user_id: match.user_a_id)
    profile_b = Repo.get_by!(Profile, user_id: match.user_b_id)

    a_view = %{name: user_a.full_name, offer_text: profile_a.offer_text, need_text: profile_a.need_text}
    b_view = %{name: user_b.full_name, offer_text: profile_b.offer_text, need_text: profile_b.need_text}

    {encode(Briefing.generate(a_view, b_view)), encode(Briefing.generate(b_view, a_view))}
  end

  defp encode({:ok, briefing}), do: Jason.encode!(briefing)
  defp encode({:error, _}), do: nil
end
