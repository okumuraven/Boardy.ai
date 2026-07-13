import { useState, useEffect, useRef } from "react";
import { useDisconnect, useActiveWallet } from "thirdweb/react";
import { client, activeChain } from "../config/thirdweb";
import Vapi from "@vapi-ai/web";

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
  const [findingMatch, setFindingMatch] = useState(false);
  const [findMatchMessage, setFindMatchMessage] = useState("");

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
      console.log("Call ended. Transcript ready for pgvector extraction.");

      // The webhook saves the transcript and generates embeddings
      // asynchronously, so give it a few seconds before pulling the
      // freshly-updated Offer/Need back into view.
      setProcessingRedo(true);
      setTimeout(() => {
        Promise.resolve(onInterviewCompleteRef.current?.()).finally(() => {
          setProcessingRedo(false);
          setView("summary");
        });
      }, 5000);
    });

    vapi.on("error", (e) => {
      console.error(e);
      setCallStatus("inactive");
    });

    return () => vapi.removeAllListeners();
  }, []);

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

      {view === "summary" ? (
        <main className="onboarding-container" style={{ justifyContent: 'center', animation: 'fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
          <h1 className="ai-greeting" style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>
            {processingRedo ? "Updating your profile..." : "Welcome back."}
          </h1>
          <p className="ai-subtext" style={{ maxWidth: '600px', marginBottom: '2rem' }}>
            {processingRedo
              ? "Vokazi is transcribing your new interview and regenerating your match vectors. This usually takes a few seconds."
              : "Here's what Vokazi has on file for you from your last interview."}
          </p>

          {processingRedo ? (
            <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
          ) : (
            <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="panel">
                <p className="panel-label">Your Offer</p>
                <div style={{ color: 'rgba(237,232,221,0.85)', fontSize: '0.95rem', lineHeight: '1.6' }}>{profile?.offer_text}</div>
              </div>
              <div className="panel">
                <p className="panel-label">Your Need</p>
                <div style={{ color: 'rgba(237,232,221,0.85)', fontSize: '0.95rem', lineHeight: '1.6' }}>{profile?.need_text}</div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => setView("interview")} className="btn-ghost">
                  Redo Interview
                </button>
                <button onClick={handleFindMatch} disabled={findingMatch} className="btn-primary">
                  {findingMatch ? "Searching..." : "Find a Match"}
                </button>
              </div>
              {findMatchMessage && (
                <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>{findMatchMessage}</p>
              )}
            </div>
          )}
        </main>
      ) : (
      <main className="onboarding-container" style={{ justifyContent: 'center', animation: 'fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        {profile?.offer_text && (
          <button
            onClick={() => setView("summary")}
            className="btn-ghost back-to-profile"
            style={{ position: 'absolute', top: '6rem', right: '3rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            ← Back to profile
          </button>
        )}
        <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

          {/* Pulsing Rings when Active */}
          {callStatus === "active" && (
            <>
              <div style={{ position: 'absolute', inset: -20, border: '2px solid #e84142', borderRadius: '50%', opacity: 0.5, animation: 'pulse 1.5s infinite' }}></div>
              <div style={{ position: 'absolute', inset: -40, border: '1px solid #e84142', borderRadius: '50%', opacity: 0.3, animation: 'pulse 1.5s infinite 0.3s' }}></div>
              <div style={{ position: 'absolute', inset: -60, border: '1px solid #e84142', borderRadius: '50%', opacity: 0.1, animation: 'pulse 1.5s infinite 0.6s' }}></div>
            </>
          )}

          {/* Main Button */}
          <button
            onClick={handleCallClick}
            className={`action-btn ${callStatus === "inactive" ? 'ready' : ''}`}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              position: 'relative',
              zIndex: 10,
              background: callStatus === "active" ? 'rgba(232, 65, 66, 0.1)' : undefined,
              border: callStatus === "active" ? '2px solid #e84142' : 'none'
            }}
          >
            {callStatus === "inactive" && (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
            )}
            {callStatus === "connecting" && <div className="spinner" style={{ width: '30px', height: '30px' }}></div>}
            {callStatus === "active" && (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e84142" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
              </svg>
            )}
          </button>
        </div>

        <h1 className="ai-greeting" style={{ fontSize: '2.8rem', marginBottom: '1rem', animationDelay: '0.1s' }}>
          {callStatus === "inactive" ? "Vokazi is ready to listen." : ""}
          {callStatus === "connecting" ? "Establishing connection..." : ""}
          {callStatus === "active" ? <span className="accent-text">Listening...</span> : ""}
        </h1>

        <p className="ai-subtext" style={{ maxWidth: '600px', animationDelay: '0.2s', marginBottom: '2rem' }}>
          {callStatus === "inactive"
            ? "Tap the microphone. Explain exactly what your startup is building, what technical challenges you face, and what resources you are offering to the ecosystem."
            : "Speak naturally. Our AI is extracting your technical requirements and preparing them for vectorization."}
        </p>

        {/* Live Transcript Box */}
        {callStatus === "active" && transcript && (
          <div className="panel animate-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '200px', overflowY: 'auto' }}>
            <p className="panel-label">Live Transcript</p>
            <div style={{ color: 'rgba(237,232,221,0.8)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {transcript}
            </div>
          </div>
        )}

      </main>
      )}
    </div>
  );
}
