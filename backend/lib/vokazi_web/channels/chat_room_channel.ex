defmodule VokaziWeb.ChatRoomChannel do
  use VokaziWeb, :channel

  alias Vokazi.{Calling, Chat, Notifications, Repo}
  alias Vokazi.Accounts.User
  alias VokaziWeb.Presence

  # If a ring never resolves (callee's app is closed, or they just never
  # answer), the caller shouldn't be stuck on "Calling..." forever and
  # the callee's incoming-call UI shouldn't linger for a call that's
  # effectively dead. Server-scheduled (not a client-side timer) so it
  # still fires even if the caller's tab is what closes.
  @ring_timeout_ms 45_000

  @impl true
  def join("chat_room:" <> room_id_str, _payload, socket) do
    user_id = socket.assigns.user_id
    room_id = String.to_integer(room_id_str)
    room = Chat.get_chat_room!(room_id)

    with true <- room.is_active,
         true <- Chat.participant?(room_id, user_id) do
      send(self(), :after_join)
      {:ok, assign(socket, :room_id, room_id)}
    else
      false -> {:error, %{reason: "unauthorized"}}
    end
  rescue
    Ecto.NoResultsError -> {:error, %{reason: "not_found"}}
    ArgumentError -> {:error, %{reason: "not_found"}}
  end

  @impl true
  def handle_info(:after_join, socket) do
    room_id = socket.assigns.room_id
    user_id = socket.assigns.user_id

    messages = Chat.list_recent_messages(room_id)
    push(socket, "history", %{messages: Enum.map(messages, &serialize_message/1)})

    {:ok, _ref} = Presence.track(socket, to_string(user_id), %{online_at: System.system_time(:second)})
    push(socket, "presence_state", Presence.list(socket))

    # Re-surfaces a still-ringing call for whoever just (re)joined - the
    # case that matters is someone opening the app from the Web Push
    # notification below, whose channel didn't exist yet when the
    # original `call_ring` broadcast went out.
    case Calling.active_ring_for_room(room_id, user_id) do
      nil ->
        :ok

      call_log ->
        push(socket, "call_ring", %{
          from_user_id: call_log.caller_id,
          from_name: call_log.caller && call_log.caller.full_name,
          call_id: call_log.id
        })
    end

    {:noreply, socket}
  end

  # Fires exactly once, @ring_timeout_ms after the ring - a no-op unless
  # the call is still sitting in "ringing" (guards the race against a
  # real accept/decline/cancel that resolved it in the meantime).
  @impl true
  def handle_info({:ring_timeout, call_id, caller_id, callee_id}, socket) do
    if Calling.mark_missed_if_still_ringing(call_id) do
      create_call_message(socket, caller_id, "📞 Missed call")
      broadcast!(socket, "call_timeout", %{})
      notify_call_resolved(callee_id, call_id, "call_timeout")
    end

    {:noreply, socket}
  end

  @impl true
  def handle_in("new_msg", %{"content" => content}, socket) do
    user_id = socket.assigns.user_id
    room_id = socket.assigns.room_id

    case Chat.create_message(%{content: content, sender_id: user_id, chat_room_id: room_id}) do
      {:ok, message} ->
        broadcast!(socket, "new_msg", serialize_message(message))
        {:reply, :ok, socket}

      {:error, changeset} ->
        {:reply, {:error, %{reason: changeset_error_message(changeset)}}, socket}
    end
  end

  def handle_in("new_msg", _payload, socket) do
    {:reply, {:error, %{reason: "invalid_payload"}}, socket}
  end

  @impl true
  def handle_in("load_more", %{"before_id" => before_id}, socket) do
    messages = Chat.list_messages_before(socket.assigns.room_id, before_id)
    {:reply, {:ok, %{messages: Enum.map(messages, &serialize_message/1)}}, socket}
  end

  # In-App Calling, Phase 1 (call_feature.md) - bare-bones signaling only,
  # no real media yet (that's Phase 2). Reuses this channel's existing
  # join/authorization instead of a separate topic, since a call is only
  # ever between the same two people already allowed in this room.
  #
  # Phase 3 (call_history + ring-timeout): every ring now creates a
  # `Vokazi.Calling.CallLog` row, and its id (`call_id`) is round-tripped
  # through every subsequent event. That's the only way the caller's and
  # callee's handlers - each running on its own socket process, with no
  # other shared state - can agree on which call they're resolving.

  @impl true
  def handle_in("call_ring", _payload, socket) do
    caller = Repo.get(User, socket.assigns.user_id)
    caller_name = (caller && caller.full_name) || "Someone"

    case Calling.start_call(socket.assigns.room_id, socket.assigns.user_id) do
      {:ok, call_log} ->
        Process.send_after(
          self(),
          {:ring_timeout, call_log.id, socket.assigns.user_id, call_log.callee_id},
          @ring_timeout_ms
        )

        notify_callee_if_absent(socket, call_log, caller_name)

        # Global, app-wide ring alert on the callee's own always-connected
        # personal channel (the same one NotificationBell keeps open) -
        # `chat_room:{room_id}` below only reaches someone who already has
        # this exact chat open, which is the whole gap this closes.
        VokaziWeb.Endpoint.broadcast!("user:#{call_log.callee_id}", "call_ring", %{
          call_id: call_log.id,
          room_id: socket.assigns.room_id,
          match_id: call_log.match_id,
          from_user_id: socket.assigns.user_id,
          from_name: caller_name
        })

        broadcast_from!(socket, "call_ring", %{
          from_user_id: socket.assigns.user_id,
          from_name: caller_name,
          call_id: call_log.id
        })

        {:reply, {:ok, %{call_id: call_log.id}}, socket}

      {:error, _changeset} ->
        {:reply, {:error, %{reason: "could_not_start_call"}}, socket}
    end
  end

  @impl true
  def handle_in("call_accept", %{"call_id" => call_id}, socket) do
    with {:ok, call_log} <- Calling.mark_in_progress(call_id) do
      notify_call_resolved(call_log.callee_id, call_id, "call_accepted")
    end

    broadcast!(socket, "call_accepted", %{accepted_at: System.system_time(:second)})
    {:reply, :ok, socket}
  end

  def handle_in("call_accept", _payload, socket) do
    {:reply, {:error, %{reason: "invalid_payload"}}, socket}
  end

  @impl true
  def handle_in("call_decline", %{"call_id" => call_id}, socket) do
    with {:ok, call_log} <- Calling.mark_declined(call_id) do
      notify_call_resolved(call_log.callee_id, call_id, "call_declined")
      # The authoritative caller_id from the CallLog row itself, never a
      # client-supplied payload field - a payload claim would let anyone
      # attribute the "Missed call" message to whichever user_id they liked.
      create_call_message(socket, call_log.caller_id, "📞 Missed call")
    end

    broadcast!(socket, "call_declined", %{})
    {:reply, :ok, socket}
  end

  def handle_in("call_decline", _payload, socket) do
    {:reply, {:error, %{reason: "invalid_payload"}}, socket}
  end

  @impl true
  def handle_in("call_cancel", %{"call_id" => call_id}, socket) do
    with {:ok, call_log} <- Calling.mark_cancelled(call_id) do
      notify_call_resolved(call_log.callee_id, call_id, "call_cancelled")
    end

    create_call_message(socket, socket.assigns.user_id, "📞 Missed call")
    broadcast_from!(socket, "call_cancelled", %{})
    {:reply, :ok, socket}
  end

  def handle_in("call_cancel", _payload, socket) do
    {:reply, {:error, %{reason: "invalid_payload"}}, socket}
  end

  @impl true
  def handle_in("call_end", %{"call_id" => call_id} = payload, socket) do
    duration_seconds = Map.get(payload, "duration_seconds", 0)
    Calling.mark_completed(call_id, duration_seconds)
    create_call_message(socket, socket.assigns.user_id, "📞 Call ended (#{format_duration(duration_seconds)})")
    broadcast_from!(socket, "call_ended", %{})
    {:reply, :ok, socket}
  end

  def handle_in("call_end", _payload, socket) do
    {:reply, {:error, %{reason: "invalid_payload"}}, socket}
  end

  # In-App Calling, Phase 2 (call_feature.md) - real media signaling.
  # Pure relay: the backend never interprets SDP/ICE content, it just
  # forwards whatever the caller/callee's browsers hand each other over
  # this same authorized topic. `broadcast_from!` since a client never
  # needs to see its own offer/answer/candidate echoed back.

  @impl true
  def handle_in("webrtc_offer", %{"sdp" => sdp}, socket) do
    broadcast_from!(socket, "webrtc_offer", %{sdp: sdp})
    {:reply, :ok, socket}
  end

  def handle_in("webrtc_offer", _payload, socket) do
    {:reply, {:error, %{reason: "invalid_payload"}}, socket}
  end

  @impl true
  def handle_in("webrtc_answer", %{"sdp" => sdp}, socket) do
    broadcast_from!(socket, "webrtc_answer", %{sdp: sdp})
    {:reply, :ok, socket}
  end

  def handle_in("webrtc_answer", _payload, socket) do
    {:reply, {:error, %{reason: "invalid_payload"}}, socket}
  end

  @impl true
  def handle_in("webrtc_ice_candidate", %{"candidate" => candidate}, socket) do
    broadcast_from!(socket, "webrtc_ice_candidate", %{candidate: candidate})
    {:reply, :ok, socket}
  end

  def handle_in("webrtc_ice_candidate", _payload, socket) do
    {:reply, {:error, %{reason: "invalid_payload"}}, socket}
  end

  # Web Push for the tab-closed case - same "absent" check
  # `Chat.notify_recipient_if_absent/2` already uses for messages
  # (Presence on this specific chat_room). If the callee opens the app
  # from the notification, the `active_ring_for_room` check in
  # `handle_info(:after_join, ...)` above is what actually re-surfaces
  # the ring on their client - the original broadcast never reached a
  # socket that didn't exist yet.
  defp notify_callee_if_absent(socket, call_log, caller_name) do
    present? =
      "chat_room:#{socket.assigns.room_id}"
      |> Presence.list()
      |> Map.has_key?(to_string(call_log.callee_id))

    unless present? do
      link =
        Jason.encode!(%{
          room_id: socket.assigns.room_id,
          match_id: call_log.match_id,
          partner_name: caller_name,
          open_call: true
        })

      Notifications.notify(call_log.callee_id, "incoming_call", "📞 Incoming call from #{caller_name}", link)
    end
  end

  # Dismisses the global call banner (`user:{callee_id}`, see `call_ring`
  # above) the instant a call resolves any way other than the callee
  # tapping the banner itself (which clears its own local state
  # immediately, client-side) - otherwise it could linger showing a call
  # that's already been answered, declined, cancelled, or timed out.
  defp notify_call_resolved(callee_id, call_id, event) do
    VokaziWeb.Endpoint.broadcast!("user:#{callee_id}", event, %{call_id: call_id})
  end

  # Same "create, then broadcast new_msg" pattern the real send path
  # (handle_in("new_msg", ...) above) already uses - without this, the
  # system message gets persisted but never shows up live in either
  # side's open chat window, only on the next reload.
  defp create_call_message(socket, sender_id, content) do
    case Chat.create_message(%{content: content, sender_id: sender_id, chat_room_id: socket.assigns.room_id}) do
      {:ok, message} -> broadcast!(socket, "new_msg", serialize_message(message))
      {:error, _changeset} -> :ok
    end
  end

  defp format_duration(seconds) when is_number(seconds) and seconds >= 0 do
    total_seconds = trunc(seconds)
    minutes = div(total_seconds, 60)
    remaining_seconds = rem(total_seconds, 60)
    "#{minutes}m #{remaining_seconds}s"
  end

  defp format_duration(_seconds), do: "0m 0s"

  defp serialize_message(message) do
    %{
      id: message.id,
      content: message.content,
      sender_id: message.sender_id,
      sender_name: message.sender && message.sender.full_name,
      inserted_at: Vokazi.DateTimeJSON.utc(message.inserted_at)
    }
  end

  defp changeset_error_message(changeset) do
    changeset.errors
    |> Enum.map(fn {field, {msg, _}} -> "#{field} #{msg}" end)
    |> Enum.join(", ")
  end
end
