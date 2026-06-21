export default function LandingPage({ onJoinClick, onWhitepaperClick }) {
  return (
    <div style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="brand-logo">B</div>
          <span className="brand-text">Boardy.ai</span>
        </div>
        <div>
          <button onClick={onJoinClick} className="btn-primary" style={{ padding: '0.75rem 2rem', marginTop: '0', borderRadius: '50px' }}>Enter App</button>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 2rem' }}>
        <div className="animate-in" style={{ maxWidth: '800px' }}>
          <div style={{ display: 'inline-block', background: 'rgba(232, 65, 66, 0.1)', border: '1px solid rgba(232, 65, 66, 0.3)', color: 'var(--primary)', padding: '0.5rem 1.2rem', borderRadius: '30px', fontWeight: '600', marginBottom: '2rem', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.85rem' }}>
            The Verified Professional Synergy Protocol
          </div>
          
          <h1 style={{ fontSize: '4.5rem', lineHeight: '1.1', marginBottom: '1.5rem', background: 'linear-gradient(135deg, #ffffff 0%, #a5a5b4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em' }}>
            Don't just network.<br/> <span style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #ff5e78 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Synthesize.</span>
          </h1>
          
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem auto' }}>
            An exclusive, AI-orchestrated ecosystem. Talk to our voice agent, deposit your commitment stake on Avalanche, and let the protocol match you with the precise talent you need to scale.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={onJoinClick} className="btn-primary" style={{ marginTop: '0', width: 'auto', padding: '1.2rem 3rem', fontSize: '1.2rem', borderRadius: '50px' }}>
              Launch App
            </button>
            <button onClick={onWhitepaperClick} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', padding: '1.2rem 3rem', borderRadius: '50px', fontSize: '1.2rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}>
              Read Whitepaper
            </button>
          </div>
        </div>

        {/* Feature grid */}
        <div className="animate-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginTop: '6rem', maxWidth: '1000px', width: '100%', animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
          {[
            { title: "Voice AI Ingestion", desc: "Speak naturally. Our Vapi integration extracts exactly what you are building and what you need." },
            { title: "Vector Matching", desc: "pgvector analyzes 1536-dimensional embeddings to guarantee hyper-accurate professional matches." },
            { title: "Web3 Escrow", desc: "Filter out the noise. Avalanche smart contracts hold commitment stakes to ensure serious intent." }
          ].map((feat, i) => (
            <div key={i} style={{ background: 'rgba(20, 20, 30, 0.4)', padding: '2rem', borderRadius: '20px', border: '1px solid var(--border)', textAlign: 'left', transition: 'transform 0.3s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(232, 65, 66, 0.1)', color: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '1rem' }}>
                ✦
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{feat.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
