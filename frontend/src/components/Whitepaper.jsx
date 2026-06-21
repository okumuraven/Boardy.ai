export default function Whitepaper({ onBack }) {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem', color: 'var(--text-main)', lineHeight: '1.8' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color='white'} onMouseOut={(e) => e.target.style.color='var(--text-muted)'}>
        ← Back to Home
      </button>

      <div className="animate-in">
        <h1 className="title" style={{ fontSize: '3.5rem', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>Boardy.ai Lightpaper</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--primary)', fontWeight: '600', marginBottom: '4rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Version 1.0.0 - Protocol Specification</p>

        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', color: 'white' }}>1. Abstract & The Problem</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '1.15rem' }}>
            The current landscape of professional networking is fundamentally broken. Platforms like LinkedIn and X are saturated with noise, spam, and superficial connections. Finding a genuine co-founder, a high-level lead developer, or an aligned investor takes months of manual searching and vetting.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem' }}>
            <strong>Boardy.ai</strong> introduces the <em>Verified Professional Synergy Protocol</em>. By combining Conversational AI, high-dimensional Vector Similarity Matching, and Web3 Smart Contracts, Boardy.ai eliminates networking friction and mathematically guarantees high-conviction introductions.
          </p>
        </section>

        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', color: 'white' }}>2. Architecture & The AI Oracle</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '1.15rem' }}>
            Users do not fill out long, tedious forms. Instead, they engage in a natural, 5-minute voice interview with the Boardy AI Voice Agent.
          </p>
          <div style={{ background: 'rgba(20,20,30,0.5)', border: '1px solid var(--border)', padding: '2rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '1rem' }}>The AI acts as an Oracle, extracting two critical data points from the conversation:</p>
            <ul style={{ color: 'var(--text-muted)', paddingLeft: '1.5rem', fontSize: '1.1rem', lineHeight: '1.8' }}>
              <li><strong>The Offer Vector:</strong> Exactly what the user is building, their skills, and what they can provide.</li>
              <li><strong>The Need Vector:</strong> The exact talent, capital, or synergy they are looking for.</li>
            </ul>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem' }}>
            These responses are processed through Large Language Models to generate 1536-dimensional semantic embeddings. Our PostgreSQL `pgvector` database then performs cosine similarity mapping to find mathematically perfect overlapping needs across the network.
          </p>
        </section>

        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', color: 'white' }}>3. Web3 Escrow & Staking (Avalanche)</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '1.15rem' }}>
            To ensure absolute intent and filter out bad actors, Boardy.ai leverages the Avalanche blockchain for its speed and low finality. When a perfect match is found by the AI, both parties are notified.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem' }}>
            To unlock the introduction and enter the dedicated Chat Room, both parties must deposit a small commitment stake (e.g., 0.5 AVAX) into a decentralized smart contract escrow. Once the collaboration occurs and is confirmed, the stake is returned or used to fund the initial work. This "Skin-in-the-game" mechanic ensures 100% response rates.
          </p>
        </section>

        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', color: 'white' }}>4. Technology Stack</h2>
          <ul style={{ color: 'var(--text-muted)', fontSize: '1.15rem', paddingLeft: '1.5rem', lineHeight: '2' }}>
            <li><strong>Frontend:</strong> React, Vite, CSS Glassmorphism Engine</li>
            <li><strong>Web3 Auth:</strong> Thirdweb SDK (In-App Wallets & Social Login)</li>
            <li><strong>Backend:</strong> Elixir, Phoenix (OTP)</li>
            <li><strong>Database:</strong> PostgreSQL with `pgvector` extension</li>
            <li><strong>AI Voice Integration:</strong> Vapi.ai Webhooks</li>
            <li><strong>Blockchain:</strong> Avalanche Fuji Testnet</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
