defmodule Vokazi.Scheduling.Reminder do
  @moduledoc """
  Nudges the other side of a match with a real chat message when
  they haven't resolved their scheduling step - rate-limited so it
  stays a courtesy, not spam. Reuses the existing chat infrastructure
  rather than inventing a separate notification channel.
  """

  alias Vokazi.Repo
  alias Vokazi.Accounts.User
  alias Vokazi.Chat
  alias Vokazi.Scheduling.IntroSchedule

  @cooldown_seconds 30 * 60

  def cooldown_seconds, do: @cooldown_seconds

  @doc """
  Sends the reminder and records `last_reminder_sent_at` on `schedule`,
  or returns `{:error, :on_cooldown}` if one already went out recently.
  """
  def send(match_id, user_id, schedule) do
    if on_cooldown?(schedule) do
      {:error, :on_cooldown}
    else
      post_message(match_id, user_id)

      schedule
      |> IntroSchedule.changeset(%{last_reminder_sent_at: DateTime.utc_now() |> DateTime.truncate(:second)})
      |> Repo.update()
    end
  end

  defp on_cooldown?(%{last_reminder_sent_at: nil}), do: false

  defp on_cooldown?(%{last_reminder_sent_at: last}) do
    DateTime.diff(DateTime.utc_now(), last, :second) < @cooldown_seconds
  end

  defp post_message(match_id, user_id) do
    sender = Repo.get!(User, user_id)
    room = Chat.get_chat_room_by_match_id!(match_id)

    {:ok, message} =
      Chat.create_message(%{
        content: "🔔 Reminder from #{sender.full_name}: ready to lock in a time for our intro call?",
        sender_id: user_id,
        chat_room_id: room.id,
        notification_type: "calendar_reminder"
      })

    VokaziWeb.Endpoint.broadcast!("chat_room:#{room.id}", "new_msg", %{
      id: message.id,
      content: message.content,
      sender_id: message.sender_id,
      sender_name: sender.full_name,
      inserted_at: message.inserted_at
    })
  end
end
