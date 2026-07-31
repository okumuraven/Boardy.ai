// Pure WebRTC helpers for In-App Calling (Phase 2, call_feature.md) - no
// React, no channel/socket coupling. CallPanel.jsx owns the signaling
// and state; this just wraps the two things the browser itself does:
// fetch short-lived TURN credentials, and set up an RTCPeerConnection.

import { apiFetch } from "./api";

export async function fetchTurnCredentials() {
  const res = await apiFetch(`/api/calls/turn_credentials`);
  if (!res.ok) {
    const err = new Error("Couldn't fetch calling credentials.");
    err.name = "TurnCredentialsError";
    throw err;
  }
  return res.json();
}

// `onIceCandidate`/`onTrack`/`onConnectionStateChange` are plain
// callbacks - the caller decides what to do with each (push over the
// channel, attach to an <audio> element, flip UI state).
export function createPeerConnection(credentials, { onIceCandidate, onTrack, onConnectionStateChange }) {
  const pc = new RTCPeerConnection({ iceServers: credentials.ice_servers });

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
  if (!navigator.mediaDevices?.getUserMedia) {
    const err = new Error("This browser doesn't support calling.");
    err.name = "UnsupportedBrowserError";
    throw err;
  }
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

// Every real failure mode `setupPeerConnection` can throw, translated
// into what a member actually needs to know - not a raw browser error
// string, and not the wrong category of problem (a server-side TURN
// failure is not a microphone problem, even though both currently
// surface from the same catch block in CallPanel.jsx).
export function callSetupErrorMessage(error) {
  if (error?.name === "NotAllowedError") {
    return "Microphone access was blocked - enable it in your browser settings to continue.";
  }
  if (error?.name === "NotFoundError") {
    return "No microphone found on this device.";
  }
  if (error?.name === "NotReadableError") {
    return "Your microphone is already in use by another app - close it and try again.";
  }
  if (error?.name === "UnsupportedBrowserError") {
    return "This browser doesn't support calling - try a recent version of Chrome, Safari, or Edge.";
  }
  if (error?.name === "TurnCredentialsError") {
    return "Couldn't set up the call right now - please try again in a moment.";
  }
  return "Couldn't start the call. Please try again.";
}

export function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}
