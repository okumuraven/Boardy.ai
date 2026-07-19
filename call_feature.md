# In-App Voice Calling Feature Research & Strategy

## 1. Executive Summary
The goal is to seamlessly integrate a native, in-app VoIP (Voice over IP) calling system into the existing chat interface. This allows users to escalate from text chat to a live, secure voice call using their internet connection, directly within the browser or app, without exposing phone numbers or requiring third-party software like Zoom or Google Meet.

Given Vokazi's current technology stack (**React/Vite** on the frontend and **Elixir/Phoenix** on the backend), we are perfectly positioned to implement a highly performant, low-latency voice solution.

---

## 2. Technical Approaches

To build an internet-based calling system, the underlying technology is **WebRTC** (Web Real-Time Communication). There are two primary paths to implementing this in our stack:

### Approach A: "Raw" WebRTC via Phoenix Channels (Self-Managed)
Because we already use Phoenix Channels (WebSockets) for real-time chat, we can use these existing channels as a "Signaling Server." 
*   **How it works:** User A clicks "Call". A WebSocket message is sent to User B. The browser's native WebRTC API kicks in to establish a Peer-to-Peer (P2P) audio connection.
*   **Pros:** Free, no external dependencies, keeps everything in-house.
*   **Cons:** We must manage STUN/TURN servers ourselves to handle users behind restrictive firewalls/NATs (which is historically very complex). It also scales poorly if we ever want to do group calls.

### Approach B: Managed WebRTC via LiveKit (Recommended)
[LiveKit](https://livekit.io) is the modern, open-source industry standard for building WebRTC applications. 
*   **How it works:** Both users connect to a LiveKit "Room". Our Elixir backend simply acts as the bouncer, generating access tokens (JWTs) for authorized users to join a call.
*   **Pros:** Native React SDK (`@livekit/components-react`) makes UI integration trivial. It handles all NAT/firewall traversals automatically. Excellent audio quality with built-in echo cancellation and noise suppression. 
*   **Cons:** Requires running a LiveKit server (or paying for their managed cloud), though it is very cheap at our current scale.

> **Why LiveKit over Twilio Voice?** Twilio Voice is primarily for calling traditional phone networks (PSTN). Because we want purely *in-app* internet calling, LiveKit is faster, cheaper, and explicitly built for modern WebRTC.

---

## 3. Product & User Experience (UX) Flow

The feature should feel as natural and frictionless as WhatsApp or Telegram calling.

1.  **Call Initiation:** 
    *   Inside the chat room, a persistent "Phone" icon sits at the top right.
    *   When clicked, the UI shifts to a "Calling..." state. A ringtone plays locally.
2.  **Receiving a Call:**
    *   The recipient receives a real-time Phoenix WebSocket push event (`call_incoming`).
    *   A clean, non-intrusive modal or full-screen overlay appears: *"Incoming Call from [Name]"* with **Accept** and **Decline** buttons. A ringing audio cue plays.
3.  **Active Call State:**
    *   Once accepted, the UI shows call duration, a Mute/Unmute microphone button, and a red "End Call" button.
    *   Audio streams peer-to-peer.
4.  **Call Termination:**
    *   When either party hangs up, a WebSocket `call_ended` event fires, returning both users seamlessly to the text chat. A system message is dropped in the chat: *"📞 Call ended (12m 34s)"*.

---

## 4. Technical Requirements

### Frontend (React/Vite)
*   **Microphone Permissions:** Standard browser prompt handling (`navigator.mediaDevices.getUserMedia`).
*   **Audio Playback:** `<audio>` elements for ringtones and remote voice streams.
*   **Dependencies:** `@livekit/components-react` (if using Approach B) or standard WebRTC APIs.
*   **State Management:** Tracking whether the user is `idle`, `calling`, `ringing`, or `in_call`.

### Backend (Elixir/Phoenix)
*   **Signaling/Notification:** New events in our existing `ChatChannel` (e.g., `initiate_call`, `accept_call`, `reject_call`).
*   **Token Generation (LiveKit Route):** An endpoint (`GET /api/calls/token`) that generates a secure JWT giving a user permission to join a specific LiveKit room based on their current chat ID.

### Infrastructure & Security
*   **HTTPS/WSS:** WebRTC *strictly requires* a secure context. Both the frontend app and WebSocket connections must be over TLS/SSL (HTTPS/WSS).
*   **TURN Server:** If we don't use LiveKit, we must deploy a coturn server to guarantee calls connect even on corporate networks.

---

## 5. Phased Implementation Plan

1.  **Phase 1: Prototyping (Backend & Basic Signaling)**
    *   Add the necessary WebSocket events to the Elixir backend to handle call states.
    *   Build a simple UI button that triggers an alert on the other user's screen.
2.  **Phase 2: Media Integration (LiveKit Integration)**
    *   Setup a LiveKit Cloud dev project.
    *   Implement Elixir JWT generation.
    *   Integrate LiveKit React components to handle the actual microphone transmission.
3.  **Phase 3: Polish & Edge Cases**
    *   Add ringtones and UI animations.
    *   Handle edge cases: What happens if a user closes the tab mid-call? What if they deny microphone permissions?
    *   Log call history in the PostgreSQL database.
