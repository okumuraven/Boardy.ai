# Omnichannel Notification Engine Research & Strategy

**Revised 2026-07-19** to fit a zero-cost budget and to fix the concrete gap documented in
`calendar.md` §3: a Calendar reminder was created and broadcast correctly, but the recipient wasn't
connected to that chat channel at the time, so it landed nowhere. Phoenix Channels only ever deliver
to sockets that are live and joined *right now* — no queue, no offline delivery. That's true for
every event this doc covers, not just reminders.

## 1. Executive Summary
According to Phase 3 of the Vokazi Roadmap, the platform requires a robust Notification Engine to drive user retention. Because Vokazi relies on time-sensitive, high-value events (e.g., "You have a new AI Match" or "User B accepted your match"), we must ensure users are alerted promptly.

To achieve this **at zero ongoing cost**, we build a unified Notification Hub in Elixir/Phoenix that routes alerts across channels, weighed here against the budget constraint before any of it gets built:

| Channel | Cost | Verdict |
|---|---|---|
| **In-App** (Postgres + `user:<id>` Phoenix Channel + bell icon) | $0 — infra you already run | Keep — foundation layer |
| **Web Push** (VAPID) | $0 — no third party at all | Add — this is the fix for what just happened |
| **Email** (Swoosh + Resend free tier: 3k/mo) | $0 at hackathon scale | Keep, but as a lower-urgency fallback, not primary |
| **Oban** (job queue) | $0 — the OSS core lib is free; only Oban Web/Pro costs money | Keep, use free core only |
| **WhatsApp** (Whapi.cloud/Twilio) | Real ongoing $ | Cut for now — contradicts your own prior decision, slow approval process, not worth it before Aug 28 |

**WhatsApp is intentionally not built in this phase.** Whapi.cloud/Twilio both carry real
per-message cost and require Business API approval — Vokazi already made this exact tradeoff once
before (chose the in-app Thirdweb wallet + Phoenix chat room specifically *instead of*
Whapi.cloud/Zoko WhatsApp group automation, for this same cost reason). Section 7 keeps WhatsApp
documented as a later phase to revisit once the product monetizes, but nothing here builds it.

---

## 2. Architectural Design: The Elixir "Notification Hub"

A professional notification system doesn't scatter API calls throughout the codebase. Instead, it uses a centralized "Hub" pattern.

### How it works:
1. **Trigger:** A real event already happening in the codebase fires a notification — see §4 for the exact function each trigger hangs off.
2. **Persist first, deliver second:** every notification is written to a `notifications` row *before* any delivery attempt, so "did this get sent" is always answerable from the database, never lost if a delivery job crashes mid-flight.
3. **The Router:** checks the user's **Notification Preferences** and decides which of the (at most two, right now) channels to attempt: in-app is always attempted since it's free and instant; Web Push is attempted only if the user has granted browser permission and has a stored subscription; Email is attempted only if opted in and the event is marked non-urgent.
4. **Delivery Workers:** Oban jobs (see below) do the actual Web Push/Email network calls asynchronously, so a slow or failed third-party call never blocks the request that triggered it.

> **Why Oban, and which Oban?** Web Push and email calls are external network requests that can fail transiently. Oban gives durable retries — a job survives a BEAM crash/restart because it's a row in Postgres, unlike a bare `Task.start` which loses in-flight work if the node dies. **Use only the free, open-source `oban` core package** (Apache-2.0, hex.pm/packages/oban) — not Oban Web or Oban Pro, which are paid add-ons we don't need for this scale.

---

## 3. Channel Implementation Details

### A. In-App Notifications (Real-Time) — build this first
*   **Technology:** Phoenix Channels (WebSockets) + React state. Zero additional cost — reuses `VokaziWeb.UserSocket`, already running.
*   **Mechanism:** a new personal topic per user, `user:{user_id}` (distinct from the existing `chat_room:{id}` topic), joined once at app load (wherever `activeAccount`/`profile.id` becomes available in `App.jsx`) rather than per-screen. When a notification is generated, the backend pushes an event to that topic.
*   **UI:**
    *   A "🔔" bell icon in the nav bar (`Login.jsx`/`Dashboard.jsx` share a `nav-bar` class already — the bell slots in there).
    *   A red badge counter for unread notifications.
    *   Clicking it opens a dropdown listing recent notifications, each linking to the relevant screen (a chat room, a pending match, a scheduling flow).
*   **Database:** a `notifications` table: `user_id`, `type` (`chat_message` | `new_match` | `consent_needed` | `stake_needed` | `calendar_slot`), `body`, `link` (client-side route/state to jump to), `is_read`, `inserted_at`.
*   **This alone does not fix the reported problem** — it's still only delivered to a *live, connected* socket. It's the foundation §3B builds on, not the fix by itself.

### B. Web Push (VAPID) — this is what actually closes the gap
*   **Technology:** the browser's native Push API + a VAPID keypair (generated once, free — no account, no third-party service, no per-message cost, ever). Delivers even when the tab/browser is fully closed, as long as the user granted permission and hasn't uninstalled/revoked it.
*   **Mechanism:**
    1. On first meaningful use (see §4 for exact timing), the frontend asks `Notification.requestPermission()` and, if granted, registers a Service Worker + subscribes via `PushManager.subscribe()`.
    2. The subscription (endpoint + keys) is POSTed to the backend and stored per-user (`push_subscriptions` table — a user can have more than one, e.g. two browsers).
    3. When a notification fires and the user isn't connected to the relevant Phoenix Channel (i.e., the in-app delivery in §3A wouldn't reach them), an Oban job sends the payload to all of that user's stored push subscriptions.
*   **Requirements:** an Elixir Web Push client library implementing the VAPID/`aes128gcm` payload encryption spec (evaluate exact hex package at implementation time — this is a real dependency addition, so per this project's own rules it gets named and confirmed before being added, not silently pulled in), plus a small Service Worker file on the frontend to receive and display the push.
*   **UX note:** ask for permission contextually, not on page load — e.g. right after a user's first stake confirms ("Want a heads-up if [partner] responds while you're away?"), not as a blanket browser prompt on first visit, which trains people to reflexively click "Block."

### C. Email — lower-urgency fallback, not primary
*   **Technology:** **Swoosh** (Elixir's standard mailing library) + **Resend**, whose free tier (3,000 emails/month, 100/day) comfortably covers a hackathon-scale user base at zero cost.
*   **Mechanism:** used for things that don't need to be instant — e.g. a daily/weekly digest of matches missed, or a single "your intro call is tomorrow" reminder — not for time-critical nudges, which belong in §3A/§3B.
*   **Requirements:** HTML email templates (Phoenix `.heex` works fine here), and — since we already now capture `users.email` (added for Calendar invites) — no new data collection needed. Domain DNS (SPF/DKIM) verification is worth doing properly so mail doesn't land in spam, but isn't a blocker for Resend's sandbox/testing mode during development.

### D. WhatsApp — documented, not built
*   **Status: deferred**, not part of this build. Kept here only so the research isn't lost.
*   **Technology:** Whapi.cloud or Twilio WhatsApp API — both carry real per-message/per-API-call cost and require Business API approval (Twilio/Meta additionally require pre-approved Template Messages outside a 24-hour user-initiated window).
*   **Revisit when:** Vokazi has confirmed monetization and the cost is justified — see `hackathon_context.md`'s note on why WhatsApp group automation was already passed over once for the same reason.

---

## 4. Trigger Events (in build-priority order)

Each of these is a real function already in the codebase today — not a hypothetical:

1. **Chat message / reminder while not connected** — `VokaziWeb.ChatRoomChannel.handle_in("new_msg", ...)` and `Vokazi.Scheduling.send_reminder/2` both call `Vokazi.Chat.create_message/1`. The Hub hooks in right there: after the message is persisted, check whether the recipient's socket is currently joined to that `chat_room:{id}` topic (`Phoenix.Presence` already tracks this) — if not, fire a notification.
2. **New match found** — `Vokazi.Matchmaking.find_pending_match/1` / `find_match!/1` creating a `pending_consent` match. Both participants should be notified, not just whoever clicked "Find a Match."
3. **Mutual consent / stake needed** — `Vokazi.Matchmaking.respond_to_match/4`'s `accept_match/2` branch, specifically the transition to `:awaiting_stake` — the *other* side needs to know it's their turn.
4. **Calendar slot proposed / confirmed** — `Vokazi.Scheduling.SlotProposal.maybe_run/2` (slots ready) and `Vokazi.Scheduling.EventFinalizer.maybe_run/2` (event confirmed) currently only surface on the next 6-second poll if the user happens to be looking at the scheduling screen.

---

## 5. Data Modeling & Preferences

To be professional, we must never spam our users. Kept intentionally small — only the channels actually being built:

```elixir
schema "notification_preferences" do
  belongs_to :user, User

  field :in_app_enabled, :boolean, default: true
  field :web_push_enabled, :boolean, default: false  # true only after explicit browser permission grant
  field :email_enabled, :boolean, default: true
  field :email_digest_only, :boolean, default: true  # daily/weekly digest, not per-event

  field :quiet_hours_start, :time
  field :quiet_hours_end, :time
end
```

```elixir
schema "notifications" do
  belongs_to :user, User

  field :type, :string  # "chat_message" | "new_match" | "consent_needed" | "stake_needed" | "calendar_slot"
  field :body, :string
  field :link, :string
  field :is_read, :boolean, default: false

  timestamps()
end
```

```elixir
schema "push_subscriptions" do
  belongs_to :user, User

  field :endpoint, :string
  field :p256dh_key, :string
  field :auth_key, :string

  timestamps()
end
```

---

## 6. Technical Requirements Checklist

**Backend (Elixir/Phoenix):**
- [ ] Add **Oban** (free core package only) to `mix.exs` for durable background delivery jobs.
- [ ] Add **Swoosh** + configure **Resend** (free tier) as the mailer provider.
- [ ] Evaluate and add a Web Push (VAPID) hex package — name and confirm the exact package before adding, per this project's dependency rules.
- [ ] Migrations: `notifications`, `notification_preferences`, `push_subscriptions`.
- [ ] `user:{user_id}` personal Phoenix Channel topic (separate from `chat_room:{id}`) for live in-app delivery.
- [ ] Hub module hooking into the four trigger points in §4, in that priority order.

**Frontend (React):**
- [ ] `NotificationBell.jsx` — badge count + dropdown, subscribed to the personal channel.
- [ ] A small Service Worker for receiving/displaying Web Push payloads.
- [ ] Contextual permission-request UX (not a blanket page-load prompt — see §3B).
- [ ] A lightweight settings screen for the preferences in §5.

**Infrastructure/3rd Party — both free at this scale:**
- [ ] Generate a VAPID keypair (free, one-time, no account needed).
- [ ] Register a Resend account (free tier) and verify domain DNS.

---

## 7. Phased Build Plan

| Phase | Delivers | Priority |
|---|---|---|
| 1. In-App Foundation | `notifications` table, personal Phoenix Channel, bell icon + dropdown | Build first — proves routing works with zero external cost |
| 2. Web Push | VAPID keypair, Service Worker, subscription storage, Oban delivery job | The phase that actually reaches a closed tab |
| 3. Email | Swoosh + Resend, digest template, opt-in preference | Lower urgency by design |
| 4. User Control | Preferences settings screen | Required before wider rollout |
| 5. WhatsApp (deferred) | Not scheduled | Revisit only post-monetization |

**Phase 1: In-App Foundation**
`notifications` table, the personal Phoenix Channel, the bell icon + dropdown. Wire up trigger #1 (chat/reminder while disconnected) first, since that's the concrete problem that started this. Proves the internal routing works before any external delivery exists.

**Phase 2: Web Push**
VAPID keypair, Service Worker, subscription storage, Oban delivery job. This is the phase that actually reaches someone whose tab is closed — extend to triggers #2–#4 once #1 is solid.

**Phase 3: Email**
Swoosh + Resend, a digest-style template, opt-in preference. Lower urgency than Phases 1–2 by design.

**Phase 4: User Control**
The preferences settings screen, so users can tune what reaches them and how — required before this goes to anyone beyond internal testing.

**Phase 5 (deferred, not scheduled): WhatsApp**
Only revisited post-monetization, per §3D.
