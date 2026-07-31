import { useEffect } from "react";

// Wires the chat-room channel's call-lifecycle events (ring/accept/
// decline/cancel/end/timeout) and the WebRTC offer/answer/ICE-candidate
// relay. Extracted from CallPanel.jsx to stay under the 250-line file
// cap - this owns only the channel event bindings; CallPanel.jsx keeps
// ownership of local state and the peer connection/media setup.
export function useCallSignaling(channel, {
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
}) {
  useEffect(() => {
    if (!channel) return;

    const flushPendingCandidates = async () => {
      const pc = peerConnectionRef.current;
      const queued = pendingCandidatesRef.current;
      pendingCandidatesRef.current = [];
      for (const candidate of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const bindings = [
      [
        "call_ring",
        (payload) => {
          isCallerRef.current = false;
          callIdRef.current = payload.call_id;
          setIncomingFrom({ user_id: payload.from_user_id, name: payload.from_name });
          setStatus("incoming");
        },
      ],
      [
        "call_accepted",
        (payload) => {
          callStartedAtRef.current = payload.accepted_at;
          setElapsed(0);
          setStatus("connecting");
          if (isCallerRef.current) startAudioAsCaller();
        },
      ],
      [
        "webrtc_offer",
        async ({ sdp }) => {
          const pc = peerConnectionRef.current;
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            await flushPendingCandidates();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.push("webrtc_answer", { sdp: answer });
          } catch {
            failCall("Couldn't connect the call. Try ending and calling again.");
          }
        },
      ],
      [
        "webrtc_answer",
        async ({ sdp }) => {
          const pc = peerConnectionRef.current;
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            await flushPendingCandidates();
          } catch {
            failCall("Couldn't connect the call. Try ending and calling again.");
          }
        },
      ],
      [
        "webrtc_ice_candidate",
        async ({ candidate }) => {
          const pc = peerConnectionRef.current;
          if (!pc || !pc.remoteDescription) {
            pendingCandidatesRef.current.push(candidate);
            return;
          }
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {
            // A single bad/late candidate isn't fatal to the call - real
            // connectivity failure is already caught by
            // onConnectionStateChange in CallPanel.jsx.
          }
        },
      ],
      [
        "call_declined",
        () => {
          cleanupCall();
          setStatus("idle");
        },
      ],
      [
        "call_cancelled",
        () => {
          cleanupCall();
          setStatus("idle");
        },
      ],
      [
        "call_ended",
        () => {
          cleanupCall();
          setStatus("idle");
        },
      ],
      [
        "call_timeout",
        () => {
          if (isCallerRef.current) {
            failCall("No answer.");
          } else {
            cleanupCall();
            setStatus("idle");
          }
        },
      ],
    ].map(([event, callback]) => [event, channel.on(event, callback)]);

    return () => bindings.forEach(([event, ref]) => channel.off(event, ref));
  }, [channel]);
}
