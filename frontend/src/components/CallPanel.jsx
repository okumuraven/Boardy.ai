import { useState, useEffect, useRef } from "react";
import { fetchTurnCredentials, createPeerConnection, getMicrophoneStream, callSetupErrorMessage, stopStream } from "../lib/webrtc";
import { playRingback, playRingtone, stopRingtone } from "../lib/ringtone";
import { useCallSignaling } from "./useCallSignaling";
import CallOverlay from "./CallOverlay";

// In-App Calling. Phase 1 (call_feature.md) built the ring/accept/
// decline/end signaling; this adds the real media - only the caller
// ever creates an SDP offer (no glare/renegotiation to handle, since a
// call here only ever negotiates once), the callee preps its own mic +
// peer connection the moment it clicks Accept so it's ready the instant
// the offer arrives. Renders as a small button in the chat header when
// idle, and a full overlay for every other state.
export default function CallPanel({ channel, profile, partnerName }) {
  const [status, setStatus] = useState("idle"); // idle | calling | incoming | connecting | in_call | error
  const [incomingFrom, setIncomingFrom] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [callError, setCallError] = useState("");

  const callStartedAtRef = useRef(null);
  const isCallerRef = useRef(false);
  // Round-tripped through every ring/accept/decline/cancel/end push so
  // the backend's CallLog row (call history + ring-timeout) always
  // knows which call this is - see chat_room_channel.ex.
  const callIdRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const remoteAudioRef = useRef(null);

  const cleanupCall = () => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    stopStream(localStreamRef.current);
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    isCallerRef.current = false;
    callIdRef.current = null;
    setMuted(false);
    setCallError("");
  };

  const failCall = (message) => {
    cleanupCall();
    setCallError(message);
    setStatus("error");
  };

  const dismissError = () => {
    setCallError("");
    setStatus("idle");
  };

  useEffect(() => cleanupCall, []);

  const setupPeerConnection = async () => {
    // Defensive: never let two live peer connections/mic streams exist at
    // once, regardless of what triggered a second setup call - a stray
    // duplicate would be exactly the kind of thing that could produce a
    // feedback loop (two connections both sending/receiving audio).
    if (peerConnectionRef.current) cleanupCall();

    const credentials = await fetchTurnCredentials();
    const stream = await getMicrophoneStream();
    localStreamRef.current = stream;

    const pc = createPeerConnection(credentials, {
      onIceCandidate: (candidate) => channel?.push("webrtc_ice_candidate", { candidate }),
      onTrack: (remoteStream) => {
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
      },
      onConnectionStateChange: (state) => {
        if (state === "connected" || state === "completed") setStatus("in_call");
        if (state === "failed") failCall("Connection failed. Try ending and calling again.");
      },
    });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    peerConnectionRef.current = pc;
    return pc;
  };

  const startAudioAsCaller = async () => {
    try {
      const pc = await setupPeerConnection();
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      channel?.push("webrtc_offer", { sdp: offer });
    } catch (err) {
      failCall(callSetupErrorMessage(err));
    }
  };

  useCallSignaling(channel, {
    setIncomingFrom,
    setStatus,
    setElapsed,
    callStartedAtRef,
    isCallerRef,
    callIdRef,
    peerConnectionRef,
    pendingCandidatesRef,
    startAudioAsCaller,
    cleanupCall,
    failCall,
  });

  useEffect(() => {
    if (status !== "in_call") return;
    const interval = setInterval(() => {
      const startedAt = callStartedAtRef.current;
      if (startedAt) setElapsed(Math.floor(Date.now() / 1000) - startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Audibly distinct tones for "I'm calling out" vs. "someone's calling
  // me" - stopped the instant either resolves (accepted, declined,
  // cancelled, ended, or timed out all move `status` away from these
  // two, which this cleanup catches uniformly).
  useEffect(() => {
    if (status === "calling") playRingback();
    if (status === "incoming") playRingtone();
    return () => stopRingtone();
  }, [status]);

  const startCall = () => {
    if (!channel) return;
    isCallerRef.current = true;
    setStatus("calling");
    channel
      .push("call_ring", {})
      .receive("ok", ({ call_id }) => {
        callIdRef.current = call_id;
      })
      .receive("error", () => failCall("Couldn't start the call. Please try again."))
      .receive("timeout", () => failCall("Couldn't start the call. Please try again."));
  };

  const cancelCall = () => {
    const callId = callIdRef.current;
    cleanupCall();
    setStatus("idle");
    channel?.push("call_cancel", { call_id: callId });
  };

  const acceptCall = async () => {
    channel?.push("call_accept", { call_id: callIdRef.current });
    setStatus("connecting");
    try {
      await setupPeerConnection();
    } catch (err) {
      failCall(callSetupErrorMessage(err));
    }
  };

  const declineCall = () => {
    setStatus("idle");
    channel?.push("call_decline", { call_id: callIdRef.current });
  };

  const endCall = () => {
    const duration = elapsed;
    const callId = callIdRef.current;
    cleanupCall();
    setStatus("idle");
    channel?.push("call_end", { call_id: callId, duration_seconds: duration });
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextMuted = !muted;
    stream.getAudioTracks().forEach((track) => (track.enabled = !nextMuted));
    setMuted(nextMuted);
  };

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay />

      {status === "idle" ? (
        <button onClick={startCall} disabled={!channel} className="chat-action-btn btn-ghost" title="Call">
          <span className="btn-icon">📞</span>
          <span className="btn-label">Call</span>
        </button>
      ) : (
        <CallOverlay
          status={status}
          incomingFrom={incomingFrom}
          partnerName={partnerName}
          elapsed={elapsed}
          muted={muted}
          callError={callError}
          onCancel={cancelCall}
          onAccept={acceptCall}
          onDecline={declineCall}
          onEnd={endCall}
          onToggleMute={toggleMute}
          onDismissError={dismissError}
        />
      )}
    </>
  );
}
