export default function Whitepaper({ onBack }) {
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem', color: 'var(--paper)', lineHeight: '1.75' }}>
      <button onClick={onBack} className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3rem' }}>
        ← Back to Home
      </button>

      <div className="animate-in">
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'clamp(1.9rem, 5vw, 2.5rem)', marginBottom: '0.5rem' }}>How Kuzana Connect Works</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--brass)', fontWeight: 600, marginBottom: '4rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>The short version, before you dive in</p>

        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1rem' }}>1. The Problem</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '1.05rem' }}>
            The current landscape of professional networking is fundamentally broken. Platforms like LinkedIn and X are saturated with noise, spam, and superficial connections. Finding a genuine co-founder, a high-level lead developer, or an aligned investor takes months of manual searching and vetting.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>
            <strong style={{ color: 'var(--paper)' }}>Kuzana Connect</strong> combines a real voice interview, semantic matching, and transparent mutual consent to deliver introductions people actually follow through on - not another feed to scroll.
          </p>
        </section>

        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1rem' }}>2. How the Matching Works</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '1.05rem' }}>
            No long, tedious forms. Just a natural, 5-minute voice interview with our AI.
          </p>
          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--paper)', fontSize: '1rem', marginBottom: '1rem' }}>The AI listens for two things:</p>
            <ul style={{ color: 'var(--muted)', paddingLeft: '1.25rem', fontSize: '1rem', lineHeight: '1.8' }}>
              <li><strong style={{ color: 'var(--paper)' }}>Your offer:</strong> exactly what you're building, your skills, what you can provide.</li>
              <li><strong style={{ color: 'var(--paper)' }}>Your need:</strong> the exact talent, capital, or connection you're looking for.</li>
            </ul>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>
            That conversation gets converted into semantic embeddings. Our PostgreSQL <code>pgvector</code> database then finds real, complementary overlap across the whole network - not just keyword matches.
          </p>
        </section>

        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1rem' }}>3. Transparent Mutual Consent</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '1.05rem' }}>
            Kuzana Connect never auto-connects two people. When a strong match is found, both people see the AI's full reasoning - not just a percentage, but what specifically lines up and what's uncertain.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>
            The dedicated Chat Room only unlocks once both parties independently review that breakdown and say yes. Either side can decline with a reason, which sharpens future matching. This transparency-first mechanic is designed to earn a real response rate instead of ghosting - without adding friction to the funnel itself.
          </p>
        </section>

        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1rem' }}>4. Technology Stack</h2>
          <ul style={{ color: 'var(--muted)', fontSize: '1.05rem', paddingLeft: '1.25rem', lineHeight: '2' }}>
            <li><strong style={{ color: 'var(--paper)' }}>Frontend:</strong> React, Vite</li>
            <li><strong style={{ color: 'var(--paper)' }}>Identity:</strong> Thirdweb SDK (Social Login via Google)</li>
            <li><strong style={{ color: 'var(--paper)' }}>Backend:</strong> Elixir, Phoenix (OTP)</li>
            <li><strong style={{ color: 'var(--paper)' }}>Database:</strong> PostgreSQL with <code>pgvector</code></li>
            <li><strong style={{ color: 'var(--paper)' }}>AI Voice Integration:</strong> Vapi.ai Webhooks</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
