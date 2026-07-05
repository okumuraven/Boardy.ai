import { useState, useEffect } from "react";
import { useDisconnect, useActiveWallet } from "thirdweb/react";
import { client, activeChain } from "../config/thirdweb";
import Vapi from "@vapi-ai/web";

export default function Dashboard({ profile }) {
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const [callStatus, setCallStatus] = useState("inactive"); // inactive, connecting, active
  const [vapiInstance, setVapiInstance] = useState(null);
  const [transcript, setTranscript] = useState("");

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

        // Start the call with ZERO overrides to completely avoid 400 Bad Requests
        await vapiInstance?.start(assistantId);

        // Pillar 2: Send Identity via Transcript Injection
        // Silently push the user_id into the AI's context window. 
        // Vapi will include this string in the final webhook transcript!
        vapiInstance?.send({
          type: "add-message",
          message: {
            role: "system",
            content: `[VOKAZI_SYSTEM_IDENTITY: user_id=${profile.id}]`
          }
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
      
      {/* Background Orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>

      {/* Header */}
      <nav className="nav-bar" style={{ padding: '2rem 3rem' }}>
        <div className="brand-logo-container">
          <div className="vokazi-icon">V</div>
          <span className="brand-text">Vokazi Intelligence</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 500, background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '100px' }}>
            {profile?.name || 'Verified Identity'}
          </div>
          <button 
            onClick={() => { if (wallet) disconnect(wallet); }}
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', color: 'var(--text-muted)', padding: '0.5rem 1rem', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Disconnect
          </button>
        </div>
      </nav>

      {/* Voice UI Center */}
      <main className="onboarding-container" style={{ justifyContent: 'center', animation: 'fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        
        <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* Pulsing Rings when Active */}
          {callStatus === "active" && (
            <>
              <div style={{ position: 'absolute', inset: -20, border: '2px solid var(--primary)', borderRadius: '50%', opacity: 0.5, animation: 'pulse 1.5s infinite' }}></div>
              <div style={{ position: 'absolute', inset: -40, border: '1px solid var(--secondary)', borderRadius: '50%', opacity: 0.3, animation: 'pulse 1.5s infinite 0.3s' }}></div>
              <div style={{ position: 'absolute', inset: -60, border: '1px solid var(--primary)', borderRadius: '50%', opacity: 0.1, animation: 'pulse 1.5s infinite 0.6s' }}></div>
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
              border: callStatus === "active" ? '2px solid #e84142' : 'none',
              boxShadow: callStatus === "active" ? '0 0 40px rgba(232, 65, 66, 0.4)' : undefined
            }}
          >
            {callStatus === "inactive" && (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
            )}
            {callStatus === "connecting" && (
               <div style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            )}
            {callStatus === "active" && (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e84142" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="6" width="12" height="12" rx="2" ry="2"></rect>
              </svg>
            )}
          </button>
        </div>

        <h1 className="ai-greeting" style={{ fontSize: '3rem', marginBottom: '1rem', animationDelay: '0.1s' }}>
          {callStatus === "inactive" ? "Vokazi is ready to listen." : ""}
          {callStatus === "connecting" ? "Establishing Neural Link..." : ""}
          {callStatus === "active" ? <span className="gradient-text">Listening...</span> : ""}
        </h1>
        
        <p className="ai-subtext" style={{ maxWidth: '600px', animationDelay: '0.2s', marginBottom: '2rem' }}>
          {callStatus === "inactive" 
            ? "Tap the microphone. Explain exactly what your startup is building, what technical challenges you face, and what resources you are offering to the ecosystem." 
            : "Speak naturally. Our AI is extracting your technical requirements and preparing them for vectorization."}
        </p>

        {/* Live Transcript Box */}
        {callStatus === "active" && transcript && (
          <div style={{ 
            width: '100%', 
            maxWidth: '600px', 
            background: 'rgba(0,0,0,0.4)', 
            border: '1px solid rgba(0, 240, 255, 0.2)', 
            borderRadius: '24px', 
            padding: '1.5rem', 
            textAlign: 'left',
            animation: 'fadeUpIn 0.4s ease forwards',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            <p style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Live Transcript</p>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {transcript}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
