export default function Whitepaper({ onBack }) {
  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem', color: 'var(--paper)', lineHeight: '1.75' }}>
      <button onClick={onBack} className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3rem' }}>
        ← Back to Home
      </button>

      <div className="animate-in">
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 'clamp(1.9rem, 5vw, 2.5rem)', marginBottom: '0.5rem' }}>Vokazi.ai Lightpaper</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--brass)', fontWeight: 600, marginBottom: '4rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Version 1.0.0 · Protocol Specification</p>

        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1rem' }}>1. Abstract &amp; The Problem</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '1.05rem' }}>
            The current landscape of professional networking is fundamentally broken. Platforms like LinkedIn and X are saturated with noise, spam, and superficial connections. Finding a genuine co-founder, a high-level lead developer, or an aligned investor takes months of manual searching and vetting.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>
            <strong style={{ color: 'var(--paper)' }}>Vokazi.ai</strong> introduces the <em>Verified Professional Synergy Protocol</em>. By combining Conversational AI, high-dimensional Vector Similarity Matching, and Web3 Smart Contracts, Vokazi.ai eliminates networking friction and mathematically guarantees high-conviction introductions.
          </p>
        </section>

        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1rem' }}>2. Architecture &amp; The AI Oracle</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '1.05rem' }}>
            Users do not fill out long, tedious forms. Instead, they engage in a natural, 5-minute voice interview with the Vokazi AI Voice Agent.
          </p>
          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--paper)', fontSize: '1rem', marginBottom: '1rem' }}>The AI acts as an Oracle, extracting two critical data points from the conversation:</p>
            <ul style={{ color: 'var(--muted)', paddingLeft: '1.25rem', fontSize: '1rem', lineHeight: '1.8' }}>
              <li><strong style={{ color: 'var(--paper)' }}>The Offer Vector:</strong> Exactly what the user is building, their skills, and what they can provide.</li>
              <li><strong style={{ color: 'var(--paper)' }}>The Need Vector:</strong> The exact talent, capital, or synergy they are looking for.</li>
            </ul>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>
            These responses are processed through Large Language Models to generate 1536-dimensional semantic embeddings. Our PostgreSQL <code>pgvector</code> database then performs cosine similarity mapping to find mathematically perfect overlapping needs across the network.
          </p>
        </section>

        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1rem' }}>3. Web3 Escrow &amp; Staking (Avalanche)</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '1.05rem' }}>
            To ensure absolute intent and filter out bad actors, Vokazi.ai leverages the Avalanche blockchain for its speed and low finality. When a perfect match is found by the AI, both parties are notified.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>
            To unlock the introduction and enter the dedicated Chat Room, both parties must deposit a small commitment stake into a decentralized smart contract escrow. Once the collaboration occurs and is confirmed, the stake is returned or used to fund the initial work. This "skin-in-the-game" mechanic ensures a real response rate instead of ghosting.
          </p>
        </section>

        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1rem' }}>4. Technology Stack</h2>
          <ul style={{ color: 'var(--muted)', fontSize: '1.05rem', paddingLeft: '1.25rem', lineHeight: '2' }}>
            <li><strong style={{ color: 'var(--paper)' }}>Frontend:</strong> React, Vite</li>
            <li><strong style={{ color: 'var(--paper)' }}>Web3 Auth:</strong> Thirdweb SDK (In-App Wallets &amp; Social Login)</li>
            <li><strong style={{ color: 'var(--paper)' }}>Backend:</strong> Elixir, Phoenix (OTP)</li>
            <li><strong style={{ color: 'var(--paper)' }}>Database:</strong> PostgreSQL with <code>pgvector</code></li>
            <li><strong style={{ color: 'var(--paper)' }}>AI Voice Integration:</strong> Vapi.ai Webhooks</li>
            <li><strong style={{ color: 'var(--paper)' }}>Blockchain:</strong> Avalanche Fuji Testnet</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
