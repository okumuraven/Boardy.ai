// Pure WebRTC helpers for In-App Calling (Phase 2, call_feature.md) - no
// React, no channel/socket coupling. CallPanel.jsx owns the signaling
// and state; this just wraps the two things the browser itself does:
// fetch short-lived TURN credentials, and set up an RTCPeerConnection.

export async function fetchTurnCredentials(apiUrl, userId) {
  const res = await fetch(`${apiUrl}/api/calls/turn_credentials?user_id=${userId}`);
  if (!res.ok) throw new Error("Couldn't fetch calling credentials.");
  return res.json();
}

// `onIceCandidate`/`onTrack`/`onConnectionStateChange` are plain
// callbacks - the caller decides what to do with each (push over the
// channel, attach to an <audio> element, flip UI state).
export function createPeerConnection(credentials, { onIceCandidate, onTrack, onConnectionStateChange }) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: credentials.urls, username: credentials.username, credential: credentials.password }],
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate(event.candidate.toJSON());
  };

  pc.ontrack = (event) => onTrack(event.streams[0]);

  pc.oniceconnectionstatechange = () => onConnectionStateChange(pc.iceConnectionState);

  return pc;
}

// Explicit audio constraints, not a bare `audio: true` - without these,
// some browsers/devices (mobile Chrome in particular) pick up
// meaningfully more background hiss/static than with the browser's own
// processing turned on. Real-world testing (2026-07-23) caught audible
// noise on a phone even before anyone spoke, tracing back to this.
export function getMicrophoneStream() {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

// getUserMedia's real DOMException names, translated into what a member
// actually needs to know - not a raw browser error string.
export function microphoneErrorMessage(error) {
  if (error?.name === "NotAllowedError") {
    return "Microphone access was blocked - enable it in your browser settings to continue.";
  }
  if (error?.name === "NotFoundError") {
    return "No microphone found on this device.";
  }
  return "Couldn't access your microphone.";
}

export function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}
