# In-App Video Calling — Feature Research & Direction

> **Update, 2026-07-24:** renamed throughout from "Vokazi" to Kuzana Connect. The recommendation in
> §2 changed alongside `call_feature.md`'s — self-hosted WebRTC (Approach A there), not LiveKit —
> see that doc's §5 for the full reasoning. The UX/product content below (§3 onward) is unaffected
> by that change and still reflects the intended build.

## 1. Executive Summary
Following the audio-only calling research (`call_feature.md`), adding a **Video Calling** feature
gives matched members a face-to-face environment directly within Kuzana Connect — closing the same
scheduling dead-end `call_feature.md` §0 documents, not just a nice-to-have layered on a working
feature.

Since Kuzana Connect's stack uses **React** on the frontend and **Elixir/Phoenix** on the backend,
we can implement video calling using the same foundational WebRTC technology as voice calling, with
additional considerations for UI layout, camera management, and bandwidth.

---

## 2. Technical Architecture

Just like voice calling, **WebRTC** is the underlying engine, and the same decision applies:
**self-hosted (Phoenix Channels + `coturn`), not a managed platform** — see `call_feature.md` §2/§5
for the full reasoning. The point below explains specifically why that reasoning holds for video
too, not just audio.

### Why a managed SFU (e.g. LiveKit) isn't needed here, video included
Raw peer-to-peer WebRTC video without any relay can struggle when one side has a weak connection —
that's real. What a managed SFU (Selective Forwarding Unit) actually buys you is **adaptive
bitrate/simulcast and clean scaling to group calls (3+ participants)**. Kuzana Connect's calls are
always exactly two people — every call is 1:1, by construction (a match is always exactly two
matched members). The group-scaling problem an SFU solves doesn't exist here, so paying for one
(in money or in self-hosted operational complexity) solves a problem we don't have. `coturn`
(already planned for audio) covers the actual real-world failure mode for 1:1 video too — direct
P2P failing due to NAT/firewall — by relaying the call rather than redistributing it to multiple
recipients.

If group video calls (webinars, panel-style sessions) ever become a real, validated product need —
distinct from 1:1 intro calls — that would be the point to revisit an SFU. Not before.

---

## 3. Product & User Experience (UX) Flow

Video calls require a much more deliberate user interface than audio. The transition from text chat to video must feel premium and professional.

1.  **Initiation:**
    *   A "Video Camera" icon sits next to the "Phone" icon in the chat header.
    *   Clicking it prompts a "Waiting for [User] to join..." screen with a preview of the caller's own camera (so they can check their appearance before the other person answers).
2.  **Receiving a Call:**
    *   The recipient receives a Phoenix WebSocket `video_call_incoming` event.
    *   A full-screen or prominent modal appears: *"Incoming Video Call from [Name]"*.
    *   Crucially, when they click **Accept**, the browser must prompt for Camera & Microphone permissions if not already granted.
3.  **Active Call State (The "Deal Room"):**
    *   **Layout:** A dynamic layout. Typically, the other person takes up the main screen, while your own video is a smaller Picture-in-Picture (PiP) floating in the corner.
    *   **Controls:** A sleek bottom control bar overlaying the video (auto-hides on inactivity) with:
        *   Mute/Unmute Mic
        *   Turn Camera On/Off
        *   Screen Share (highly recommended for founders pitching/showing code)
        *   End Call (Red Button)
4.  **Graceful Degradation:**
    *   If a user's bandwidth drops severely, the UI should automatically turn off their camera and display a message: *"Connection unstable. Switching to audio-only."*

---

## 4. Technical Requirements & Challenges

### Frontend (React/Vite)
*   **Device Management:** Complex logic to handle multiple cameras or microphones (e.g., user switching from laptop webcam to an external monitor webcam).
*   **Permissions Handling:** React must elegantly handle scenarios where the user clicks "Block" on the browser camera permission prompt (showing a helpful "How to enable camera" guide).
*   **Video Elements:** Rendering `<video autoplay playsinline>` elements correctly across different browsers (especially Safari/iOS).
*   **UI Components:** since there's no SDK in this direction (see §2), the picture-in-picture layout and control bar are custom React/CSS - a real, but bounded, piece of frontend work, not a config option.

### Backend (Elixir/Phoenix)
*   **Signaling:** exact same Channel events as voice calls (`call_feature.md` §4) carry a second video track alongside the audio one - no separate signaling path needed.
*   **TURN credentials:** the same `coturn` HMAC-based ephemeral credentials voice calls use cover video too - a call is a call, video is just another media track on the same peer connection.

### Infrastructure & Bandwidth
*   **Bandwidth Costs:** video uses meaningfully more data than audio when a call actually falls back to the `coturn` relay (the ~15-30% of calls direct peer-to-peer can't establish) - this is the one real, usage-scaling cost line, covered in `ROADMAP.md` Phase 6's cost model alongside voice. At Kuzana's actual current scale, still realistically a small number, not a budget concern.
*   **Mobile Responsiveness:** ensure the video grid CSS automatically stacks vertically when viewed on mobile browsers.

---

## 5. Phased Implementation Plan

1.  **Phase 1: Audio-First Foundation**
    *   Ensure the voice-calling (audio-only) feature is fully built and tested first. Audio is harder to get right than video (due to echo cancellation), and the WebRTC infrastructure is identical.
2.  **Phase 2: Camera Prototyping & Permissions**
    *   Build a "Lobby" React component where a user can see their own camera and test their mic *before* joining the actual call.
    *   Handle browser permission states robustly.
3.  **Phase 3: The Video "Deal Room"**
    *   Add a video track to the existing `RTCPeerConnection` from the audio build - same peer
        connection, same signaling, no new transport.
    *   Build the Picture-in-Picture layout and the control bar (Mute, Camera toggle, Hang up).
4.  **Phase 4: Advanced Features (Optional, revisit after the core loop is live)**
    *   **Screen Sharing:** genuinely valuable for B2B matchmaking - `getDisplayMedia()` is a
        standard browser API, addable as another track on the same connection.
    *   **Background Blur:** a nice-to-have polish item; client-side (e.g. via a WebAssembly
        segmentation model) rather than dependent on any specific vendor's SDK.
