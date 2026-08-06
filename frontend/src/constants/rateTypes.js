// Mirrors Vokazi.Accounts.Profile.rate_types/0 - keep both in sync. How
// a consultant/service provider actually gets paid (profile.md §4.2).
export const RATE_TYPES = ["hourly", "retainer", "project"];

export const rateTypeLabel = (type) =>
  ({ hourly: "Hourly", retainer: "Retainer", project: "Project-based" })[type] || type;
