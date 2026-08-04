// Mirrors backend/lib/vokazi/bizi/application.ex's @statuses exactly -
// keep both in sync. See bizi_verification_system.md §2 for why
// "verification" collapses the DD visit + references + finance check
// into one stage instead of three.
export const BIZI_STATUSES = [
  "submitted",
  "screening",
  "documents_requested",
  "verification",
  "expert_review",
  "board_review",
];

export const BIZI_TERMINAL_STATUSES = ["approved", "declined"];

export const BIZI_STATUS_LABELS = {
  submitted: "Submitted",
  screening: "Screening",
  documents_requested: "Documents",
  verification: "Verification",
  expert_review: "Expert review",
  board_review: "Board review",
  approved: "Approved",
  declined: "Declined",
};

export const biziStatusLabel = (status) => BIZI_STATUS_LABELS[status] || status;
