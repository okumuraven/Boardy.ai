import KuzanaMark from './KuzanaMark';
import './Whitepaper.css';

const SECTIONS = [
  {
    title: 'Why this exists',
    body: (
      <>
        <p>
          Right now, the way most Kuzana members find the right person is: post in the WhatsApp group, and hope. Or notice someone else's post and hope they answer a DM. It works sometimes - it depends entirely on timing, and on being online at the right moment.
        </p>
        <p>
          That's not a Kuzana problem - the network itself is real. Kuzana businesses have <strong>2x'd revenue in 12 weeks</strong>, and only about <strong>1 in 7 applicants gets accepted</strong> into a batch. The opportunity is already here. Kuzana Connect's only job is to make it findable - the accountant who's solved your exact cash-flow problem, the lender who actually funds businesses at your revenue stage, the advisor who's dealt with KRA before - without waiting on a lucky WhatsApp post.
        </p>
      </>
    ),
  },
  {
    title: 'Three ways in: search, talk, or type',
    body: (
      <>
        <p>
          Some people already know exactly who they're looking for. The <strong>Directory</strong> lets you search and filter by industry, role, and what people need or offer - no interview required, no commitment.
        </p>
        <p>
          If you'd rather just talk it through, a <strong>3-5 minute voice conversation</strong> does the same job: tell Kuzana Connect what you're building, what you need, and what you can offer. Not a voice person? A <strong>text chat</strong> asks the same questions - same result, your choice.
        </p>
      </>
    ),
  },
  {
    title: 'How the matching actually works',
    body: (
      <>
        <div className="panel" style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--paper)', fontSize: '1rem', marginBottom: '1rem' }}>Your conversation gets broken into two separate signals:</p>
          <ul style={{ color: 'var(--muted)', paddingLeft: '1.25rem', fontSize: '1rem', lineHeight: '1.8', margin: 0 }}>
            <li><strong style={{ color: 'var(--paper)' }}>Your offer:</strong> exactly what you're building, your skills, what you can provide.</li>
            <li><strong style={{ color: 'var(--paper)' }}>Your need:</strong> the exact talent, capital, or connection you're looking for.</li>
          </ul>
        </div>
        <p>
          Kuzana Connect looks for real complementary fit - your need against someone else's offer, and theirs against yours - not people who just happen to use similar words.
        </p>
        <p>
          Every shortlisted match gets a second look before it ever reaches you: a review that decides whether the fit is genuinely strong, and writes out why - what lines up, and what's still uncertain. You never see a bare percentage with no explanation.
        </p>
      </>
    ),
  },
  {
    title: 'Nobody gets connected without saying yes',
    body: (
      <>
        <p>
          When a strong match comes through, both sides see the same full picture - the reasoning, what lines up, what's uncertain - and each person decides independently. Say yes, and a private chat opens right away. Say no, and a short reason helps Kuzana Connect learn what a better fit looks like next time.
        </p>
        <p>
          Nobody is pitched. Nobody is auto-connected. That's deliberate - the goal is a response rate people actually follow through on, not another feed to scroll past.
        </p>
      </>
    ),
  },
  {
    title: 'After you connect',
    body: (
      <p>
        The conversation doesn't have to stay stuck in this app. Kuzana Connect helps you find a real time that works for both sides - synced with Google Calendar if you use it, or a simple back-and-forth if you don't - and you can talk it through right here by voice or video, no phone number required on either side.
      </p>
    ),
  },
];

export default function Whitepaper({ onBack, onJoinClick }) {
  return (
    <div>
      <nav className="whitepaper-nav">
        <div className="brand-logo-container">
          <div className="brand-mark"><KuzanaMark /></div>
          <span className="brand-text">Kuzana Connect</span>
        </div>
      </nav>

      <div className="whitepaper-body">
        <button onClick={onBack} className="nav-link whitepaper-back">
          ← Back to Home
        </button>

        <div className="animate-in">
          <h1 className="whitepaper-title">How Kuzana Connect Works</h1>
          <p className="whitepaper-kicker">The short version, before you dive in</p>

          {SECTIONS.map((section, i) => (
            <section key={section.title} className="whitepaper-section">
              <div className="whitepaper-section-heading">
                <span className="whitepaper-section-num">{i + 1}</span>
                <h2 className="whitepaper-section-title">{section.title}</h2>
              </div>
              {section.body}
            </section>
          ))}

          <div className="panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <p style={{ color: 'var(--paper)', fontSize: '0.95rem', margin: 0 }}>
              One more thing: your phone number, if you add one, is never shown to anyone. Matching runs on what you say you need and offer - nothing else.
            </p>
          </div>

          <div className="whitepaper-closing">
            <h2>Ready to find your person?</h2>
            <p>Takes a few minutes to get started - by voice, chat, or the Directory.</p>
            <button onClick={onJoinClick} className="action-btn ready landing-cta" style={{ padding: '0 2rem', height: '56px' }}>
              Get started
              <svg className="landing-cta-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '0.5rem' }}>
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
