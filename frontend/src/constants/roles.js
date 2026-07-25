// Mirrors the closed list in backend/lib/vokazi/accounts/user.ex - keep
// both in sync. Drawn from the real member types across the 15 interviews
// in kuzana_connect_discovery.md (founders, investors, lenders,
// consultants/advisors, service providers), not a generic startup taxonomy.
export const ROLES = ["founder", "investor", "lender", "consultant", "service_provider"];

export const ROLE_LABELS = {
  founder: "Founder",
  investor: "Investor",
  lender: "Lender",
  consultant: "Consultant / Advisor",
  service_provider: "Service Provider",
};

export const roleTitle = (role) => ROLE_LABELS[role] || role;

const ROLE_LABELS_PLURAL = {
  founder: "Founders",
  investor: "Investors",
  lender: "Lenders",
  consultant: "Consultants / Advisors",
  service_provider: "Service Providers",
};

// For "Ranked #3 of 12 {plural}" - a naive `role + "s"` breaks for
// "consultant / advisor" and multi-word/snake_case values, so this is a
// real label map rather than string concatenation.
export const rolePlural = (role) => ROLE_LABELS_PLURAL[role] || "peers";

// Investors and lenders are both capital-side, deal-flow members who get
// the structured business-summary UI (InvestmentDetailsForm) instead of
// the voice-interview offer/need path - discovery report §4 explicitly
// treats them as a distinct profile type sharing the same needs, even
// though they're kept as separate role values (a lender's qualifying
// signal - revenue threshold - differs from an equity investor's).
export const isCapitalSideRole = (role) => role === "investor" || role === "lender";
