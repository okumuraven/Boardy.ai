// Verbatim from the real live application form (form.kuzana.co/apply,
// captured in kuzana_website.md §9) - Kuzana's own program-track
// taxonomy. Mirrors backend/lib/vokazi/bizi/application.ex's @tracks -
// keep both in sync. Deliberately separate from constants/industries.js:
// the two lists don't map 1:1 (see bizi_flow.md §3).
export const BIZI_TRACKS = [
  "Hospitality & Tourism",
  "Logistics, Import & Export",
  "Fintech",
  "Construction",
  "Agri-Processing & Manufacturing",
  "Retail & D2C",
  "Cosmetics & Fashion",
  "Other",
];

// A suggested default only, never a forced mapping - nothing here
// pretends the two taxonomies are equivalent. Anything not listed falls
// back to "Other", which the applicant can always change.
const INDUSTRY_TO_TRACK = {
  Agribusiness: "Agri-Processing & Manufacturing",
  Logistics: "Logistics, Import & Export",
  Finance: "Fintech",
  Investment: "Fintech",
  Hospitality: "Hospitality & Tourism",
  "Retail & Consumer Goods": "Retail & D2C",
};

export const suggestTrack = (industry) => INDUSTRY_TO_TRACK[industry] || "Other";

// Real, time-sensitive facts from the live form (kuzana_website.md §9) -
// hardcoded for now since there's no admin surface yet to manage which
// batch is currently open. Update this when Kuzana opens the next batch.
export const CURRENT_BATCH = {
  label: "Batch 4",
  startsOn: "July 10, 2026",
  softDeadline: "May 31, 2026",
  rollsToLabel: "Batch 5",
};

// The real form's own list (kuzana_website.md §9), plus one addition:
// "Kuzana Connect" is a lead source the original form predates, since
// this feature didn't exist when that list was written - worth adding
// for Kuzana's own attribution tracking (bizi_flow.md §3).
export const HEARD_ABOUT_OPTIONS = [
  "Kuzana Connect",
  "Referral",
  "Facebook",
  "Instagram",
  "Reapplication",
  "Kuzana staff called or emailed you",
  "LinkedIn",
  "Google/Search",
  "TikTok",
  "Other",
];
