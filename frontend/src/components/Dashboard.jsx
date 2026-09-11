import { useState, useEffect, useRef } from "react";
import Vapi from "@vapi-ai/web";
import InterviewProcessing from "./InterviewProcessing";
import ProfileSummary from "./ProfileSummary";
import VoiceInterview from "./VoiceInterview";
import ChatInterview from "./ChatInterview";

// Owns the voice-interview lifecycle and the offer/need summary - no
// longer renders its own top nav, since the app shell now provides
// persistent chrome (and the wallet-disconnect action lives on the
// Profile view instead).
export default function Dashboard({ profile, onInterviewComplete, onFindMatch }) {
  const [callStatus, setCallStatus] = useState("inactive"); // inactive, connecting, active
  const [vapiInstance, setVapiInstance] = useState(null);
  const [transcript, setTranscript] = useState("");
  // "summary": show the previous interview's Offer/Need with a Redo option.
  // "interview": show the mic UI (first-time users land here directly).
  const [view, setView] = useState(profile?.offer_text ? "summary" : "interview");
  // Which interview UI to show while view === "interview" - voice stays
  // the default (no behavior change for anyone who doesn't touch this),
  // chat is a visible, equally-first-class alternative for members who
  // don't like talking to a voice agent.
  const [mode, setMode] = useState("voice");
  // Set by ChatInterview once there's a real reply to protect - chat's
  // history only ever lives in that component's own state (no server-side
  // conversation storage), so switching tabs mid-chat would otherwise
  // unmount it and silently drop everything typed so far.
  const [chatInProgress, setChatInProgress] = useState(false);
  const [processingRedo, setProcessingRedo] = useState(false);
  const [syncTimedOut, setSyncTimedOut] = useState(false);
  const [checkingAgain, setCheckingAgain] = useState(false);
  const [findingMatch, setFindingMatch] = useState(false);
  const [findMatchMessage, setFindMatchMessage] = useState("");

  const handleCheckAgain = async () => {
    setCheckingAgain(true);
    try {
      const data = await onInterviewCompleteRef.current?.();
      if (data?.offer_text) setSyncTimedOut(false);
    } finally {
      setCheckingAgain(false);
    }
  };

  // Real polling instead of guessing a fixed delay - the actual pipeline
  // (Vapi's own webhook delivery, then two sequential Gemini calls) can
  // easily take longer than a few seconds, especially on a slow network.
  const POLL_INTERVAL_MS = 2500;
  const MAX_POLL_ATTEMPTS = 16; // ~40s ceiling before we stop guessing and tell the user honestly
  const profileRef = useRef(profile);
  const pollTimeoutRef = useRef(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const handleFindMatch = async () => {
    setFindingMatch(true);
    setFindMatchMessage("");
    try {
      const data = await onFindMatch?.();
      if (data?.status === "queued") {
        setFindMatchMessage("No match found yet — check back soon as more people join.");
      } else if (data?.status === "error") {
        setFindMatchMessage("Couldn't reach the server. Please try again.");
      }
      // data?.status === "matched" swaps App.jsx into the MatchReview screen automatically.
    } finally {
      setFindingMatch(false);
    }
  };
  const onInterviewCompleteRef = useRef(onInterviewComplete);
  useEffect(() => {
    onInterviewCompleteRef.current = onInterviewComplete;
  }, [onInterviewComplete]);

  useEffect(() => {
    // Initialize Vapi with Public Key from env
    const VapiClass = Vapi.default || Vapi;
    const vapi = new VapiClass(import.meta.env.VITE_VAPI_PUBLIC_KEY || "dummy_key");
    setVapiInstance(vapi);

    vapi.on("call-start", () => {
      setCallStatus("active");
      setTranscript("");
    });
    
    vapi.on("message", (msg) => {
      if (msg.type === "conversation-update" && msg.conversation) {
        const fullTranscript = msg.conversation
          .filter(c => c.role !== 'system')
          .map(c => `${c.role === 'user' ? 'You' : 'Kuzana Connect'}: ${c.text || c.content || ""}`)
          .join("\n");
        setTranscript(fullTranscript);
      }
    });

    vapi.on("call-end", () => {
      setCallStatus("inactive");
      setProcessingRedo(true);
      setSyncTimedOut(false);
      pollForSync(profileRef.current?.offer_text || null, 0);
    });

    vapi.on("error", (e) => {
      console.error(e);
      setCallStatus("inactive");
    });

    return () => {
      vapi.removeAllListeners();
      clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  // Keeps checking the backend until the interview has genuinely finished
  // processing (offer_text actually changes) rather than assuming a fixed
  // delay was long enough - the webhook delivery plus two sequential
  // Gemini calls can easily take longer than a few seconds.
  const pollForSync = (beforeOffer, attempt) => {
    Promise.resolve(onInterviewCompleteRef.current?.())
      .then((data) => {
        const synced = !!data?.offer_text && data.offer_text !== beforeOffer;
        if (synced) {
          setProcessingRedo(false);
          setView("summary");
        } else if (attempt + 1 >= MAX_POLL_ATTEMPTS) {
          setProcessingRedo(false);
          setSyncTimedOut(true);
          setView("summary");
        } else {
          pollTimeoutRef.current = setTimeout(() => pollForSync(beforeOffer, attempt + 1), POLL_INTERVAL_MS);
        }
      })
      .catch(() => {
        if (attempt + 1 >= MAX_POLL_ATTEMPTS) {
          setProcessingRedo(false);
          setSyncTimedOut(true);
          setView("summary");
        } else {
          pollTimeoutRef.current = setTimeout(() => pollForSync(beforeOffer, attempt + 1), POLL_INTERVAL_MS);
        }
      });
  };

  // Chat's finish endpoint only acks that the async pipeline (extract →
  // tags → embeddings → matchmaking) has started - same reasoning as
  // Vapi's webhook (a single Gemini call can run well past what an HTTP
  // request should ever block on), so this reuses the exact same
  // poll-for-sync loop voice's call-end handler uses below.
  const handleChatFinished = () => {
    setProcessingRedo(true);
    setSyncTimedOut(false);
    pollForSync(profileRef.current?.offer_text || null, 0);
  };

  const handleCallClick = async () => {
    if (callStatus === "active" || callStatus === "connecting") {
      vapiInstance?.stop();
      setCallStatus("inactive");
    } else {
      setCallStatus("connecting");
      try {
        const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;
        if (!assistantId) {
          alert("Please add VITE_VAPI_ASSISTANT_ID to your frontend/.env file!");
          setCallStatus("inactive");
          return;
        }

        // Identity Resolution: pass the profile id via Vapi's `metadata` override.
        // Vapi echoes this back untouched on every server event for this call,
        // including `call.assistantOverrides.metadata` in the end-of-call-report
        // webhook, so the backend never has to parse it out of the transcript.
        //
        // transcriber override - real tester feedback (a Kenyan-accented
        // speaker) found the interview frequently mis-heard them, forcing
        // repeats. The assistant's transcriber has never been explicitly
        // configured anywhere in this codebase, so it's been running on
        // whatever Vapi's dashboard default is. Deepgram's nova-2 model
        // with the generic "en" language code (not a region-locked tag
        // like "en-US") is Deepgram's own recommendation for the widest,
        // most accent-robust English coverage - explicitly setting it
        // here removes the guesswork regardless of what the dashboard
        // currently has. This is the most direct lever available without
        // Vapi dashboard access; it hasn't been verified against a live
        // accented speaker from this environment (no real microphone to
        // test with here), so re-test with a real call after deploying.
        await vapiInstance?.start(assistantId, {
          metadata: {
            kuzana_user_id: profile.id,
          },
          transcriber: {
            provider: "deepgram",
            model: "nova-2",
            language: "en",
          },
        });
      } catch (err) {
        console.error("Vapi Error Full:", err);
        // Vapi nests its errors deeply. We need to extract the exact reason.
        const errorReason = err?.error?.message || err?.message || JSON.stringify(err);
        alert(`Vapi Server Rejected the Call. Reason: ${errorReason}`);
        setCallStatus("inactive");
      }
    }
  };

  return (
    <div style={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {processingRedo ? (
        <InterviewProcessing channel={mode} />
      ) : view === "summary" ? (
        <ProfileSummary
          profile={profile}
          syncTimedOut={syncTimedOut}
          checkingAgain={checkingAgain}
          onCheckAgain={handleCheckAgain}
          onRedo={() => setView("interview")}
          onFindMatch={handleFindMatch}
          findingMatch={findingMatch}
          findMatchMessage={findMatchMessage}
        />
      ) : (
        <div>
          {/* Only meaningful mid-interview, and only before either channel
              has produced live progress worth losing - hidden once a voice
              call is active/connecting or a chat has real turns, same as
              you wouldn't want to lose an in-progress call or conversation
              by fat-fingering the other tab. */}
          {callStatus === "inactive" && !chatInProgress && (
            <div className="mode-toggle" style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <button
                onClick={() => setMode("voice")}
                className={mode === "voice" ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
              >
                🎙 Talk
              </button>
              <button
                onClick={() => setMode("chat")}
                className={mode === "chat" ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
              >
                💬 Chat
              </button>
            </div>
          )}

          {mode === "voice" ? (
            <VoiceInterview
              profile={profile}
              callStatus={callStatus}
              transcript={transcript}
              onCallClick={handleCallClick}
              onBackToProfile={() => setView("summary")}
            />
          ) : (
            <ChatInterview
              profile={profile}
              onFinished={handleChatFinished}
              onBackToProfile={() => setView("summary")}
              onProgress={setChatInProgress}
            />
          )}
        </div>
      )}
    </div>
  );
}
