import { useState, useEffect } from "react";

// A staged narrative of what's actually happening in order (Vapi hands
// off the transcript, then two sequential Gemini calls run) rather than
// a bare spinner - the exact per-stage timing is a reasonable guess, not
// instrumented from the backend, but the stages and their order are real.
const STAGES = [
  { at: 0, label: "Call received" },
  { at: 4, label: "Transcribing your conversation" },
  { at: 12, label: "Extracting your Offer & Need" },
  { at: 24, label: "Generating your match profile" },
];

const EXPECTED_SECONDS = 35;

export default function InterviewProcessing() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentStageIndex = STAGES.reduce((idx, stage, i) => (elapsed >= stage.at ? i : idx), 0);
  // Never actually reaches 100 here - completion is signaled by the parent
  // unmounting this component once the real poll succeeds, not by the bar.
  const progress = Math.min(92, Math.round((elapsed / EXPECTED_SECONDS) * 100));

  return (
    <div style={{ textAlign: "center", animation: "fadeUpIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 400, fontSize: "1.6rem", margin: "0 0 0.5rem", color: "var(--paper)" }}>
        Processing your interview...
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "0.92rem", maxWidth: "520px", margin: "0 auto 2rem" }}>
        This usually takes under a minute. I'll take you to your profile automatically the moment it's ready.
      </p>

      <div style={{ width: "100%", maxWidth: "440px", margin: "0 auto" }}>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="mono-value" style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.5rem", textAlign: "right" }}>
          {elapsed}s elapsed
        </p>

        <ul className="stage-list">
          {STAGES.map((stage, i) => {
            const status = i < currentStageIndex ? "done" : i === currentStageIndex ? "active" : "pending";
            return (
              <li key={stage.label} className={`stage-item ${status}`}>
                <span className="stage-marker">
                  {status === "done" && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </span>
                {stage.label}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
