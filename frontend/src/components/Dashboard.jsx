import { useState, useEffect, useRef } from "react";
import { useDisconnect, useActiveWallet } from "thirdweb/react";
import { client, activeChain } from "../config/thirdweb";
import Vapi from "@vapi-ai/web";
import InterviewProcessing from "./InterviewProcessing";
import ProfileSummary from "./ProfileSummary";
import VoiceInterview from "./VoiceInterview";

export default function Dashboard({ profile, onInterviewComplete, onFindMatch }) {
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const [callStatus, setCallStatus] = useState("inactive"); // inactive, connecting, active
  const [vapiInstance, setVapiInstance] = useState(null);
  const [transcript, setTranscript] = useState("");
  // "summary": show the previous interview's Offer/Need with a Redo option.
  // "interview": show the mic UI (first-time users land here directly).
  const [view, setView] = useState(profile?.offer_text ? "summary" : "interview");
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
          .map(c => `${c.role === 'user' ? 'You' : 'Vokazi'}: ${c.text || c.content || ""}`)
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
        await vapiInstance?.start(assistantId, {
          metadata: {
            vokazi_user_id: profile.id,
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
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <nav className="nav-bar">
        <div className="brand-logo-container">
          <div className="vokazi-icon">V</div>
          <span className="brand-text">Vokazi Intelligence</span>
        </div>
        <div className="nav-actions">
          <div className="user-pill">
            {profile?.name || 'Verified Identity'}
          </div>
          <button
            onClick={() => { if (wallet) disconnect(wallet); }}
            className="btn-ghost btn-sm"
          >
            Disconnect
          </button>
        </div>
      </nav>

      {processingRedo ? (
        <InterviewProcessing />
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
        <VoiceInterview
          profile={profile}
          callStatus={callStatus}
          transcript={transcript}
          onCallClick={handleCallClick}
          onBackToProfile={() => setView("summary")}
        />
      )}
    </div>
  );
}
