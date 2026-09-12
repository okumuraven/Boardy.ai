// Single source of truth for what each nav destination is and does -
// both the interactive tour (tour.js) and the static reference
// (GuideModal.jsx) read from this list, so the two can never drift out
// of sync with each other. `navKey` must match a key in AppShell's
// TABS array - that's how both the tour's spotlight target and the
// modal's icon lookup resolve back to the real nav item.
export const GUIDE_STEPS = [
  {
    navKey: "home",
    title: "Home",
    description:
      "Your dashboard - a quick look at your active intros and recent activity, plus where you do (or redo) your voice or chat interview and see your Offer/Need summary.",
  },
  {
    navKey: "directory",
    title: "Directory",
    description:
      "Browse other members directly and request an introduction yourself, instead of waiting for the matching system to suggest one.",
  },
  {
    navKey: "matches",
    title: "Matches",
    description:
      "Every introduction you've been part of - accept or decline a new one, chat once you're connected, and schedule an intro call from here.",
  },
  {
    navKey: "calls",
    title: "Calls",
    description:
      "A history of your past calls. You place and answer calls from inside a match's chat, not from this tab - this is just the log.",
  },
  {
    navKey: "calendar",
    title: "Calendar",
    description:
      "Every intro call you've scheduled, in one place, so you're never hunting through chats to remember what's coming up.",
  },
  {
    navKey: "bizi",
    title: "Bizi",
    description:
      "Kuzana's verified-business track - apply, submit documents, and get verified so other members can trust who they're connecting with.",
  },
  {
    navKey: "discussion",
    title: "Discussion",
    description:
      "The community board - ask questions, share what you're working on, and hear from other members outside of a one-to-one match.",
  },
  {
    navKey: "profile",
    title: "Profile",
    description:
      "Your own card as other members see it - edit your details, manage photos, and this is also where you sign out.",
  },
];
