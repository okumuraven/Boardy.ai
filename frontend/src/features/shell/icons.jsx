const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function HomeIcon() {
  return (
    <svg {...base}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function MatchesIcon() {
  return (
    <svg {...base}>
      <path d="M4 5h16v11H9l-4 4v-4H4z" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg {...base}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  );
}

export function ProfileIcon() {
  return (
    <svg {...base}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

// A megaphone, not a chat bubble - MatchesIcon already owns the bubble
// shape for 1:1 chat, and this tab is a one-way, admin-to-member prompt,
// not a conversation.
export function DiscussionIcon() {
  return (
    <svg {...base}>
      <path d="M3.5 9v6h3l7 4V5l-7 4h-3z" />
      <path d="M17.5 9.5c1.3 1 1.3 4.5 0 5.5" />
    </svg>
  );
}

export function CallHistoryIcon() {
  return (
    <svg {...base}>
      <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

// A shield-check, not a rocket/growth glyph - this tab is where a founder
// tracks their own verification progress, not where the Bizi pitch lives
// (that's still EntryCard's job inside the tab itself).
export function BiziIcon() {
  return (
    <svg {...base}>
      <path d="M12 3.5l6.5 2.7v5.3c0 4.3-2.8 7.3-6.5 8.7-3.7-1.4-6.5-4.4-6.5-8.7V6.2L12 3.5z" />
      <path d="M9 12l2.2 2.2L15.5 9.5" />
    </svg>
  );
}

export function DirectoryIcon() {
  return (
    <svg {...base}>
      <circle cx="9.5" cy="8" r="2.4" />
      <path d="M4.5 19c0-2.8 2.2-4.8 5-4.8s5 2 5 4.8" />
      <circle cx="17" cy="7.5" r="1.8" />
      <path d="M14.8 12.6c1-.6 2.1-.9 3.2-.6 1.7.4 2.9 2 2.9 4" />
    </svg>
  );
}

// Three stacked bars, not dots - reads as "more sections" rather than a
// generic overflow-menu glyph, and stays legible at the small tab-bar size.
export function MoreIcon() {
  return (
    <svg {...base}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}
