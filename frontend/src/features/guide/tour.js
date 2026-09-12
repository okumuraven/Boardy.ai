import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./tour.css";
import { GUIDE_STEPS } from "./guideContent";

const STORAGE_KEY = "kuzana_tour_seen";

// Must match AppShell.jsx's breakpoint exactly (AppShell.css:80) - this
// is the line between the desktop rail (.rail-btn) and the mobile
// tabbar/more-sheet (.tab-btn / .mobile-more-row) being the visible one.
const MOBILE_QUERY = "(max-width: 900px)";

// The complement of AppShell.jsx's MOBILE_PRIMARY_KEYS - these four live
// inside the collapsible "More" sheet on mobile, which only renders its
// rows while open. Kept as a literal list here (not imported) since
// AppShell doesn't currently export it - if that list ever changes,
// update both.
const MOBILE_MORE_KEYS = ["calls", "calendar", "bizi", "discussion"];

export function hasSeenTour() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // If storage is unavailable (private mode, disabled), don't force an
    // auto-tour on every single load - fail toward "already seen."
    return true;
  }
}

function markTourSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Best-effort only - not being able to remember isn't worth erroring over.
  }
}

// Resolves the *currently visible* real nav button for a step, opening
// or closing the mobile "More" sheet as a side effect first if needed.
// Called repeatedly by driver.js's own MutationObserver-based wait
// (`waitForElement` below) until it returns a real element, which is
// exactly what's needed here since opening the sheet is a React state
// update - the row doesn't exist synchronously the instant this runs.
function resolveNavElement(navKey, { onOpenMoreSheet, onCloseMoreSheet }) {
  const isMobile = window.matchMedia(MOBILE_QUERY).matches;

  if (!isMobile) {
    return document.querySelector(`.rail-btn[data-tour="nav-${navKey}"]`);
  }

  if (MOBILE_MORE_KEYS.includes(navKey)) {
    onOpenMoreSheet?.();
    return document.querySelector(`.mobile-more-row[data-tour="nav-${navKey}"]`);
  }

  onCloseMoreSheet?.();
  return document.querySelector(`.tab-btn[data-tour="nav-${navKey}"]`);
}

/**
 * Starts (or jumps into) the nav tour. Never switches Dashboard's/
 * AppShell's activeTab itself - it only spotlights nav buttons in place,
 * so whatever the member was looking at is exactly what they're still
 * looking at once the tour ends.
 *
 * `onOpenMoreSheet`/`onCloseMoreSheet` should be AppShell's
 * `() => setMoreOpen(true/false)` - required for the mobile "More" group
 * to work, harmless to omit on a desktop-only caller.
 */
export function startTour({ fromKey, onOpenMoreSheet, onCloseMoreSheet } = {}) {
  const isMobile = window.matchMedia(MOBILE_QUERY).matches;

  const steps = GUIDE_STEPS.map((step) => ({
    element: () => resolveNavElement(step.navKey, { onOpenMoreSheet, onCloseMoreSheet }),
    // 600ms - generous relative to a React state commit (one tick), but
    // still short enough that a genuinely missing/renamed data-tour
    // attribute fails fast (skipMissingElement below) instead of
    // stalling the whole tour on one bad step.
    waitForElement: 600,
    popover: {
      title: step.title,
      description: step.description,
      side: isMobile ? "top" : "right",
      align: "start",
    },
  }));

  const startIndex = fromKey ? GUIDE_STEPS.findIndex((s) => s.navKey === fromKey) : 0;

  const driverObj = driver({
    showProgress: true,
    allowClose: true,
    skipMissingElement: true,
    overlayOpacity: 0.6,
    stagePadding: 6,
    popoverClass: "kuzana-tour-popover",
    doneBtnText: "Got it!",
    onDestroyed: () => {
      onCloseMoreSheet?.();
      markTourSeen();
    },
    steps,
  });

  driverObj.drive(startIndex === -1 ? 0 : startIndex);
  return driverObj;
}
