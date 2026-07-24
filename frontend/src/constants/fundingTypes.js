// Mirrors Vokazi.Investment.InvestmentProfile.funding_types/0 - keep both
// in sync. What a founder wants, or what an investor/lender provides -
// Korir's (Vula East Africa) specific ask in kuzana_connect_discovery.md.
export const FUNDING_TYPES = ["equity", "loan", "grant", "working_capital"];

export const fundingTypeLabel = (type) =>
  ({ equity: "Equity", loan: "Loan", grant: "Grant", working_capital: "Working capital" })[type] || type;
