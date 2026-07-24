# In-App Voice Calling — Feature Research & Direction

> **Update, 2026-07-24:** this doc originally recommended LiveKit (Approach B). After a design
> discussion, the direction changed to **Approach A (self-hosted, no managed third party)** — see
> §5 for why. The technical detail on both approaches below is left intact since it's still
> accurate reference material; only the recommendation changed. Also renamed throughout from
> "Vokazi" to Kuzana Connect, and the on-chain "Escrow-Gated" framing (removed 2026-07-22, see
> `boardy_comparison.md`) is gone.

## 1. Executive Summary
The goal is a native, in-app VoIP (Voice over IP) calling system layered onto the existing chat
interface — escalating from text chat to a live voice call using the browser's own internet
connection, without exposing phone numbers or requiring either side to open a third-party app.

This isn't a nice-to-have sitting on top of a working feature — it closes a real, silent gap: see
§0.

---

## 0. Why this is actually needed now (not speculative)

Read directly from the live scheduling code (`backend/lib/vokazi/scheduling.ex`,
`scheduling/event_finalizer.ex`), not assumed: a real Google Calendar event — with its
auto-generated Google Meet link — only gets created if **at least one side connected their
personal Google Calendar**. If both sides decline Calendar and only submit manual availability
(a fully supported, intended path — see `calendar.md` §4), the schedule silently gets stuck at
"confirmed" from the user's perspective with **no event, no Meet link, and no phone number**
(never exposed to the other side, by design — see `calendar.md` §7 for the full write-up). There
is currently no way for those two people to actually connect.

Worse: `contact_preference` ("call"/"video"/"chat", AI-inferred from the voice interview) is
purely decorative today — nothing anywhere branches on its value. Someone who explicitly said they
prefer a plain phone call is, if anything, *more* likely to decline connecting a personal Google
Calendar (they never wanted a video meeting to begin with), meaning the group most likely to hit
this dead end is exactly the "call" people.

An in-app call system closes this gap entirely: connection no longer depends on either side's
personal Google account at all.

---

## 2. Technical Approaches

The underlying technology is **WebRTC** (Web Real-Time Communication) either way. There are two
paths:

### Approach A: Self-hosted WebRTC via Phoenix Channels — Decided direction
Phoenix Channels (already running, used for chat) act as the signaling server — exchanging tiny
SDP/ICE JSON blobs between the two peers so their browsers can find each other. The actual audio
never touches our application server.
*   **How it works:** User A clicks "Call". A Channel message reaches User B. The browsers'
    native WebRTC APIs establish a direct peer-to-peer audio connection, falling back to a relay
    (below) only when direct P2P fails.
*   **NAT traversal (STUN) and relay fallback (TURN):** the historically "very complex" part —
    solved by **coturn**, a mature, single-binary open-source project we run ourselves (a small
    Fly.io machine). This is the one piece of real infrastructure this approach needs; see
    `ROADMAP.md` Phase 6 for the cost breakdown.
*   **Why this is actually the *right-sized* choice, not a compromise:** every call Kuzana Connect
    will ever host is 1:1 (matched pairs). The scaling problem raw P2P has — needing N² direct
    connections as participant count grows — simply doesn't apply when there are only ever two
    participants. This is the same architecture WhatsApp/Signal/FaceTime use for their own 1:1
    calls.
*   **Pros:** no per-minute billing to anyone, no vendor in the media path, full control.
*   **Cons:** we own running `coturn` (small, real, ongoing operational responsibility, not
    zero-maintenance).

### Approach B: Managed WebRTC via LiveKit — Considered, not chosen
[LiveKit](https://livekit.io) is the modern open-source-with-managed-cloud standard for building
WebRTC applications, built around an **SFU** (Selective Forwarding Unit) — a server that
redistributes media streams, which is what makes *group* calls (3+ participants) scale well.
*   **How it works:** both users connect to a LiveKit "Room"; our backend generates access tokens
    (JWTs) for authorized users to join.
*   **Pros:** native React SDK (`@livekit/components-react`) makes UI integration fast; handles
    NAT/firewall traversal automatically; adaptive bitrate and echo cancellation out of the box.
*   **Why not chosen:** its core value — the SFU — solves a group-call scaling problem Kuzana
    Connect doesn't have (every call here is 1:1). Paying for (or self-hosting) an SFU to solve a
    problem that doesn't exist is unnecessary overhead. Per-minute/participant billing would also
    scale with usage in a way `coturn`'s flat hosting cost doesn't.
*   **Why not Twilio Voice:** Twilio Voice is built for calling traditional phone networks (PSTN);
    since this is purely in-app/internet calling, it's the wrong tool regardless of the
    LiveKit-vs-self-hosted question.

---

## 3. Product & User Experience (UX) Flow

The feature should feel as natural and frictionless as WhatsApp or Telegram calling, within one
honest, structural limit: **being a web app, we cannot make a phone physically ring from a
fully-closed app** the way WhatsApp's OS-level VoIP integration (CallKit/ConnectionService) does.
The mitigation is Web Push (already built, `notification_system.md`): a call fires a push
notification immediately, so the recipient is alerted even with the tab closed — tapping it
opens/focuses the app to join. Real and useful, but "notification → tap → connect," not "phone
rings in your pocket."

1.  **Call Initiation:**
    *   Inside the chat room, a persistent "Phone" icon sits at the top right.
    *   When clicked, the UI shifts to a "Calling..." state; a ringtone plays locally; a Web Push
        fires to the other side in parallel with the Channel signal.
2.  **Receiving a Call:**
    *   If the recipient's client is live and joined, a real-time Phoenix WebSocket push event
        (`call_incoming`) shows a clean modal: *"Incoming Call from [Name]"* with **Accept** and
        **Decline**, plus a ringing audio cue.
    *   If not, the Web Push notification is the only signal until they open the app — a
        reasonable ring-timeout (e.g. 30–45s, matching WhatsApp's own) should let the caller know
        nobody picked up rather than ringing forever.
3.  **Active Call State:**
    *   Call duration, Mute/Unmute, red "End Call" button. Audio streams peer-to-peer (or via
        `coturn` when direct P2P fails).
4.  **Call Termination:**
    *   Either side hanging up fires a `call_ended` Channel event, returning both to text chat with
        a system message dropped into the room: *"📞 Call ended (12m 34s)"* — reusing the exact
        same `Chat.create_message/1` + broadcast pattern `calendar.md` documents for scheduling
        reminders, so it renders identically to a normal message.

---

## 4. Technical Requirements

### Frontend (React/Vite)
*   **Microphone Permissions:** standard browser prompt handling (`navigator.mediaDevices.getUserMedia`),
    requesting `echoCancellation`/`noiseSuppression`/`autoGainControl` constraints — built into every
    browser's WebRTC implementation, no extra library needed for reasonable audio quality.
*   **Audio Playback:** `<audio>` elements for ringtones and the remote voice stream.
*   **State Management:** tracking whether the user is `idle`, `calling`, `ringing`, or `in_call`.
*   **Dependencies:** none beyond what ships in the browser — no SDK for Approach A.

### Backend (Elixir/Phoenix)
*   **Signaling:** new events on the existing per-match chat topic (or a dedicated
    `call:<match_id>` topic) — `call_offer`, `call_answer`, `ice_candidate`, `call_end`,
    `call_reject` — carrying only SDP/ICE JSON, never media.
*   **TURN credentials:** the backend generates short-lived, per-call TURN username/password pairs
    via `coturn`'s standard HMAC-based REST API pattern (a time-limited shared-secret scheme, not a
    static password), handed to the frontend alongside the call-offer response.
*   **Authorization:** reuse the exact same gate chat already uses — `Vokazi.Chat.participant?/2` —
    a call can only be initiated between two people whose match is actually unlocked.

### Infrastructure & Security
*   **HTTPS/WSS:** WebRTC strictly requires a secure context — already satisfied by the app's
    existing production TLS setup.
*   **`coturn`:** the one new piece of infrastructure — see `ROADMAP.md` Phase 6 for cost.
*   **Encryption:** WebRTC media is DTLS-SRTP encrypted end-to-end between the two peers by
    default, even when relayed through `coturn` (the relay forwards encrypted packets, it never
    decrypts them) — a real security property, not something we have to build.

---

## 5. Phased Implementation Plan

1.  **Phase 1: Signaling + coturn setup.** Add the Channel events for call state to the Elixir
    backend; deploy and configure `coturn` with HMAC-based ephemeral credentials; build a bare-bones
    call button that reaches the other side's screen (no real audio yet).
2.  **Phase 2: Real audio.** Wire up `RTCPeerConnection`/`getUserMedia` on the frontend for actual
    mic transmission between two browsers, using `coturn` for the fallback relay path.
3.  **Phase 3: Polish & edge cases.** Ringtones, UI states, Web Push integration for the
    tab-closed case, ring-timeout/missed-call handling, what happens if a user closes the tab
    mid-call or denies mic permission, call history logged to Postgres.

This closes the scheduling dead-end from §0 directly: once built, a confirmed intro call no longer
needs either side's personal Google Calendar to actually connect.
