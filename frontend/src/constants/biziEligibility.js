// The real form's "must meet ALL below requirements" checklist
// (form.kuzana.co/apply, captured in kuzana_website.md §9), grouped into
// three digestible clusters instead of one long list (bizi_flow.md §4) -
// still requires every single key checked before submission, matching
// Kuzana's own rule exactly. Keys mirror
// backend/lib/vokazi/bizi/application.ex's @eligibility_keys - keep both
// in sync.
export const ELIGIBILITY_GROUPS = [
  {
    label: "Where you operate",
    items: [
      { key: "operating_in_kenya", label: "Operating in Kenya" },
      {
        key: "lives_in_kenya",
        label:
          "You commit to living in Kenya (Kenyan or expat with a work permit - no telephone entrepreneurs)",
      },
    ],
  },
  {
    label: "What you're building toward",
    items: [
      {
        key: "revenue_ambition_7yr",
        label: "Bold ambition to reach Ksh100m+ monthly revenue within 7 years",
      },
      { key: "revenue_traction", label: "Minimum Ksh400k+ in monthly revenue today" },
      {
        key: "wants_equity",
        label: "You want an equity investment (Kuzana doesn't offer loans or grants)",
      },
      { key: "coachable", label: "You're coachable - you have a growth mindset" },
    ],
  },
  {
    label: "How you run the business today",
    items: [
      {
        key: "time_commitment",
        label: "You spend 80%+ of your time and 48+ hours a week on this business",
      },
      {
        key: "professional_accounting",
        label: "You'll use a professional accounting system, like Zoho",
      },
      {
        key: "monthly_reconciliation",
        label: "You'll complete accounting reconciliation by the 5th of each month",
      },
      { key: "reliable_email", label: "You use a reliable email server, like Google Workspace" },
    ],
  },
];

export const ELIGIBILITY_KEYS = ELIGIBILITY_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export const emptyEligibility = () =>
  Object.fromEntries(ELIGIBILITY_KEYS.map((key) => [key, false]));

export const allEligibilityChecked = (eligibility) =>
  ELIGIBILITY_KEYS.every((key) => eligibility[key] === true);
