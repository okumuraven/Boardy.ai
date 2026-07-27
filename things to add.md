# Things to Add — Backlog from the Kuzana Playbook Cross-Check

**Written 2026-07-26.** Not a build order, not a commitment — just a running list of real gaps
found by re-reading `kuzana_playbook.md` against what's actually built, so they can get picked up
one at a time instead of all at once. Per the Playbook's own stated philosophy (§8): *"avoid
overcomplicated tooling too early — the bottleneck is operational consistency, not software
sophistication."* Nothing here should get built just because it's on this list — only when
explicitly picked.

Check an item's box when it's actually shipped and verified, not when it's merely started.

---

## 1. Onboarding conversion funnel

- [ ] Not started

**Why:** `kuzana_playbook.md` §8's single clearest stated insight: *"the real leverage point is
improving conversion of incomplete applications, not driving more raw traffic"* — with a named
follow-up sequence (reminder email → WhatsApp reminder → "need help?" nudge → urgency reminder).
Right now the admin Members list shows each person's `onboarding_completed`/interview status
individually, and Stats shows an aggregate `onboarded_members` count, but there's no funnel view
(signed up → profile completed → voice interview completed) and no easy way to filter "who's stuck
right now" so staff can actually go do the WhatsApp-nudge-equivalent Kuzana's own playbook
describes.

**Rough scope, when picked up:**
- `Vokazi.Admin.Stats` — add a funnel breakdown: total signed in / completed `ProfileSetup` /
  completed voice interview, each as its own count (three simple `Repo.aggregate` queries against
  existing fields — no schema change).
- `Vokazi.Admin.Members.list_members/1` — add a `:stuck` filter option (onboarding started but not
  finished, or profile done but no interview) so Support can pull up a worklist.
- Frontend: a small funnel chart/breakdown on `StatsView`, and a "Stuck in onboarding" quick-filter
  option in `MembersListView`.
- This is exactly the concrete case that makes `reveal_phone` (already built) useful in practice —
  staff would use the phone reveal specifically to do the WhatsApp follow-up step by hand.

---

## 2. Bizi Buddy System (structured accountability-partner feature)

- [ ] Not scoped yet — needs an explicit product decision before any implementation work starts

**Why:** `kuzana_playbook.md` §6/§12 names this directly: *"a ready-made spec if Connect ever
builds a structured accountability-partner feature, distinct from its current AI-matched networking
flow."* This is **not an admin-panel gap** — it would be a new member-facing product feature, not
just admin tooling. Documented here so the spec doesn't get lost, not because it's decided.

**What the Playbook's real-world precedent actually looks like** (§6), if this is ever scoped:
- Pairing rule: buddies come from **different companies**, same batch.
- Weekly check-ins, acting as a trusted sounding board before major decisions.
- Workshop/session accountability — buddies keep each other on time, brief each other on missed
  sessions.
- Decision-consultation trigger — before major professional decisions (strategy changes,
  escalating operational problems, role changes), a Bizi is expected to consult their buddy.
- Early-warning — buddies raise real concerns to the Kuzana team if they observe risk to their
  partner's business.
- Confidentiality rule — what's shared between buddies stays confidential unless there's org risk,
  escalation is needed, or the Bizi consents to sharing.
- Also functions as first-line conflict mediation between Kuzana and the buddy's company.

**Real blocker if this gets picked up**: Connect has no concept of "batch" at all today (no field
on `User`, no batch-scoped grouping anywhere) — the cross-company/same-batch pairing rule can't be
enforced without first deciding whether/how to model batches. Worth a real design conversation, not
a quick add.

---

## Explicitly not on this list (checked, correctly out of scope)

- **WhatsApp moderation** — the literal `?` ownership gap in Kuzana's own CG Handover table
  (`kuzana_playbook.md` §1, §7). Deliberately excluded from Connect's admin panel per
  `Admin panel.md` §1's boundary decision — revisit only if Kuzana explicitly asks to consolidate,
  not by default.
- **CSV/bulk data export** — already named as deferred in `Admin panel.md` §12. If it's ever built,
  it should follow Kuzana's own 15-rule data-hygiene standard (`kuzana_playbook.md` §9 — one table
  per sheet, stable IDs, blank≠zero, etc.), since they will evaluate it against their own rules.
- **Paid/premium membership tier** — already named as deferred in `Admin panel.md` §10.
- **Investment/deal-flow pipeline (§4), Strategy Board/workshop delivery mechanics (§6 beyond the
  matching precedent), marketing/content pipeline (§8), legal/finance (§11)** — all explicitly
  Kuzana's own separate accelerator operations, not Connect's concern per `Admin panel.md` §1.
