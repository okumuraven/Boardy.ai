# In-App Video Calling Feature Research & Strategy

## 1. Executive Summary
Following the audio-only calling research, adding a seamless **Video Calling** feature provides users with a face-to-face deal-making environment directly within Vokazi. This keeps users on the platform rather than forcing them to share Zoom or Google Meet links, increasing engagement, trust, and platform retention.

Since Vokazi's stack uses **React** on the frontend and **Elixir/Phoenix** on the backend, we can implement high-definition, low-latency video calling using the same foundational WebRTC technology as voice calling, but with additional considerations for UI layout, camera management, and bandwidth.

---

## 2. Technical Architecture

Just like voice calling, **WebRTC** is the underlying engine. 

### Why LiveKit is Even More Critical for Video
While basic peer-to-peer (P2P) WebRTC works okay for audio, **video data is massive**. Relying on raw P2P WebRTC for video often leads to frozen frames and dropped calls if one user has a weaker connection.

By using **LiveKit** as our WebRTC engine (SFU - Selective Forwarding Unit):
*   **Adaptive Bitrate (Simulcast):** LiveKit automatically detects if a user has a bad internet connection and lowers their video quality (e.g., from 720p to 360p) without dropping the call.
*   **Performance:** It routes traffic through a central server, ensuring low latency globally.
*   **Future-Proofing:** Easily scales if we ever want to do group calls or webinars (3+ participants).

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
*   **UI Components:** `@livekit/components-react` provides pre-built responsive video grids and participant tiles which will save weeks of UI development.

### Backend (Elixir/Phoenix)
*   **Signaling:** Exact same logic as voice calls. Phoenix Channels broadcast the ring/accept/decline states.
*   **Token Provisioning:** Elixir generates a JWT granting the user access to the LiveKit video room. We can attach metadata to this token (e.g., user's display name, avatar URL) so it renders instantly on the frontend.

### Infrastructure & Bandwidth
*   **Bandwidth Costs:** Video uses significantly more data than audio. LiveKit Cloud offers a generous free tier, but bandwidth usage will need to be monitored as Vokazi scales.
*   **Mobile Responsiveness:** Ensure the video grid CSS automatically stacks vertically when viewed on mobile browsers.

---

## 5. Phased Implementation Plan

1.  **Phase 1: Audio-First Foundation**
    *   Ensure the voice-calling (audio-only) feature is fully built and tested first. Audio is harder to get right than video (due to echo cancellation), and the WebRTC infrastructure is identical.
2.  **Phase 2: Camera Prototyping & Permissions**
    *   Build a "Lobby" React component where a user can see their own camera and test their mic *before* joining the actual call.
    *   Handle browser permission states robustly.
3.  **Phase 3: The Video "Deal Room"**
    *   Integrate LiveKit's video tracks.
    *   Build the Picture-in-Picture layout and the control bar (Mute, Camera toggle, Hang up).
4.  **Phase 4: Advanced Features (Optional but High-Value)**
    *   **Screen Sharing:** Crucial for B2B matchmaking.
    *   **Background Blur:** Adds a massive professional polish to the platform. LiveKit supports client-side background blur via WebAssembly.
