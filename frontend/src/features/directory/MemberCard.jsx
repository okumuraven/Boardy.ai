import { tagLabel } from "../../constants/connectionTags";
import { fundingTypeLabel } from "../../constants/fundingTypes";
import { rateTypeLabel } from "../../constants/rateTypes";
import { roleTitle as roleLabel, isCapitalSideRole } from "../../constants/roles";
import { roleCategory, categoryIcon } from "../../constants/roleCategories";
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

// Role category drives three things: a colored ring around the avatar
// plus a wax-seal-style stamp badge (the icon, bolder than a thin
// corner-tick would be - profile.md §3.1, revised 2026-08-06 for more
// visual punch at a glance), and the order content renders in (§3.2) -
// capital-side leads with the deal-flow stat line since that's what
// they're scanning for, everyone else leads with the actual offer/pitch.
// Service/advisory additionally promotes its portfolio link above the
// fold and lists what it can help with before what it's looking for,
// since a case-study link is its strongest credibility signal.
export default function MemberCard({ member, connecting, connectError, onConnect, previewMode }) {
  const pill = statusPill(member.match);
  const isInvestorCard = isCapitalSideRole(member.role);
  const category = roleCategory(member.role);
  const summary = investmentLine(member.investment, isInvestorCard);
  const CategoryIcon = categoryIcon(member.role);

  const offerBlock = member.offer_text && <p className="directory-card-offer">{member.offer_text}</p>;
  const summaryBlock = summary && <p className="directory-card-investment">{summary}</p>;

  // Service/advisory-only (profile.md §4.2) - the two things that
  // actually help a founder decide "should I hire this person," which
  // the generic offer/tags/portfolio fields don't capture on their own.
  const rateLine = category === "service" && member.rate_types?.length > 0 && member.rate_types.map(rateTypeLabel).join(" · ");
  const showsAvailability = category === "service" && member.available_for_hire !== null && member.available_for_hire !== undefined;

  const lookingForTags = member.looking_for_tags?.map((tag) => (
    <span key={`lf-${tag}`} className="directory-tag directory-tag-looking-for" title="Looking for">
      Wants {tagLabel(tag)}
    </span>
  ));
  const canHelpTags = member.can_help_tags?.map((tag) => (
    <span key={`ch-${tag}`} className="directory-tag directory-tag-can-help" title="Can help with">
      Offers {tagLabel(tag)}
    </span>
  ));

  return (
    <div className={`panel directory-card directory-card-${category}`}>
      <div className="directory-card-top">
        <span className={`directory-avatar-ring directory-avatar-ring-${category}`}>
          <Avatar
            avatarUrl={member.avatar_url}
            name={member.name}
            className="match-avatar directory-avatar"
          />
          <span className={`directory-card-stamp directory-card-stamp-${category}`} title={roleTitle(member.role)}>
            <CategoryIcon />
          </span>
        </span>
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

      {member.bio && <p className="directory-card-headline">{member.bio}</p>}

      {category === "service" && (member.portfolio_url || showsAvailability) && (
        <div className="directory-card-service-row">
          {member.portfolio_url && (
            <a
              href={member.portfolio_url}
              target="_blank"
              rel="noreferrer"
              className="directory-card-link-featured"
            >
              View my work ↗
            </a>
          )}
          {showsAvailability && (
            <span className={`directory-availability-pill ${member.available_for_hire ? "is-open" : "is-closed"}`}>
              {member.available_for_hire ? "Open to new clients" : "Not taking clients"}
            </span>
          )}
        </div>
      )}

      {rateLine && <p className="directory-card-rate">{rateLine}</p>}

      {category === "capital" ? (
        <>
          {summaryBlock}
          {offerBlock}
        </>
      ) : (
        <>
          {offerBlock}
          {summaryBlock}
        </>
      )}

      {(lookingForTags?.length > 0 || canHelpTags?.length > 0) && (
        <div className="directory-card-tags">
          {category === "service" ? (
            <>
              {canHelpTags}
              {lookingForTags}
            </>
          ) : (
            <>
              {lookingForTags}
              {canHelpTags}
            </>
          )}
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
        {category !== "service" && member.portfolio_url && (
          <a href={member.portfolio_url} target="_blank" rel="noreferrer" className="directory-card-link">
            Portfolio ↗
          </a>
        )}

        {previewMode ? (
          <span className="match-status-pill directory-pill-muted">This is your card</span>
        ) : pill ? (
          <span className={`match-status-pill directory-pill-${pill.tone}`}>{pill.label}</span>
        ) : (
          <button className="btn-primary btn-sm" disabled={connecting} onClick={onConnect}>
            {connecting ? "Connecting..." : "Connect"}
          </button>
        )}
      </div>

      {!previewMode && connectError && <p className="directory-card-error">{connectError}</p>}
    </div>
  );
}
