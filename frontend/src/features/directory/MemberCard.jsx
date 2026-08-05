import { tagLabel } from "../../constants/connectionTags";
import { fundingTypeLabel } from "../../constants/fundingTypes";
import { roleTitle as roleLabel, isCapitalSideRole } from "../../constants/roles";
import Avatar from "../../components/Avatar";

const roleTitle = (role) => (role ? roleLabel(role) : "Member");

// What shows in place of a "Connect" button once some match already
// exists with this person - never a raw error, always a plain status so
// nobody thinks the button is just broken. Anything that isn't a
// terminal "unlocked"/"declined" status is treated as still-pending
// rather than string-matched against exactly "pending_consent", so this
// never silently falls through to an incorrect "Connect" button.
const statusPill = (match) => {
  if (!match) return null;
  if (match.status === "unlocked") return { label: "Connected", tone: "signal" };
  if (match.status === "declined") return { label: "Not matched", tone: "muted" };
  if (match.my_response === "accepted") return { label: "Request sent", tone: "muted" };
  return { label: "Wants to connect - check Matches", tone: "warn" };
};

// Condensed one-line business summary for investors/lenders to scan
// quickly (kuzana_connect_discovery.md's NAIBAN/Vula finding: they want a
// deal-flow view, not a full profile read). Business stage is rendered
// as plain text here, never a colored badge - see businessStages.js.
const investmentLine = (investment, isInvestorCard) => {
  if (!investment) return null;

  const parts = isInvestorCard
    ? [
        investment.check_size && `Check size: ${investment.check_size}`,
        investment.sectors_of_interest?.length > 0 && investment.sectors_of_interest.join(", "),
      ]
    : [
        investment.funding_amount_sought && `Seeking ${investment.funding_amount_sought}`,
        investment.business_stage,
        investment.funding_types?.length > 0 && investment.funding_types.map(fundingTypeLabel).join(", "),
      ];

  const line = parts.filter(Boolean).join(" · ");
  return line || null;
};

export default function MemberCard({ member, connecting, connectError, onConnect }) {
  const pill = statusPill(member.match);
  const isInvestorCard = isCapitalSideRole(member.role);
  const summary = investmentLine(member.investment, isInvestorCard);

  return (
    <div className="panel directory-card">
      <div className="directory-card-top">
        <Avatar
          avatarUrl={member.avatar_url}
          name={member.name}
          className="match-avatar directory-avatar"
        />
        <div className="directory-card-identity">
          <div className="directory-card-name">
            {member.name || "Someone"}
            {member.verified && (
              <span className="directory-verified-badge" title="GitHub verified">
                ✓
              </span>
            )}
          </div>
          <div className="directory-card-meta">
            {roleTitle(member.role)}
            {member.company ? ` at ${member.company}` : ""}
            {member.industry ? ` · ${member.industry}` : ""}
            {member.location ? ` · ${member.location}` : ""}
          </div>
        </div>
      </div>

      {summary && <p className="directory-card-investment">{summary}</p>}

      {member.offer_text && <p className="directory-card-offer">{member.offer_text}</p>}

      {(member.looking_for_tags?.length > 0 || member.can_help_tags?.length > 0) && (
        <div className="directory-card-tags">
          {member.looking_for_tags?.map((tag) => (
            <span key={`lf-${tag}`} className="directory-tag directory-tag-looking-for" title="Looking for">
              Wants {tagLabel(tag)}
            </span>
          ))}
          {member.can_help_tags?.map((tag) => (
            <span key={`ch-${tag}`} className="directory-tag directory-tag-can-help" title="Can help with">
              Offers {tagLabel(tag)}
            </span>
          ))}
        </div>
      )}

      {member.business_photos?.length > 0 && (
        <div className="directory-card-photos">
          {member.business_photos.map((photoUrl) => (
            <Avatar key={photoUrl} avatarUrl={photoUrl} className="directory-card-photo" />
          ))}
        </div>
      )}

      <div className="directory-card-footer">
        {member.portfolio_url && (
          <a href={member.portfolio_url} target="_blank" rel="noreferrer" className="directory-card-link">
            Portfolio ↗
          </a>
        )}

        {pill ? (
          <span className={`match-status-pill directory-pill-${pill.tone}`}>{pill.label}</span>
        ) : (
          <button className="btn-primary btn-sm" disabled={connecting} onClick={onConnect}>
            {connecting ? "Connecting..." : "Connect"}
          </button>
        )}
      </div>

      {connectError && <p className="directory-card-error">{connectError}</p>}
    </div>
  );
}
