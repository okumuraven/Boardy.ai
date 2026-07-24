defmodule VokaziWeb.ChatRoomChannelTest do
  use VokaziWeb.ChannelCase

  alias Vokazi.{Repo, Accounts.User, Matchmaking.Match, Chat.ChatRoom}
  alias Vokazi.Calling.CallLog
  alias Vokazi.Notifications.Notification

  setup do
    user_a = create_user!("google-sub-aaa", "Alice")
    user_b = create_user!("google-sub-bbb", "Bob")
    outsider = create_user!("google-sub-ccc", "Eve")

    {:ok, match} =
      %Match{}
      |> Match.changeset(%{
        similarity_score: 0.9,
        status: "unlocked",
        user_a_id: user_a.id,
        user_b_id: user_b.id
      })
      |> Repo.insert()

    {:ok, room} =
      %ChatRoom{}
      |> ChatRoom.changeset(%{match_id: match.id, is_active: true})
      |> Repo.insert()

    %{user_a: user_a, user_b: user_b, outsider: outsider, room: room}
  end

  # Mirrors the real sign-in flow: identity comes from a verified Google
  # ID token (`google_signin_changeset/2`), profile completion is a
  # separate, later step (`changeset/2`) - matching how
  # `Vokazi.Auth.GoogleSignIn`/`ProfileController.update/2` actually
  # populate a user in production, rather than a single shortcut cast.
  defp create_user!(google_sub, full_name) do
    {:ok, user} =
      %User{}
      |> User.google_signin_changeset(%{google_sub: google_sub, full_name: full_name})
      |> Repo.insert()

    {:ok, user} =
      user
      |> User.changeset(%{full_name: full_name, role: "founder", onboarding_completed: true})
      |> Repo.update()

    user
  end

  defp connect_socket(user_id) do
    token = Vokazi.Auth.Session.issue_token(user_id)
    Phoenix.ChannelTest.connect(VokaziWeb.UserSocket, %{"token" => token})
  end

  test "a participant can join their chat room", %{user_a: user_a, room: room} do
    {:ok, socket} = connect_socket(user_a.id)
    assert {:ok, _reply, _socket} = Phoenix.ChannelTest.subscribe_and_join(socket, "chat_room:#{room.id}", %{})
  end

  test "a non-participant is rejected from joining", %{outsider: outsider, room: room} do
    {:ok, socket} = connect_socket(outsider.id)

    assert {:error, %{reason: "unauthorized"}} =
             Phoenix.ChannelTest.subscribe_and_join(socket, "chat_room:#{room.id}", %{})
  end

  test "joining a nonexistent room is rejected cleanly", %{user_a: user_a} do
    {:ok, socket} = connect_socket(user_a.id)
    assert {:error, %{reason: "not_found"}} = Phoenix.ChannelTest.subscribe_and_join(socket, "chat_room:999999", %{})
  end

  test "sending a message broadcasts it to both participants", %{user_a: user_a, room: room} do
    {:ok, socket} = connect_socket(user_a.id)
    {:ok, _reply, socket} = Phoenix.ChannelTest.subscribe_and_join(socket, "chat_room:#{room.id}", %{})

    ref = Phoenix.ChannelTest.push(socket, "new_msg", %{"content" => "hello there"})
    assert_reply(ref, :ok)
    assert_broadcast("new_msg", %{content: "hello there", sender_id: sender_id})
    assert sender_id == user_a.id
  end

  test "a blank message is rejected", %{user_a: user_a, room: room} do
    {:ok, socket} = connect_socket(user_a.id)
    {:ok, _reply, socket} = Phoenix.ChannelTest.subscribe_and_join(socket, "chat_room:#{room.id}", %{})

    ref = Phoenix.ChannelTest.push(socket, "new_msg", %{"content" => "   "})
    assert_reply(ref, :error, %{reason: _reason})
  end

  test "load_more paginates messages strictly before a given id", %{user_a: user_a, room: room} do
    messages =
      for i <- 1..5 do
        {:ok, message} =
          Vokazi.Chat.create_message(%{content: "msg #{i}", sender_id: user_a.id, chat_room_id: room.id})

        message
      end

    {:ok, socket} = connect_socket(user_a.id)
    {:ok, _reply, socket} = Phoenix.ChannelTest.subscribe_and_join(socket, "chat_room:#{room.id}", %{})

    anchor = Enum.at(messages, 2)
    ref = Phoenix.ChannelTest.push(socket, "load_more", %{"before_id" => anchor.id})
    assert_reply(ref, :ok, %{messages: older})

    assert Enum.map(older, & &1.content) == ["msg 1", "msg 2"]
  end

  describe "in-app calling (Phase 3: call history + ring-timeout)" do
    setup %{user_a: user_a, user_b: user_b, room: room} do
      {:ok, socket_a} = connect_socket(user_a.id)
      {:ok, _reply, socket_a} = Phoenix.ChannelTest.subscribe_and_join(socket_a, "chat_room:#{room.id}", %{})

      {:ok, socket_b} = connect_socket(user_b.id)
      {:ok, _reply, socket_b} = Phoenix.ChannelTest.subscribe_and_join(socket_b, "chat_room:#{room.id}", %{})

      %{socket_a: socket_a, socket_b: socket_b}
    end

    test "call_ring creates a CallLog row naming the right caller/callee", %{
      user_a: user_a,
      user_b: user_b,
      socket_a: socket_a
    } do
      ref = Phoenix.ChannelTest.push(socket_a, "call_ring", %{})
      assert_reply(ref, :ok, %{call_id: call_id})
      assert_broadcast("call_ring", %{call_id: ^call_id, from_user_id: from_id})
      assert from_id == user_a.id

      call_log = Repo.get!(CallLog, call_id)
      assert call_log.status == "ringing"
      assert call_log.caller_id == user_a.id
      assert call_log.callee_id == user_b.id
    end

    test "ring -> accept -> end moves the CallLog through in_progress to completed with duration", %{
      socket_a: socket_a,
      socket_b: socket_b
    } do
      ref = Phoenix.ChannelTest.push(socket_a, "call_ring", %{})
      assert_reply(ref, :ok, %{call_id: call_id})
      assert_broadcast("call_ring", %{})

      ref2 = Phoenix.ChannelTest.push(socket_b, "call_accept", %{"call_id" => call_id})
      assert_reply(ref2, :ok)
      assert_broadcast("call_accepted", %{})
      assert Repo.get!(CallLog, call_id).status == "in_progress"

      ref3 = Phoenix.ChannelTest.push(socket_a, "call_end", %{"call_id" => call_id, "duration_seconds" => 125})
      assert_reply(ref3, :ok)
      assert_broadcast("call_ended", %{})

      completed = Repo.get!(CallLog, call_id)
      assert completed.status == "completed"
      assert completed.duration_seconds == 125
    end

    test "declining a ring marks the CallLog declined", %{user_a: user_a, socket_a: socket_a, socket_b: socket_b} do
      ref = Phoenix.ChannelTest.push(socket_a, "call_ring", %{})
      assert_reply(ref, :ok, %{call_id: call_id})
      assert_broadcast("call_ring", %{})

      ref2 = Phoenix.ChannelTest.push(socket_b, "call_decline", %{"call_id" => call_id})
      assert_reply(ref2, :ok)
      assert_broadcast("call_declined", %{})
      # The "Missed call" message is attributed to the CallLog's real
      # caller_id, never a client-supplied payload field - guards against
      # the spoofing bug this handler used to have.
      assert_broadcast("new_msg", %{sender_id: sender_id})
      assert sender_id == user_a.id

      assert Repo.get!(CallLog, call_id).status == "declined"
    end

    test "cancelling an outgoing ring marks the CallLog cancelled", %{socket_a: socket_a} do
      ref = Phoenix.ChannelTest.push(socket_a, "call_ring", %{})
      assert_reply(ref, :ok, %{call_id: call_id})
      assert_broadcast("call_ring", %{})

      ref2 = Phoenix.ChannelTest.push(socket_a, "call_cancel", %{"call_id" => call_id})
      assert_reply(ref2, :ok)
      assert_broadcast("call_cancelled", %{})

      assert Repo.get!(CallLog, call_id).status == "cancelled"
    end

    test "an unanswered ring times out and marks the CallLog missed", %{
      user_a: user_a,
      user_b: user_b,
      socket_a: socket_a
    } do
      ref = Phoenix.ChannelTest.push(socket_a, "call_ring", %{})
      assert_reply(ref, :ok, %{call_id: call_id})
      assert_broadcast("call_ring", %{})

      # Fires the exact handle_info/2 clause the real @ring_timeout_ms
      # timer invokes, without waiting the real 45s.
      send(socket_a.channel_pid, {:ring_timeout, call_id, user_a.id, user_b.id})
      assert_broadcast("call_timeout", %{})

      assert Repo.get!(CallLog, call_id).status == "missed"
    end

    test "a timeout that fires after the call already resolved is a no-op", %{
      user_a: user_a,
      user_b: user_b,
      socket_a: socket_a,
      socket_b: socket_b
    } do
      ref = Phoenix.ChannelTest.push(socket_a, "call_ring", %{})
      assert_reply(ref, :ok, %{call_id: call_id})
      assert_broadcast("call_ring", %{})

      ref2 = Phoenix.ChannelTest.push(socket_b, "call_accept", %{"call_id" => call_id})
      assert_reply(ref2, :ok)
      assert_broadcast("call_accepted", %{})

      send(socket_a.channel_pid, {:ring_timeout, call_id, user_a.id, user_b.id})
      refute_broadcast("call_timeout", %{})

      assert Repo.get!(CallLog, call_id).status == "in_progress"
    end
  end

  describe "call_ring Web Push notification (Phase 3)" do
    test "notifies the callee when they are not present in this room", %{
      user_a: user_a,
      user_b: user_b,
      room: room
    } do
      {:ok, socket_a} = connect_socket(user_a.id)
      {:ok, _reply, socket_a} = Phoenix.ChannelTest.subscribe_and_join(socket_a, "chat_room:#{room.id}", %{})

      ref = Phoenix.ChannelTest.push(socket_a, "call_ring", %{})
      assert_reply(ref, :ok, %{})

      notification = Repo.get_by(Notification, user_id: user_b.id, type: "incoming_call")
      assert notification
      assert notification.body =~ "Incoming call from Alice"
    end

    test "does not notify when the callee is already present in this room", %{
      user_a: user_a,
      user_b: user_b,
      room: room
    } do
      {:ok, socket_a} = connect_socket(user_a.id)
      {:ok, _reply, socket_a} = Phoenix.ChannelTest.subscribe_and_join(socket_a, "chat_room:#{room.id}", %{})

      {:ok, socket_b} = connect_socket(user_b.id)
      {:ok, _reply, _socket_b} = Phoenix.ChannelTest.subscribe_and_join(socket_b, "chat_room:#{room.id}", %{})
      # `:after_join` (which runs `Presence.track`) is an async
      # self-message, not guaranteed to have run by the time join/3
      # returns - give socket_b's channel process a beat to process it
      # before the ring below checks Presence from a different process.
      Process.sleep(50)

      ref = Phoenix.ChannelTest.push(socket_a, "call_ring", %{})
      assert_reply(ref, :ok, %{})

      refute Repo.get_by(Notification, user_id: user_b.id, type: "incoming_call")
    end

    test "a socket that (re)joins while a call is still ringing gets the ring re-pushed", %{
      user_a: user_a,
      user_b: user_b,
      room: room
    } do
      {:ok, socket_a} = connect_socket(user_a.id)
      {:ok, _reply, socket_a} = Phoenix.ChannelTest.subscribe_and_join(socket_a, "chat_room:#{room.id}", %{})

      ref = Phoenix.ChannelTest.push(socket_a, "call_ring", %{})
      assert_reply(ref, :ok, %{call_id: call_id})

      # user_b's channel didn't exist yet when the ring broadcast above
      # went out - joining now (as if tapping the push notification)
      # should still learn about the still-ringing call via after_join.
      {:ok, socket_b} = connect_socket(user_b.id)
      {:ok, _reply, _socket_b} = Phoenix.ChannelTest.subscribe_and_join(socket_b, "chat_room:#{room.id}", %{})

      assert_push("call_ring", %{call_id: ^call_id, from_user_id: from_id})
      assert from_id == user_a.id
    end
  end
end
