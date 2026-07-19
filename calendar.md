# Chat & Escrow-Gated Calendar — How They're Built

Reference doc written 2026-07-19, right after the Calendar feature shipped, to ground the next
conversation about a notification system. Both systems are real and working (not mocked) — this
documents actual code, not intent.

---

## 1. Real-Time Chat System

**Transport:** Phoenix Channels over a single WebSocket per user (`VokaziWeb.UserSocket`,
`backend/lib/vokazi_web/channels/user_socket.ex`). The socket itself carries no per-room identity —
just `user_id`, parsed from the connect params and coerced to an integer (Vapi/JS always sends it as
a string). Channels are joined per-room on topic `chat_room:<room_id>`
(`VokaziWeb.ChatRoomChannel`, `backend/lib/vokazi_web/channels/chat_room_channel.ex`).

**Authorization happens at join, not at connect.** `ChatRoomChannel.join/3` loads the room, checks
`room.is_active`, and calls `Vokazi.Chat.participant?(room_id, user_id)` — true only if `user_id` is
`user_a_id` or `user_b_id` on the `Match` behind that room. Fail either check and the join is
rejected with `{:error, %{reason: "unauthorized"}}` before any message history is ever sent.

**Message flow:**
1. Client pushes `"new_msg"` with `%{"content" => text}` over the already-joined channel.
2. `ChatRoomChannel.handle_in/3` calls `Vokazi.Chat.create_message/1` — a plain Ecto insert
   (`backend/lib/vokazi/chat.ex`), tagged with `sender_id` from `socket.assigns.user_id` (never
   trusted from the payload).
3. On success, `broadcast!(socket, "new_msg", serialize_message(message))` fans it out to every
   socket currently joined to that topic — including the sender's own client, which is how the
   UI shows its own message without a separate optimistic-update path.
4. Anyone NOT currently joined to that topic (tab closed, on a different screen, phone locked)
   simply never receives the event. There is no queue, no offline delivery, nothing — Phoenix
   Channels only deliver to sockets that are live and subscribed *right now*. This is the
   exact gap the notification system needs to close (see §3).

**History on join:** the channel pushes the most recent 50 messages (`Chat.list_recent_messages/2`)
as a one-time `"history"` event right after join; `"load_more"` does keyset pagination
(`Chat.list_messages_before/3`, `before_id` cursor) for scrolling further back.

**Presence:** `VokaziWeb.Presence` (Phoenix Presence, backed by the same PubSub) tracks who's
currently joined to a room's topic. `channel.on("presence_state"/"presence_diff")` on the client
maintains a local presence map; `ChatSystem.jsx`'s `updatePresence` callback derives a simple
"is the other participant online right now" boolean from it. This is presence, not notification —
it tells you if someone is *currently connected*, not whether they saw anything.

**The chat room's own gate:** a `ChatRoom` row is only ever created once a match fully unlocks —
`Vokazi.Matchmaking.record_stake!/3` calls `Chat.create_chat_room/1` the moment both sides'
Avalanche stakes are independently verified on-chain. There is no chat before that; the whole
feature is downstream of the Trust-Gate.

**Client:** `frontend/src/components/ChatSystem.jsx` (`ChatRoomView`). One `useEffect` owns the
entire socket/channel lifecycle (connect → join → wire up `history`/`new_msg`/`presence_*` handlers
→ cleanup on unmount). Sending a message is a raw `channel.push`, not a REST call — there is no
`POST /messages` endpoint, chat is channel-only.

---

## 2. Escrow-Gated Calendar — how it plugs into the same system

Full write-up of the feature's own design is in `phase3_calendar_design.md`-equivalent memory (not
in this repo) and `VokaziMilestoneEscrow.md` (unrelated escrow contract, NOT used here — see below).
This section is specifically about where Calendar *touches* chat.

**Same unlock gate, reused, not duplicated.** `Vokazi.Scheduling.get_unlocked_match/2`
(`backend/lib/vokazi/scheduling.ex`) re-checks `match.status == "unlocked"` on every single
scheduling action — the exact same status field chat's own gate depends on. Calendar does **not**
use `VokaziMilestoneEscrow.sol` (deployed but intentionally unused); it rides on the same
`VokaziMatchStaking` stake that already gates chat.

**Entry point lives inside the chat screen.** `ChatRoomView` renders a "📅 Schedule Intro Call"
button in its header; clicking it swaps the chat body for `<SchedulingFlow />`
(`frontend/src/features/scheduling/SchedulingFlow.jsx`) in place, then swaps back on "← Back to
chat." Calendar has no separate route or screen of its own — it only exists as a mode of the chat
view.

**Reminders are literally chat messages, injected from outside the channel.**
`Vokazi.Scheduling.send_reminder/2` doesn't go through `ChatRoomChannel.handle_in/3` at all (it's
triggered by an HTTP `POST`, not a socket push) — but it produces output indistinguishable from a
typed message:
```elixir
{:ok, message} = Chat.create_message(%{content: "...", sender_id: user_id, chat_room_id: room.id})
VokaziWeb.Endpoint.broadcast!("chat_room:#{room.id}", "new_msg", %{...})
```
Same context function (`Chat.create_message/1`), same topic, same event name (`"new_msg"`) the
channel itself broadcasts. Any client already joined to that room sees it appear exactly like a
normal message. Rate-limited to once per 30 minutes per side (`last_reminder_sent_at` on
`intro_schedules`) so it stays a nudge, not spam.

**Everything else is new state, not new transport:** consent (tri-state: undecided/connected/
declined), manual availability, proposed/selected slots, and a private per-user AI briefing all live
on a new `intro_schedules` row per match, polled via plain `GET` (`/api/matches/:id/schedule/status`,
6s interval) from `SchedulingFlow.jsx` — not pushed over the socket. Calendar's own real-time-ness
is weaker than chat's; it's polling, not a channel subscription.

---

## 3. The gap this exposes — why notifications are urgent, not a nice-to-have

Everything above shares one failure mode: **the system only ever tells someone something happened
if they are looking at the right screen at the right moment.**

Concretely, right now:
- A chat message only reaches you if your `ChatRoomChannel` socket is live and joined to that exact
  room's topic. Close the tab, and it's gone — no push, no email, no badge, nothing waiting for you
  when you come back beyond what's in `history` next time you rejoin.
- A Calendar reminder is a `"new_msg"` broadcast exactly like the above — same blind spot. This is
  precisely what just happened: Hasan Ali's reminder was created and broadcast correctly, but Jose
  Yusu wasn't connected to that channel at the time, so it went nowhere.
- A new match, a mutual-consent request, a stake needed, a slot proposed — every one of these is a
  state change with zero out-of-band signal. The only way to learn about any of them today is to
  already be in the app, polling or joined to the right channel.

`ROADMAP.md`'s Phase 3 already names a "Notification Engine" (Whapi.cloud/WhatsApp or Telegram) as
next-up, for the same underlying reason: driving users back to the platform when something needs
their attention. The Calendar reminder landing silently is the clearest, most concrete example yet
of why that can't stay deprioritized.
