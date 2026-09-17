import { CalendarIcon, CallHistoryIcon, MatchesIcon } from "../shell/icons";

// Real SVG, not emoji (renders inconsistently across OS/browsers and
// reads as unpolished next to the rest of the app's actual icon set).
// No sparkle glyph exists in features/shell/icons.jsx yet, so it's
// defined here rather than reusing an unrelated shape for "new match".
export function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M7 7l2.5 2.5M14.5 14.5L17 17M17 7l-2.5 2.5M9.5 14.5L7 17" />
    </svg>
  );
}

// Single source of truth for "what a notification looks like" - shared
// by HomeView's Recent Activity card and NotificationBell's dropdown, so
// the same underlying notification always reads the same way (icon,
// color, accent) regardless of which of the two places it's shown.
// accent is the left-border color - a colored stripe alongside a colored
// icon so scanning a list gives an at-a-glance read of what kind of
// thing happened, instead of every row carrying identical neutral weight.
export const TYPE_GLYPH = {
  chat_message: { Icon: MatchesIcon, bg: "var(--ink-line)", color: "var(--muted)", accent: "var(--ink-line-strong)" },
  calendar_reminder: { Icon: CalendarIcon, bg: "var(--warn-wash)", color: "var(--warn)", accent: "var(--warn)" },
  new_match: { Icon: SparkleIcon, bg: "var(--signal-wash)", color: "var(--signal)", accent: "var(--signal)" },
  incoming_call: { Icon: CallHistoryIcon, bg: "var(--brass-wash)", color: "var(--brass)", accent: "var(--brass)" },
};
