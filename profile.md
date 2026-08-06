# Profile & Directory Card — Design Ideas for a Professional, Role-Differentiated Experience

**Written 2026-08-06.** Consolidates a design discussion into one doc so the ideas don't get lost
before they're picked up. Nothing here is built yet. Companion docs: `kuzana_connect_discovery.md`
(the member research this is scoped against), `kuzana_playbook.md` (brand voice/terminology rules),
`Admin panel.md` (the `is_verified` mechanism this doc leans on), `boardy_comparison.md` (the
existing directory-card code audit this builds on).

---

## 1. Why this looks the way it does

Two things prompted this doc, both from the same root observation: **every member's profile and
directory card currently uses one generic template regardless of role** (`founder` / `investor` /
`lender` / `consultant` / `service_provider`), even though those five roles use Kuzana Connect for
genuinely different reasons (`kuzana_connect_discovery.md` §4 - investors and lenders are
"look-only, filter-heavy, deal-flow consumers," not symmetrical with founders/service providers).

- **Visual distinctness** - someone scanning the Directory should be able to tell what kind of
  member a card belongs to *at a distance*, without reading the text.
- **Feature distinctness** - a founder's profile should show founder things; an investor's profile
  shouldn't be prompted to add product photos it has no use for; a service provider should get
  fields that actually help someone decide whether to hire them, which today don't exist at all.

Both are about the same underlying fix: **stop treating all five roles as one role with different
label text.**

---

## 2. Role categories (3, not 5)

`isCapitalSideRole/1` already groups investor+lender for content purposes
(`frontend/src/constants/roles.js`). Extending that same grouping, there are really three visual/
functional categories to design for, not five:

| Category | Roles | Kuzana's own brand color (reused, not invented) |
|---|---|---|
| **Founder** | `founder` | `--warn` (coral) |
| **Capital-side** | `investor`, `lender` | `--brass` (blue) |
| **Service/Advisory** | `consultant`, `service_provider` | `--signal` (gold) |

These three colors are Kuzana's *entire* brand palette (`kuzana_playbook.md` §2 - deliberately
minimal, "Rule of Minimal Ink"). Three categories mapping onto three existing brand colors is a
clean fit - no new hues need inventing.

---

## 3. Visual distinctness - the stripe/icon/layout plan

Agreed direction (2026-08-06 design discussion): **combine a bold accent signal with reordered
content**, not one or the other.

### 3.1 Accent signal
First attempt used `.corner-tick` (`frontend/src/index.css`) - stamped-document bracket corners,
color-modified per category. **Revised same day**: too subtle to read "at a distance" in a real
directory grid (confirmed against a live screenshot with real data) - a thin 12px corner bracket
doesn't compete well with avatars, names, and tag pills all in the same visual field. Replaced with a
bolder signal on the one element every card guarantees eyes land on first: the avatar.

- [x] Shipped 2026-08-06, revised same day - new file `frontend/src/constants/roleCategories.jsx` -
      maps the 5 roles to the 3 categories above, each with a small icon component (24x24 viewBox,
      `currentColor`, stroke-width 1.8 - same convention as `frontend/src/features/shell/icons.jsx`):
      growth-arrow (founder), coin-stack (capital-side), toolbox (service/advisory).
- [x] Shipped 2026-08-06 - `MemberCard.jsx`/`Directory.css`: a colored ring around the avatar
      (`box-shadow`, category color) plus a small wax-seal-style stamp badge (filled circle, white
      icon, slight rotation, drop shadow) overlapping the avatar's corner - bolder and more
      "creative" per direct feedback than the corner-tick attempt, while still reusing the same
      3-color brand palette and the codebase's existing stamped-document visual language rather than
      inventing something off-brand.

### 3.2 Content reordering per category (no schema change - uses fields that already exist)
- **Founder card** - offer text -> tags (looking-for before can-help) -> funding info (if raising,
  now after the pitch, not before it) -> portfolio in footer.
- **Capital-side card** - the `check_size`/`sectors_of_interest` stat line (via `investmentLine()` in
  `MemberCard.jsx`) sits directly under identity, above offer text - a deal-flow-scanning UI, per the
  NAIBAN/Vula finding in `kuzana_connect_discovery.md` §4.
- **Service/Advisory card** - portfolio link promoted out of the footer into a prominent
  "View my work ->" pill near the top; tags list `can_help_tags` before `looking_for_tags`.

- [x] Shipped 2026-08-06 - `MemberCard.jsx` implements all three orderings above.
- [x] Shipped 2026-08-06 - `Directory.css` - icon sizing/coloring next to role label; styling for the
      promoted portfolio link (footer duplicate removed for the service/advisory category only).
- [x] Verified 2026-08-06 - rendered all three category cards side by side with mock data
      (bypassing auth) in a throwaway Vite preview page, confirmed corner-tick colors, icons, and
      content order all differ correctly per category, then removed the preview page.

---

## 4. Feature distinctness - fields that should and shouldn't appear per role

Not just card content - the *profile-editing* experience too. Two tiers: presentation-only fixes
(no schema change) vs. genuinely new fields.

### 4.1 Presentation-only (free - just hide/show existing fields per role)

| Feature | Founder | Capital-side | Service/Advisory |
|---|---|---|---|
| Business photos ("show your work") prompt | show | **hide** - no product to show | show (work samples) |
| Funding-ask fields (amount, type, stage, financials) | show if raising | hide | hide |
| Check size / sectors of interest | hide | show | hide |

- [x] Shipped 2026-08-06 - `ProfileView.jsx` now gates `ProfilePhotos` behind
      `!isCapitalSideRole(profile?.role)` - investors/lenders no longer get prompted to add business
      photos.
- [x] Verified 2026-08-06 - `InvestmentDetailsForm.jsx` already correctly branches on
      `isCapitalSideRole` (check size/sectors for investors and lenders vs. business
      stage/amount/financials for founders) - no change needed.

### 4.2 New fields - service/advisory has none of its own today

Consultants and service providers currently reuse the exact same generic
offer/tags/portfolio fields as everyone else - nothing that actually helps a founder evaluate
"should I hire this person." Two candidates, ranked by likely usefulness:

- [x] Shipped 2026-08-06 - **Rate/engagement model** (`rate_types` - hourly, retainer, or
      project-based, a fixed-vocabulary array field on `profiles`, same shape as
      `InvestmentProfile.funding_types`). Migration + `Profile.service_details_changeset/2` (kept out
      of the general `changeset/2`, same separation-of-concerns convention as `photos_changeset/2`) +
      dedicated `POST /api/profiles/service_details` endpoint + `ServiceDetailsForm.jsx` (mirrors
      `InvestmentDetailsForm.jsx`) shown only for `consultant`/`service_provider` roles + surfaced on
      the directory card as a small text line.
- [x] Shipped 2026-08-06 - **Availability** (`available_for_hire` - nullable boolean, `nil` means
      "never set" so no pill shows at all, distinct from an explicit `false`). Same endpoint/form as
      above; surfaced as a colored pill ("Open to new clients" / "Not taking clients") next to the
      promoted portfolio link.
- [ ] *(Lower priority, maybe founders too)* Years of experience / credentials.

### 4.3 The traction/team-composition gap (carried over from the earlier discovery audit)
Not service-provider-related, but the same "role needs its own fields" logic applies to
capital-side viewing founders: `kuzana_connect_discovery.md` §3 asks for *"traction, team
composition"* on founder profiles for investor evaluation - `InvestmentProfile` has neither field
today. Cheapest real fix from that earlier audit; listed here so it isn't tracked in two places.

- [x] Shipped 2026-08-06 - migration + `InvestmentProfile.traction`/`team_composition` (free text,
      same shape as `key_financials`, since neither reduces to a closed set) + both fields threaded
      through `InvestmentController` + two new textareas in `InvestmentDetailsForm.jsx`'s founder-side
      branch, right after Key financials. Deliberately **not** yet surfaced on the directory card
      (`MemberCard.jsx`) - same precedent as `key_financials`, which also stays form-only; the
      "structured stat row" treatment for this data is its own separate item further down this doc.

---

## 5. Broader professional/user-friendly ideas (2026-08-06 brainstorm)

Grouped by what each actually solves. None of these are committed - ranked by leverage at the end.

### Trust & credibility
- [ ] **Revive member verification.** `is_verified` is fully built (schema, Moderator+ admin action,
      neutral-checkmark UI) but zero members have ever been verified as of this writing - it's
      decoration, not a trust signal, until Kuzana staff actually start using it. *Not a code
      change* - a process ask for Kuzana.
- [ ] **"Profile updated" freshness indicator** - a quiet "Updated 3 weeks ago" line. Stale profiles
      undermine trust in a directory; a plain timestamp is a cheap, honest signal.
- [ ] **Surface real match outcomes, carefully.** The admin panel already records
      `confirmed_valuable` outcomes (`Admin panel.md` §7.1). A consented "2 successful introductions"
      line would be a stronger trust signal than any badge - but needs a real privacy decision (show
      a count only, or who?) before it's more than an idea. Flag for product discussion, not a
      straight build.

### Content & structure
- [x] Shipped 2026-08-06 - **One-line headline**. Decided to reuse the existing `bio` field (already
      on `User`, already editable via Profile, never actually shown anywhere before this) rather than
      add a second, competing "who are you" field - zero schema change. `Directory.to_member/3` now
      includes it; `MemberCard.jsx` renders it under the identity block, hard-truncated to one line
      (italic, to visually distinguish a self-written tagline from the AI-extracted offer text below
      it).
- [ ] **Structured stat row instead of prose**, once traction/team-size exist (§4.3) - "3 yrs ·
      8 employees · Ksh 2M/mo" scans faster than a paragraph on a card meant to be skimmed.
- [ ] **Deliberate empty-state copy per role** - what a founder's card looks like with no offer text
      yet is currently just... blank. Write a friendly, role-specific placeholder instead of letting
      it look broken or unfinished.

### Usability / guidance
- [x] Shipped 2026-08-06 - **"Preview as public."** New `Directory.preview_for_user/1` reuses the
      exact same `to_member/3` shaping the real Directory uses (so it can never quietly drift out of
      sync with what a card actually looks like) via `GET /api/profiles/me/preview_card`. New
      `CardPreviewModal.jsx` on Profile renders the real `MemberCard` component with that data - not a
      mockup - via a new `previewMode` prop that swaps the Connect button for a plain "This is your
      card" label. Directly generalizes the class of bug behind the earlier photo-preview incident
      (people couldn't verify what they were showing the world without this).
- [ ] **Profile-strength nudge tied to match quality, not vanity** - "Adding your looking-for tags
      improves match accuracy" instead of a generic "your profile is 80% complete" meter - ties the
      ask to a real outcome the member cares about.

### Role-specific onboarding polish
- [ ] Skip/reframe the business-photos prompt for investors (also listed in §4.1).
- [ ] **Branch the voice interview's opening question by role.** Every member currently gets asked
      the same "what are you building?" opener - genuinely awkward for an investor. Vapi's system
      prompt could ask about check size/thesis instead, based on the role picked in
      `ProfileSetup.jsx`.

### Tone/voice
- [ ] **Sweep profile-facing copy against Kuzana's own banned-word list**
      (`kuzana_playbook.md` §2 - no "empower," "impact," "innovation," "program," no acronyms).
      Already found one real hit while writing this doc: `ProfileView.jsx:140` labels the verified
      badge tooltip *"Approved into the Kuzana Bizi **program**"* - Kuzana's own brand guide lists
      "program" explicitly as a word to avoid. Small, but exactly the kind of detail that undercuts
      "professional" if a Kuzana staffer notices it before we do.

---

## 6. Recommended priority (highest leverage first)

Not a committed order - a starting recommendation for discussion:

1. **Preview-as-public** and **the headline field** - highest leverage per effort, visible on every
   single profile immediately, no dependency on anything else in this doc.
2. **§3 (visual distinctness)** and **§4.1 (hide irrelevant fields per role)** - no schema changes,
   already-scoped, directly addresses "make each profile look and feel different."
3. **§4.2 (service/advisory fields)** and **§4.3 (traction/team-composition)** - real new schema,
   highest value for capital-side evaluation and for finally giving service providers something of
   their own.
4. **Trust/credibility items** - mostly process asks for Kuzana (verification) or need a product
   decision first (surfacing outcomes), not pure engineering - sequence after the above, not before.

---

## 7. Explicitly not decided yet

- Whether "surface real outcomes" shows a count only or named details - privacy decision, not ours
  to make unilaterally.
- Whether years-of-experience/credentials (§4.2) extends to founders too, or stays
  service-provider-only.
- Exact copy for role-specific voice-interview openers (§5) - needs the same care
  `vapi_system_prompt.txt` already got, not a quick edit.
