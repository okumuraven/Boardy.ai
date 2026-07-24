defmodule Vokazi.Calling do
  @moduledoc """
  Call sessions - one `CallLog` row per `call_ring`, carried through
  accept/decline/cancel/end/timeout by its id (`call_id`) so
  `ChatRoomChannel`'s handlers - each running on a different socket
  process for the caller vs. the callee - can agree on which call they're
  resolving without any other shared state between them. This same row
  is the ring-timeout guard and the call history view's data source.
  """
  import Ecto.Query, warn: false
  alias Vokazi.Repo
  alias Vokazi.Calling.CallLog
  alias Vokazi.Chat.ChatRoom
  alias Vokazi.Matchmaking.Match

  @doc """
  Starts a call session for whoever just rang from this room, resolving
  the other participant as the callee.
  """
  def start_call(room_id, caller_id) do
    room = Repo.get!(ChatRoom, room_id)
    match = Repo.get!(Match, room.match_id)
    callee_id = if match.user_a_id == caller_id, do: match.user_b_id, else: match.user_a_id

    %CallLog{}
    |> CallLog.changeset(%{match_id: match.id, caller_id: caller_id, callee_id: callee_id, status: "ringing"})
    |> Repo.insert()
  end

  def mark_in_progress(call_id), do: update_status(call_id, "in_progress")
  def mark_declined(call_id), do: update_status(call_id, "declined")
  def mark_cancelled(call_id), do: update_status(call_id, "cancelled")
  def mark_completed(call_id, duration_seconds), do: update_status(call_id, "completed", %{duration_seconds: duration_seconds})

  @doc """
  Only transitions a call to "missed" if it's still sitting in "ringing" -
  the ring-timeout timer and a real accept/decline/cancel race by
  construction (the timer is scheduled the instant the ring goes out),
  so this has to be the atomic, race-safe check rather than a
  fetch-then-write. Returns whether it actually fired, so the caller
  knows whether to bother broadcasting a timeout event.
  """
  def mark_missed_if_still_ringing(call_id) do
    {count, _} =
      from(c in CallLog, where: c.id == ^call_id and c.status == "ringing")
      |> Repo.update_all(set: [status: "missed", updated_at: now()])

    count == 1
  end

  @doc """
  The still-ringing call waiting on this user in this room, if any -
  lets a freshly (re)joined socket learn about it. This matters
  specifically for the tab-was-closed case: the original `call_ring`
  broadcast only reached sockets already subscribed at that instant, so
  someone opening the app from a Web Push notification needs this
  looked up fresh on join rather than relying on having "seen" the
  broadcast.
  """
  def active_ring_for_room(room_id, user_id) do
    room = Repo.get!(ChatRoom, room_id)

    from(c in CallLog,
      where: c.match_id == ^room.match_id and c.callee_id == ^user_id and c.status == "ringing",
      order_by: [desc: c.inserted_at],
      limit: 1,
      preload: [:caller]
    )
    |> Repo.one()
  end

  @doc """
  Every call this user was either side of, most recent first, for the
  call history view. Excludes calls still mid-ring (never resolved,
  shouldn't normally linger, but a crashed process could leave one).
  """
  def list_history(user_id) do
    from(c in CallLog,
      where: (c.caller_id == ^user_id or c.callee_id == ^user_id) and c.status != "ringing",
      order_by: [desc: c.inserted_at],
      preload: [:caller, :callee]
    )
    |> Repo.all()
  end

  defp update_status(call_id, status, extra_attrs \\ %{}) do
    Repo.get!(CallLog, call_id)
    |> CallLog.changeset(Map.merge(extra_attrs, %{status: status}))
    |> Repo.update()
  end

  defp now, do: NaiveDateTime.utc_now() |> NaiveDateTime.truncate(:second)
end
