defmodule VokaziWeb.ChatRoomChannelTest do
  use VokaziWeb.ChannelCase

  alias Vokazi.{Repo, Accounts.User, Matchmaking.Match, Chat.ChatRoom}

  setup do
    {:ok, user_a} =
      %User{}
      |> User.changeset(%{wallet_address: "0xaaa", full_name: "Alice", role: "founder", onboarding_completed: true})
      |> Repo.insert()

    {:ok, user_b} =
      %User{}
      |> User.changeset(%{wallet_address: "0xbbb", full_name: "Bob", role: "founder", onboarding_completed: true})
      |> Repo.insert()

    {:ok, outsider} =
      %User{}
      |> User.changeset(%{wallet_address: "0xccc", full_name: "Eve", role: "founder", onboarding_completed: true})
      |> Repo.insert()

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

  defp connect_socket(user_id) do
    Phoenix.ChannelTest.connect(VokaziWeb.UserSocket, %{"user_id" => to_string(user_id)})
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
end
