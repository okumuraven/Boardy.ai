# Chat & Escrow-Gated Calendar — How They're Built

Reference doc written 2026-07-19, right after the Calendar feature first shipped, then substantially
revised 2026-07-21 once the scheduling flow was redesigned around a curated day-picker + a real
cross-match Agenda view. Both systems are real and working (not mocked) — this documents actual
code, not intent.

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

## 3. The gap that existed here — closed by the notification system

Everything above shared one failure mode: the system only ever told someone something happened if
they were looking at the right screen at the right moment. A chat message or a Calendar reminder was
just a `"new_msg"` broadcast, invisible to anyone not currently joined to that channel — which is
exactly what caused Hasan Ali's reminder to land silently while Jose Yusu was elsewhere in the app.

This is now closed: see `notification_system.md` for the in-app notification hub (Phase 1) and Web
Push (Phase 2), both shipped and wired into the events described in this doc (new match, reminder,
slot proposed, call confirmed). Notification clicks route into the right screen (chat + scheduling
drawer opened to the right match), not a bare, nameless conversation.

---

## 4. The curated day-picker — connecting Calendar no longer silently auto-schedules

The first version of this feature auto-pulled a Calendar-connected user's *entire* free calendar the
moment they connected, and used all of it as their offered availability. That's gone. Connecting
Calendar now only unlocks an assisted picker — the user still has to explicitly choose which days
they're willing to offer, same as someone entering availability manually. Both paths converge on the
exact same field (`manual_availability_a/b` on `intro_schedules`) and the exact same trigger
(`Vokazi.Scheduling.submit_manual_availability/3`), so `SlotProposal` doesn't know or care which path
produced them.

**`Vokazi.Scheduling.handle_oauth_callback/2`** (`backend/lib/vokazi/scheduling.ex`) now only stores
the credential and flips `consent_a`/`consent_b` true — it does **not** call `SlotProposal` anymore.

**`Vokazi.Scheduling.MyFreeDays.fetch/2`** (`backend/lib/vokazi/scheduling/my_free_days.ex`) computes
this user's real free windows for the next 4 days (`GoogleCalendarClient.freebusy/3` inverted via
`SlotMatcher.free_windows_from_busy/5`, clipped to 8am–6pm), grouped by date. Each day is annotated
with `other_offered`: the window the *other* side has already submitted for that same date, if any —
so whichever side picks second sees which days already overlap and is steered toward them instead of
picking blind. This never exposes anything beyond what the other side already chose to share; their
raw calendar is never visible to anyone but them. `frontend/src/features/scheduling/DayPicker.jsx`
renders this, sorts overlapping days first, and defaults the selected time window to the actual
overlap when one exists (`bestDefaultWindow`) instead of just the first free slot of the day.

**OAuth scope note (a real bug this surfaced):** `calendar.events` alone is not enough for a Freebusy
query — Google returns `403 ACCESS_TOKEN_SCOPE_INSUFFICIENT` without `calendar.readonly` too
(`GoogleOAuth.@scope` now requests both). Existing connected users' stored refresh tokens don't
retroactively gain the new scope — `MyFreeDays.fetch/2` maps that specific failure to
`{:error, :calendar_reauth_required}`, and `DayPicker.jsx` surfaces a **Reconnect Google Calendar**
button rather than a dead-end error, so this self-heals without needing a manual DB fix.

Once both sides have submitted (`submit_manual_availability/3` called from either path),
`Vokazi.Scheduling.SlotProposal.maybe_run/2` runs in the background: intersects both sides' windows
(`SlotMatcher.propose_slots/2`) and generates a private per-side AI briefing about the other person
(`Vokazi.Scheduling.Briefing`, Gemini). Known gap, not yet fixed: a Gemini timeout on one side's call
leaves that side's `agenda_summary` null with no retry — the UI degrades gracefully (blank
summary/talking-points section, nothing crashes), but the briefing never backfills for that match.

---

## 5. Personal Events — a user's own agenda, feeding back into future scheduling

`Vokazi.PersonalEvents` (`backend/lib/vokazi/personal_events.ex`) is a small, deliberately separate
context — not nested under `Vokazi.Scheduling` — for agenda items a user adds themselves: title,
date, start/end time. No match, no consent, no escrow gate, never visible to anyone else, never
synced to Google. `POST/GET /api/personal_events`, `DELETE /api/personal_events/:id` (ownership
checked server-side; deleting someone else's id 404s rather than confirming it exists).

The reason this exists rather than just being a nice-to-have: `MyFreeDays.fetch/2` folds a user's
personal events into the same busy-range list as Google's Freebusy result before computing free
windows, so a commitment that only lives in Vokazi (not on Google Calendar) still correctly blocks
that time from being offered to a *new* match. Verified live: a 3–4pm personal event on a given day
correctly splits that day's offered window into two (before/after) rather than being ignored.

## 6. The Calendar tab — a real cross-match Agenda, not a card list

`Vokazi.Scheduling.CalendarOverview.list_for_user/1` aggregates every unlocked match's scheduling
state for one user (confirmed/proposed/not-started, plus that side's private briefing). The frontend
(`frontend/src/features/calendar/CalendarView.jsx`) merges this with `PersonalEvents.list_for_user/1`
into one chronological, day-grouped agenda — "Today / Tomorrow / Thu, Jul 23" headers, each line
reading in plain language ("11:00 AM · Call with Hasan Ali", "3:00 PM – 4:00 PM · Dentist
appointment"). Matches with no date yet (nothing proposed) surface separately under "Not yet
scheduled" rather than cluttering the dated list.

The mini month-grid (`MiniCalendar.jsx`) deliberately does not try to cram event text into 24px day
cells — instead a day cell shows a dot when something's scheduled, and clicking it filters the
agenda below to that date (the same interaction Google Calendar/Fantastical use for their own mini
pickers). Adding a personal event is a slim inline form (`AddPersonalEventForm.jsx`, native
date/time inputs), not a modal.
