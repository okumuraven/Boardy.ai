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
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1rem' }}>1. Why this exists</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '1.05rem' }}>
            Right now, the way most Kuzana members find the right person is: post in the WhatsApp group, and hope. Or notice someone else's post and hope they answer a DM. It works sometimes - it depends entirely on timing, and on being online at the right moment.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>
            That's not a Kuzana problem - the network itself is real. Kuzana businesses have <strong style={{ color: 'var(--paper)' }}>2x'd revenue in 12 weeks</strong>, and only about <strong style={{ color: 'var(--paper)' }}>1 in 7 applicants gets accepted</strong> into a batch. The opportunity is already here. Kuzana Connect's only job is to make it findable - the accountant who's solved your exact cash-flow problem, the lender who actually funds businesses at your revenue stage, the advisor who's dealt with KRA before - without waiting on a lucky WhatsApp post.
          </p>
        </section>

        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1rem' }}>2. Two ways in: search, or talk</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '1.05rem' }}>
            Some people already know exactly who they're looking for. The <strong style={{ color: 'var(--paper)' }}>Directory</strong> lets you search and filter by industry, role, and what people need or offer - no interview required, no commitment.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>
            If you'd rather just talk it through, a <strong style={{ color: 'var(--paper)' }}>3-5 minute voice conversation</strong> does the same job: tell Kuzana Connect what you're building, what you need, and what you can offer. No forms, no typing, no script to follow.
          </p>
        </section>

        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1rem' }}>3. How the matching actually works</h2>
          <div className="panel" style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--paper)', fontSize: '1rem', marginBottom: '1rem' }}>Your conversation gets broken into two separate signals:</p>
            <ul style={{ color: 'var(--muted)', paddingLeft: '1.25rem', fontSize: '1rem', lineHeight: '1.8' }}>
              <li><strong style={{ color: 'var(--paper)' }}>Your offer:</strong> exactly what you're building, your skills, what you can provide.</li>
              <li><strong style={{ color: 'var(--paper)' }}>Your need:</strong> the exact talent, capital, or connection you're looking for.</li>
            </ul>
          </div>
          <p style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '1.05rem' }}>
            Kuzana Connect looks for real complementary fit - your need against someone else's offer, and theirs against yours - not people who just happen to use similar words.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>
            Every shortlisted match gets a second look before it ever reaches you: a review that decides whether the fit is genuinely strong, and writes out why - what lines up, and what's still uncertain. You never see a bare percentage with no explanation.
          </p>
        </section>

        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1rem' }}>4. Nobody gets connected without saying yes</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--muted)', fontSize: '1.05rem' }}>
            When a strong match comes through, both sides see the same full picture - the reasoning, what lines up, what's uncertain - and each person decides independently. Say yes, and a private chat opens right away. Say no, and a short reason helps Kuzana Connect learn what a better fit looks like next time.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>
            Nobody is pitched. Nobody is auto-connected. That's deliberate - the goal is a response rate people actually follow through on, not another feed to scroll past.
          </p>
        </section>

        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.6rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--ink-line)', paddingBottom: '1rem' }}>5. After you connect</h2>
          <p style={{ color: 'var(--muted)', fontSize: '1.05rem' }}>
            The conversation doesn't have to stay stuck in this app. Kuzana Connect helps you find a real time that works for both sides - synced with Google Calendar if you use it, or a simple back-and-forth if you don't - and you can talk it through right here by voice or video, no phone number required on either side.
          </p>
        </section>

        <section>
          <div className="panel" style={{ padding: '1.5rem' }}>
            <p style={{ color: 'var(--paper)', fontSize: '0.95rem', margin: 0 }}>
              One more thing: your phone number, if you add one, is never shown to anyone. Matching runs on what you say you need and offer - nothing else.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
