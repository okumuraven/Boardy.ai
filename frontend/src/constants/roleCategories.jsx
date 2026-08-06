// Visual/functional grouping for the directory card redesign (profile.md
// §2-3) - the 5 roles in roles.js collapse to 3 categories that actually
// behave differently in the UI. Reuses Kuzana's own 3-color brand
// palette (kuzana_playbook.md §2) rather than inventing new hues.
const CATEGORY_BY_ROLE = {
  founder: "founder",
  investor: "capital",
  lender: "capital",
  consultant: "service",
  service_provider: "service",
};

export const roleCategory = (role) => CATEGORY_BY_ROLE[role] || "founder";

const iconBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

// Growth arrow - founders building/scaling something.
function FounderIcon() {
  return (
    <svg {...iconBase}>
      <path d="M4 16 10 10l4 4 6-7" />
      <path d="M16 6h4v4" />
    </svg>
  );
}

// Coin stack - capital-side (investor/lender) deal-flow browsing.
function CapitalIcon() {
  return (
    <svg {...iconBase}>
      <ellipse cx="12" cy="7.5" rx="7" ry="3" />
      <path d="M5 7.5v4.5c0 1.66 3.13 3 7 3s7-1.34 7-3V7.5" />
      <path d="M5 12v4.5c0 1.66 3.13 3 7 3s7-1.34 7-3V12" />
    </svg>
  );
}

// Toolbox - consultants/service providers offering expertise.
function ServiceIcon() {
  return (
    <svg {...iconBase}>
      <rect x="3.5" y="9.5" width="17" height="10" rx="1.5" />
      <path d="M8.5 9.5V7a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2.5" />
      <path d="M3.5 13.5h17" />
    </svg>
  );
}

const ICON_BY_CATEGORY = {
  founder: FounderIcon,
  capital: CapitalIcon,
  service: ServiceIcon,
};

export const categoryIcon = (role) => ICON_BY_CATEGORY[roleCategory(role)];
