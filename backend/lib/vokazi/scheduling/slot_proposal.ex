defmodule Vokazi.Scheduling.SlotProposal do
  @moduledoc """
  Background step that runs once both sides have explicitly submitted
  their offered availability via `Vokazi.Scheduling.submit_manual_availability/3`
  - whether that was typed in manually or curated from a real Calendar
  free-day picker (`Vokazi.Scheduling.MyFreeDays`), it lands in the same
  `manual_availability_a/b` fields either way. Intersects them into
  mutual candidate slots and generates each side's private AI briefing
  about the other person. Triggered by `Vokazi.Scheduling`, never called
  synchronously from a controller.
  """

  require Logger
  alias Vokazi.Repo
  alias Vokazi.Accounts.{User, Profile}
  alias Vokazi.Scheduling.{IntroSchedule, SlotMatcher, Briefing}

  def maybe_run(match, %{manual_availability_a: a, manual_availability_b: b} = schedule)
      when a != [] and b != [] do
    Task.start(fn -> run(match, schedule) end)
  end

  def maybe_run(_match, _schedule), do: :ok

  defp run(match, schedule) do
    windows_a = SlotMatcher.free_windows_from_manual(schedule.manual_availability_a)
    windows_b = SlotMatcher.free_windows_from_manual(schedule.manual_availability_b)

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
