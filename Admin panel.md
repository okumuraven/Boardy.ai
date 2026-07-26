# Kuzana Connect — Admin Panel Design

**Written 2026-07-26. Updated 2026-07-27** after cross-checking the original design against
`kuzana_playbook.md`, `kuzana_connect_discovery.md`, and the brand guidelines — this pass adds the
gaps that surfaced from that review (§7–§10 are new; §1, §5, §11, §12, §14 are edited). Design
discussion held directly with the product owner, covering how Kuzana staff will get customer-support/
administration access to Kuzana Connect, and — the core security requirement — how that access is
built so a normal community member can never reach it, no matter what they guess or try. This doc is
the reference for building it; nothing here is built yet (Phase 0, below, is the next actual
implementation step).

---

## 1. Why this exists, and what it's for

Kuzana staff need to do customer support and administration on Kuzana Connect - looking up a
confused member's account, verifying that someone applying to the community is legitimate, checking
on a stuck match, seeing aggregate health stats - without needing direct database access every time
someone has a support question. It is explicitly **not** a general analytics dashboard, a chat
moderation tool, or a bulk-export system - see the phased scope in §13, and the deliberate exclusions
in §12.

Per Kuzana's own stated operating philosophy (`kuzana_playbook.md` §8, §12): *"avoid overcomplicated
tooling too early - the bottleneck is operational consistency, not software sophistication."* This
panel should stay lean and directly justify itself against their current stack (Streak CRM + Gmail +
WhatsApp + Google Sheets), not be sophistication for its own sake.

**Explicit boundary**: this panel manages *Connect's own data* (members, matches, schedules, stats).
It is **not**, and is not currently planned to become, a replacement for Kuzana's separate accelerator
application/due-diligence pipeline (Felicity's screening-app → full-app → DD-visit → board-approval
workflow, `kuzana_playbook.md` §4) or their WhatsApp community moderation (`kuzana_playbook.md` §7,
still explicitly unowned per the CG Handover table). Both of those run on Kuzana's existing
Streak CRM/Sheets/WhatsApp stack and stay there. Revisit only if Kuzana explicitly asks to
consolidate — don't assume convergence.

---

## 2. Identity: reuse Google Sign-In, don't build a second auth system

Kuzana staff sign in through the **exact same Google Sign-In flow** members already use
(`Vokazi.Auth.GoogleSignIn.verify_id_token/1` → `Vokazi.Auth.Session.issue_token/1` → the frontend's
shared `apiFetch` helper sending `Authorization: Bearer <token>`). No second login page, no second
password, no second session mechanism to maintain or audit.

What makes someone "staff" instead of "a regular member who happens to have signed in" is a
permission flag on their existing `User` row (§3) - checked fresh from the database on every request
by a new plug (§4), never baked into the token itself.

### Optional extra layer: company domain verification

Kuzana staff have real `@kuzana.co` company email addresses (confirmed - Google Workspace domain).
Google's ID token includes an `hd` (hosted domain) claim, verified server-side by Google itself, that
proves an account genuinely belongs to that domain - not something a user can fake.

This check is **environment-gated, not hardcoded**, via `ADMIN_ALLOWED_DOMAIN`:
- **Unset (current hackathon/dev phase)**: no domain check at all. The developer can grant
  `admin_role` to their own personal Gmail account and test the whole panel freely. The real gate is
  always the `admin_role` check regardless.
- **Set to `kuzana.co` (once real staff are onboarded, post-hackathon)**: admin sign-in additionally
  requires the ID token's `hd` claim to equal `kuzana.co`. An account with a valid `admin_role` but
  signing in from a non-Kuzana Google account would be rejected at this layer, on top of the
  `admin_role` check.

Same code either way - just a config value that switches the extra layer on when it's actually
applicable.

---

## 3. Schema

Two concerns kept as **separate fields**, not one combined flag - so suspending someone preserves
their tier on record for easy reactivation, instead of having to remember and re-pick their role
later.

```elixir
# backend/priv/repo/migrations/20260726000000_add_admin_fields_to_users.exs
alter table(:users) do
  add :admin_role, :string          # nil | "superadmin" | "moderator" | "support"
  add :admin_status, :string         # nil | "active" | "suspended"
  add :is_verified, :boolean, default: false, null: false
end
```

- `admin_role` - **which tier**, if any. `nil` means "not staff at all" - the overwhelming majority
  of `users` rows, completely untouched by any of this.
- `admin_status` - **whether that tier is currently active**. Suspending someone sets this to
  `"suspended"` while `admin_role` stays as historical record (so reactivating them doesn't require
  re-deciding their tier).
- `is_verified` - the deferred "member verification/authenticity checks" feature from
  `kuzana_connect_discovery.md` §3 - a staff-granted badge on a *member's* account, distinct from all
  of the above (which is about staff/admin identity, not member trust signals). Staff-grantable only
  (Moderator+), never self-service, always audit-logged (§6).

  **Stage-shame guard**: `kuzana_connect_discovery.md` §7 names an explicit risk - an earlier-stage
  founder (Cate) felt "graded down" by status-flavored signals in the community. `is_verified` must
  render (if surfaced in the member-facing UI at all) as a neutral authenticity checkmark, never as a
  tier/badge/ranking alongside things like the reputation rank on `StatsCard.jsx`. Worth a design
  review before this ever ships client-side, not just an admin-side concern.

`Vokazi.Accounts.User`'s existing changesets (`google_signin_changeset/2`, `changeset/2`) **never**
cast any of these three fields - same convention already used to keep `google_sub` un-mutable through
the normal profile-edit path. There is no self-service way to become staff, verified, or unsuspend
yourself, ever, through the member-facing app.

### Match intelligence fields (new)

Three admin-only capabilities in §7 need columns on the *existing* `matches` table - kept separate
from the staking-removal history (`onchain_match_id` etc. were dropped entirely; these are new,
unrelated columns) and, like the fields above, never cast by any member-facing changeset:

```elixir
# backend/priv/repo/migrations/20260727000000_add_admin_fields_to_matches.exs
alter table(:matches) do
  # Manual match creation (§7.3) - nil means "created by the normal AI pipeline"
  add :created_by_admin_id, references(:users), null: true
  add :creation_note, :text

  # Verified-outcome tracking (§7.1) - the bounty's "5 verified introductions" evidence trail
  add :outcome_status, :string        # nil | "confirmed_valuable" | "attempted_no_result" | "unresponsive"
  add :outcome_notes, :text
  add :outcome_recorded_by_id, references(:users)
  add :outcome_recorded_at, :utc_datetime
end

create index(:matches, [:outcome_status])
create index(:matches, [:created_by_admin_id])
```

### Admin invites (staff onboarding without the member funnel)

Kuzana staff aren't community members - they shouldn't have to go through voice-interview onboarding,
profile setup, or matching to get admin access. A pending-invite table lets a Superadmin grant access
to an email address *before* that person has ever signed in:

```elixir
# backend/priv/repo/migrations/20260726000100_create_admin_invites.exs
create table(:admin_invites) do
  add :email, :string, null: false
  add :admin_role, :string, null: false
  add :invited_by_user_id, references(:users), null: false

  timestamps(updated_at: false)
end

create unique_index(:admin_invites, [:email])
```

At Google Sign-In time (`AuthController.google_signin/2`'s `find_or_create_user`), check whether the
signing-in email matches a pending invite. If so: create/update the `User` row with that `admin_role`
+ `admin_status: "active"`, consume (delete) the invite, and skip straight to the admin panel -
bypassing `ProfileSetup`/onboarding entirely, since this account was never meant to be a community
member in the first place.

### Audit log

Every admin *mutation* - verifying a member, inviting/suspending/re-tiering another admin, recording a
match outcome, manually creating a match - is logged atomically alongside the change itself, via the
same `Ecto.Multi` transaction: the data change cannot commit without its audit row, or vice versa.

```elixir
# backend/priv/repo/migrations/20260726000200_create_admin_audit_logs.exs
create table(:admin_audit_logs) do
  add :admin_user_id, references(:users, on_delete: :nilify_all), null: false
  add :action, :string, null: false        # "member.verify", "admin.invite", "admin.suspend",
                                            # "match.create", "match.record_outcome", ...
  add :target_type, :string, null: false   # "user" | "match" | "admin_invite"
  add :target_id, :integer
  add :reason, :text
  add :metadata, :map, default: %{}        # before/after values
  add :ip_address, :string

  timestamps(updated_at: false)
end

create index(:admin_audit_logs, [:admin_user_id])
create index(:admin_audit_logs, [:target_type, :target_id])
```

*Reads* (viewing a member's profile, browsing matches) are **not** written to this table - they go to
structured application logs instead (`AdminPlug` sets `Logger.metadata(admin_user_id: ...)`, each
admin controller read action logs a line). This keeps the audit table meaningful (real decisions, not
noise) while still leaving a trail if read-auditing is ever needed later.

**Exception, deliberately not a routine read**: revealing a member's phone number (see §5's Tier 4
rule) gets its *own* dedicated audit entry, every time, regardless of tier - because it's the one
piece of data Kuzana's own Playbook calls "never shared."

---

## 4. Server-side access control

```elixir
# backend/lib/vokazi_web/plugs/admin_plug.ex
defmodule VokaziWeb.AdminPlug do
  @moduledoc """
  Runs after AuthPlug. Loads the current user fresh from the database on
  every request and halts 403 unless they have an active admin_role right
  now - never trusts anything baked into the session token, so suspending
  someone takes effect on their very next request, not whenever their
  token happens to expire.
  """
  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]
  require Logger

  alias Vokazi.{Repo, Accounts.User}

  def init(opts), do: opts

  def call(conn, _opts) do
    case Repo.get(User, conn.assigns.current_user_id) do
      %User{admin_role: role, admin_status: "active"} = admin when not is_nil(role) ->
        Logger.metadata(admin_user_id: admin.id, admin_role: role)
        assign(conn, :current_admin, admin)

      _ ->
        conn |> put_status(403) |> json(%{error: "Forbidden"}) |> halt()
    end
  end
end
```

```elixir
# backend/lib/vokazi_web/router.ex
pipeline :admin_api do
  plug :accepts, ["json"]
  plug VokaziWeb.AuthPlug
  plug VokaziWeb.AdminPlug
end

scope "/api/admin", VokaziWeb.Admin do
  pipe_through :admin_api

  get "/whoami", MemberController, :whoami

  get "/members", MemberController, :index
  get "/members/:id", MemberController, :show
  post "/members/:id/reveal_phone", MemberController, :reveal_phone   # its own audit entry, every time
  patch "/members/:id/verify", MemberController, :set_verified         # Moderator+

  get "/matches", MatchController, :index               # now includes engagement/dormancy flags, §7.2
  get "/matches/:id", MatchController, :show
  post "/matches", MatchController, :create              # manual match creation, Moderator+, §7.3
  patch "/matches/:id/outcome", MatchController, :record_outcome   # Moderator+, audit-logged, §7.1
  get "/matches/decline_reasons", MatchController, :decline_reasons  # aggregate, Support+, §7.4

  get "/schedules", ScheduleController, :index            # §8
  get "/schedules/:id", ScheduleController, :show

  get "/stats", StatsController, :show                    # now includes capital-side slice, §9

  # Superadmin only - checked inside each action, not just by the pipeline
  get "/admins", AdminAccountController, :index
  post "/admins/invite", AdminAccountController, :invite
  patch "/admins/:id/role", AdminAccountController, :set_role
  patch "/admins/:id/suspend", AdminAccountController, :suspend
  patch "/admins/:id/reactivate", AdminAccountController, :reactivate
  get "/audit_logs", AdminAccountController, :audit_logs
end
```

`AdminPlug` establishes baseline "is this person staff at all" access. Tier-specific restrictions
(Moderator-only verify, Superadmin-only admin management) are checked **inside each controller
action** against `conn.assigns.current_admin.admin_role` - a Support account reaching
`PATCH /members/:id/verify` gets a clean 403 from that action specifically, not a router-level block,
so the permission logic for "who can do what" lives in one obvious place per action.

Controllers/contexts live in their own namespace, physically separate from member-facing code:
`backend/lib/vokazi_web/controllers/admin/*.ex` and `backend/lib/vokazi/admin/*.ex` (mirroring the
existing `Vokazi.Directory`/`Vokazi.Notifications` self-contained-module convention) - never reusing
a member-scoped controller action for an admin route.

---

## 5. Role tiers, mapped to Kuzana's own privacy framework and real staff

Kuzana already has a rigorous internal answer to "how sensitive is this data" -
`kuzana_playbook.md` §10's four privacy tiers. The admin roles are designed to honor that framework
directly, not invent a new one:

| Kuzana's tier | What it covers | Who inside Connect gets it |
|---|---|---|
| Tier 1 - open to everyone at Kuzana | Aggregate stats, general activity | **Support** |
| Tier 2/3 - founder-private / team evaluation | Full profiles, offer/need text, match details, verification | **Moderator** |
| Tier 4 - never shared, even internally | Phone numbers, personal contact info | **Nobody, by default - not even Superadmin** (§3's `reveal_phone` exception) |

**Support**
- View/search members (name, role, industry, company, location, onboarding status - no phone number)
- View matches (status, participants, AI score, engagement/dormancy flag - §7.2)
- View decline-reason aggregate stats (§7.4)
- View schedule status only - stuck/on-track, no briefing content (§8)
- View aggregate stats, including the capital-side (investor/lender) pipeline slice (§9)
- Cannot verify members, cannot record outcomes, cannot create matches, cannot change anything

**Moderator** (Felicity and Carol's real jobs, digitized)
- Everything Support has, plus:
- Full member detail (offer/need text, social profile, investment profile)
- **Verify a member** (`is_verified`, audit-logged) - this is literally Felicity's existing
  Applications workflow (screening incoming founders, initial viability calls,
  `kuzana_playbook.md` §1) done through the panel instead of by hand
- Full match detail, including AI reasoning/strengths/gaps - relevant to Carol's community/match
  moderation role
- **Manually create a match between two members** (§7.3) - the digitized version of Kyle's Strategy
  Board pairing (`kuzana_playbook.md` §6), usable by whoever on the team is doing that pairing work
  day to day, not restricted to Kyle personally
- **Record a match's real-world outcome** (§7.1) - confirmed-valuable / attempted-no-result /
  unresponsive - the direct evidence trail for the bounty's 5-verified-introductions requirement
- Full schedule detail, including briefing content and credential-error diagnostics (§8)
- Still cannot reveal a phone number without it generating its own audit entry, and cannot manage
  other admins

**Superadmin** (Kyle, as CEO - matches him already chairing the Strategy Board and making every
investment decision per `kuzana_playbook.md` §3)
- Everything Moderator has, plus:
- **Invite a new admin by email + assigned tier** (§6) - the person doesn't need to exist as a member
  first
- **Change an existing admin's tier** (promote/demote)
- **Suspend / reactivate an admin** - takes effect on that person's very next request
- **View the audit log**
- Can reveal a phone number too, but that action is *never* treated as routine - own dedicated audit
  entry every time, matching Kuzana's own "never shared" language for this category

**Bootstrap exception, unavoidable**: the *first* Superadmin (Kyle) still needs one manual command run
by whoever has deploy access - there's no admin yet to invite him from inside a panel he can't reach
yet:

```
mix admin.grant kyle@kuzana.co --role superadmin
```

Every admin *after* that first one is invited entirely through the panel itself (§6) - no further
deploy-level access ever needed for day-to-day staff management.

---

## 6. Admin account management (Superadmin-only capability)

- **Invite**: Superadmin submits an email + tier in the panel → creates an `admin_invites` row. Next
  time that email signs in with Google (first time ever, or an existing member account), they get
  that `admin_role` + `admin_status: "active"` set automatically, the invite is consumed, and they
  land straight in the admin panel - the member onboarding flow never runs for them.
- **Change tier**: Superadmin updates an existing admin's `admin_role` directly.
- **Suspend**: sets `admin_status: "suspended"`, `admin_role` stays untouched. Effective immediately -
  `AdminPlug` checks `admin_status == "active"` fresh from the database on every request, so a
  suspended person is locked out on their very next click, not whenever a session happens to expire.
- **Reactivate**: sets `admin_status` back to `"active"` - no need to re-pick their tier since it was
  never cleared.

All four actions are Superadmin-only (checked in the controller action itself, see §4) and
audit-logged via the same `Ecto.Multi` pattern as verifying a member.

---

## 7. Match intelligence: the bounty-evidence surface (new)

This section exists because of one hard fact: Stage 2 judging (`hackathon_context.md`) requires
**"evidence of at least 5 meaningful introductions generated and verified as useful by both
parties,"** plus **"documentation of the matching logic and how it improves with more data."** Neither
of those falls out of the original Members/Matches/Stats scope automatically - they need their own
deliberate surface, or the team ends up reconstructing this evidence by hand right before the
deadline instead of it accumulating naturally from normal admin use.

### 7.1 Outcome verification

A Moderator+ action on any `unlocked` match: `PATCH /api/admin/matches/:id/outcome` sets
`outcome_status` to one of `confirmed_valuable` / `attempted_no_result` / `unresponsive`, with a
free-text `outcome_notes` field for what actually happened (e.g. "both confirmed on a WhatsApp call
they're now doing business together" - the literal bar the bounty sets). Audit-logged like every other
mutation (§3).

**How staff would actually learn this** (not automated, at least at MVP): the same way Kuzana already
works - a follow-up call or WhatsApp message to both sides, the existing playbook pattern
(`kuzana_playbook.md` §6's "reminders" cadence), not a new member-facing survey. A lightweight
member-facing "did this introduction help?" prompt is a natural fast-follow once this admin-side field
exists to receive it, but that's a *member-app* feature and explicitly out of scope for this doc -
noted here only so it isn't lost.

The `GET /api/admin/matches` list should support filtering by `outcome_status`, so "show me every
confirmed-valuable match" is a one-click query - directly producing the Stage 2 evidence list.

### 7.2 Post-unlock engagement / dormancy signal

An `unlocked` match isn't the same thing as an *alive* one - chat can go dormant the moment it's
created. `GET /api/admin/matches` (and the `:show` detail) should include, computed from the existing
`chat_rooms`/`messages` tables (no schema change needed):
- `message_count`
- `last_message_at`
- a simple `dormant: true/false` flag (e.g. unlocked > 14 days ago, fewer than 2 messages exchanged)

This is what makes §7.1 practical - staff need a worklist of "unlocked matches nobody has followed up
on yet" to know who to call, not just a firehose of every match ever created.

### 7.3 Manual match creation

`POST /api/admin/matches` (Moderator+) creates a `pending_consent` match directly between two chosen
members, with a required `creation_note` (why - e.g. "manual Strategy Board pairing, AI didn't
surface a candidate for either side"). Sets `created_by_admin_id`, skips the AI-validation floor
entirely (this *is* the human judgment the AI floor exists to approximate when it fails), and then
proceeds through the normal mutual-consent flow exactly like an AI-generated match - both sides still
have to accept independently.

This is the direct digitization of what Kyle already does by hand in Strategy Board
(`kuzana_playbook.md` §6: "chair meetings... match Bizi + Strategy Advisors") and the necessary
fallback for anyone the AI pipeline queues with `{:queued}` and no qualifying candidate. `GET
/api/admin/matches` should support filtering by `created_by_admin_id: not null` so staff-created
matches are trackable as their own cohort (useful for both #7.1 evidence and honestly evaluating
whether manual pairing outperforms the AI floor over time).

### 7.4 Decline-reason analytics

`GET /api/admin/matches/decline_reasons` (Support+) - an aggregate count of `decline_reason` values
across all declined matches. `Matchmaking.respond_to_match/4` already captures this per-match
specifically "for tuning future matching" (per the existing code comment) but nothing currently
surfaces it in aggregate. This is the cheapest possible way to produce the bounty's other explicit
ask - "documentation of the matching logic and how it improves with more data" - since it's a
read-only rollup of data already being collected, not a new capture mechanism.

---

## 8. Scheduling & calendar admin visibility (new)

The Google Calendar intro-scheduling pipeline (`Vokazi.Scheduling` - per-intro OAuth or manual
availability, `SlotProposal`/`EventFinalizer` background tasks, encrypted token refresh) is one of the
most failure-prone parts of the whole system and currently has **zero admin visibility** - "why didn't
this Bizi ever get their calendar invite" is exactly the kind of question that becomes a support
ticket with no way to answer it today.

`GET /api/admin/schedules` (Support: status only; Moderator: full detail) lists `intro_schedules` with
a computed "stuck" heuristic - e.g. `selected_slot` set but no `google_event_id_a`/`_b` after some
threshold, or `status` unchanged for an extended period despite both sides having submitted
availability. Moderator-level detail additionally exposes calendar-credential health (token expired/
refresh failing) and the generated briefing content, since that's genuinely Tier 2/3 information (a
private, AI-generated summary about a specific member for a specific counterpart) under Kuzana's own
privacy framework - not something Support should see routinely.

No schema changes needed - this reads entirely from existing `intro_schedules` and
`calendar_credentials` fields.

---

## 9. Capital-side (investor/lender) pipeline stats (new)

`kuzana_connect_discovery.md` §4 calls a vetted deal-flow layer for investors/lenders "a bigger, more
scalable opportunity than membership fees alone" - explicit strategic language, not a minor detail.
`GET /api/admin/stats` (Support+) should include a named slice for this rather than burying it in
generic aggregate counts: founders currently seeking funding (broken out by funding type - equity /
loan / grant / working capital, per the Korir/Vula finding that these are genuinely different
segments), and how many are matched to an active Investor or Lender role. (Role values here assume the
taxonomy update discussed separately - Founder / Investor / Lender / Consultant-Advisor / Service
Provider - replacing the current founder/developer/designer/investor enum.)

No new capability beyond a specific `GROUP BY` in the existing stats query - called out here so it
doesn't get lost as "just more stats" when it's actually tracking Kuzana's own named strategic bet.

---

## 10. Deliberately still deferred, but now named explicitly (was implicit before)

- **Paid/premium-tier membership management.** Both the discovery report (Samuel Kagwe asked
  unprompted whether Connect would be free or paid) and the Playbook ("make premium group for WA")
  independently raised this. Not building it now - no schema, no admin surface - but naming it here so
  it's a deliberate "not yet" instead of a silent gap discovered later. Revisit alongside §12's other
  deferred items if/when Kuzana greenlights monetization work (currently paused per
  `kuzana_playbook.md`/`ROADMAP.md`'s 2026-07-18 guidance).

---

## 11. Frontend

The member-facing app has no URL routing today (`frontend/src/App.jsx` is entirely React
state-driven - no react-router, no distinct URLs per screen). Pulling in a full router library just
for one split would be overkill. Instead, branch at the very entry point, before the member `App`
tree is even instantiated:

```jsx
// frontend/src/main.jsx
import App from './App.jsx'
import AdminApp from './admin/AdminApp.jsx'

const isAdminRoute = window.location.pathname.startsWith('/admin')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      {isAdminRoute ? <AdminApp /> : <App />}
    </GoogleOAuthProvider>
  </StrictMode>,
)
```

Both trees share the same `GoogleOAuthProvider` (identical Google Sign-In client - staff and members
authenticate the same way) and the generic `frontend/src/lib/api.js` `apiFetch` helper, and nothing
else - no shared state, no shared member-app assumptions (profile/onboarding/matching).

```
frontend/src/admin/
  AdminApp.jsx              # Google sign-in -> GET /api/admin/whoami -> shell, or a plain "Not authorized" screen on 403
  index.js
  lib/adminApi.js           # thin wrapper over apiFetch, scoped to /api/admin/*
  shell/
    AdminShell.jsx           # nav between Members / Matches / Schedules / Stats / Admins (Admins tab only rendered for Superadmin)
  features/
    members/MembersListView.jsx
    members/MemberDetailView.jsx
    matches/MatchesListView.jsx        # filterable by outcome_status, dormant, created_by_admin_id (§7.2/7.3)
    matches/MatchDetailView.jsx        # outcome-recording UI + "create manual match" entry point (Moderator+)
    matches/DeclineReasonsView.jsx     # aggregate chart/table, §7.4
    schedules/SchedulesListView.jsx    # §8 - status-only for Support, full detail for Moderator+
    schedules/ScheduleDetailView.jsx
    stats/StatsView.jsx                # includes capital-side pipeline slice, §9
    admins/AdminAccountsView.jsx       # invite / role-change / suspend UI - Superadmin only, hidden entirely for other tiers
```

`AdminApp.jsx` hitting `/whoami` right after Google sign-in is the client-side *reflection* of the
server-side check, never itself the security boundary - `AdminPlug` is. A regular member navigating
to `/admin` directly sees a real Google sign-in prompt like anyone else, and then a plain "Not
authorized" screen the moment their `/whoami` call comes back 403 - they can never see so much as a
member's name.

---

## 12. Explicitly out of scope for now

- **Chat transcript access for support staff** - decided against for now. Admin scope stays to member
  profiles, matches, schedules, and aggregate stats; member chat privacy stays intact. Revisit only if
  a real support case demands it, as its own explicit product decision - not a default.
- **CSV / bulk export of member data** - a real bulk-PII operation that would need its own
  access-log/rate-limit treatment; not needed for the support/administration use case as scoped today.
- **IP allowlisting** - only worth it if staff work from a fixed office IP or VPN; causes real
  lockout pain otherwise. Not a default either way until that's confirmed.
- **Bespoke 2FA** - Google Sign-In already inherits whatever 2FA staff have on their own Google
  account; building a second one would be the exact "overcomplicated tooling" Kuzana's own Playbook
  warns against.
- **Tiers beyond three** - revisit only if the team genuinely grows past what Superadmin/Moderator/
  Support can express.
- **Paid/premium-tier membership management** - see §10. Named explicitly, not silently dropped.
- **Kuzana's separate accelerator application/DD pipeline, and WhatsApp community moderation** - see
  §1's boundary statement. Different systems, not planned to merge into this panel.

---

## 13. Additional hardening worth doing (cheap, real, not over-engineered)

- **Distinct token salt for admin sessions.** `Vokazi.Auth.Session` already wraps `Phoenix.Token`;
  add `issue_admin_token/1` / `verify_admin_token/1` using a different salt (`"admin_auth"`) and a
  shorter `max_age` (e.g. 8-12h, vs. the member app's 30 days). `AdminPlug` verifies against this
  salt specifically - a leaked/replayed *member* token can never even parse as an admin token,
  independent of the `admin_role` database check.
- **Rate limiting scoped narrowly to `/api/admin/*` mutations** - a small per-admin-user counter,
  mainly to blunt a compromised-credential scenario (bulk suspend/verify, or bulk manual match
  creation now that §7.3 exists). Not applied anywhere else.
- **Generic error responses** - no raw Ecto changeset, no stack trace, ever, in any admin controller -
  carries the app's existing zero-trust mandate into the new surface explicitly.
- **Pre-existing gap worth flagging separately (not admin-specific)**: `backend/lib/vokazi_web/
  endpoint.ex` currently has `plug CORSPlug, headers: ["*"]` - fully open CORS app-wide. Since auth is
  Bearer-token-based (not cookies), this isn't the primary token-theft vector, but tightening it to
  known frontend origins is basic hygiene worth its own follow-up pass, not scope-creeped into this
  build.

---

## 14. Phased build order

**Phase 0 - foundation.** Prove the security boundary before any real feature sits behind it.
- `admin_role`/`admin_status`/`is_verified` migration, `admin_invites` table, `admin_audit_logs` table
- `mix admin.grant` task (the one-time bootstrap path)
- `AdminPlug` + `:admin_api` pipeline + `GET /api/admin/whoami` only
- `frontend/src/admin/` skeleton: Google sign-in → `/whoami` → "authorized"/"forbidden"
- **Verify a non-admin account genuinely gets 403 end-to-end before writing a single real feature.**

**Phase 1 - read/support core, including the bounty-evidence surface** (reordered ahead of moderation
this pass, since §7.1/§7.4 directly serve the Aug 28 deadline and are low-risk reads/simple writes).
- `GET /api/admin/members` (search/paginate), `GET /api/admin/members/:id`, `GET /api/admin/matches`
  (with engagement/dormancy flags, §7.2), `GET /api/admin/matches/:id`, `GET /api/admin/stats`
  (including the capital-side slice, §9)
- `GET /api/admin/matches/decline_reasons` (§7.4)
- `PATCH /api/admin/matches/:id/outcome` (§7.1) - Moderator+, but built in this phase given its
  deadline-criticality; audit-logged from day one
- `GET /api/admin/schedules`, `GET /api/admin/schedules/:id` (§8) - status-only view first, full
  detail can follow in Phase 2 alongside other Moderator+ surfaces if time-constrained
- `MembersListView`, `MemberDetailView`, `MatchesListView` (with outcome/dormancy filters),
  `MatchDetailView` (with outcome-recording UI), `DeclineReasonsView`, `SchedulesListView`, `StatsView`
- Phone numbers masked by default everywhere in this phase; `reveal_phone` action deferred to
  whichever phase actually needs it, built with its own dedicated audit entry from day one.

**Phase 2 - moderation & admin account management** (the highest-risk surface - build only once
Phase 0's audit-log plumbing is proven).
- `PATCH /members/:id/verify` (Moderator+, audit-logged)
- `POST /api/admin/matches` manual match creation (§7.3) - Moderator+, audit-logged
- Full schedule detail (briefing content, credential diagnostics) for Moderator+, if not already
  included in Phase 1
- `admin_invites` flow end-to-end: invite → sign-in → auto-provisioned admin access
- Role change / suspend / reactivate (Superadmin only)
- `AdminAccountsView`, audit log viewer (Superadmin only)

**Phase 3 - later, not MVP, needs explicit sign-off when it comes up.**
- Anything from §12's exclusion list, if a real need surfaces.

---

*Companion docs: `kuzana_playbook.md` (§1 team structure, §6 Strategy Board/Bizi Buddy manual-matching
precedent, §10 privacy tiers - the direct source for this design's role mapping) and
`kuzana_connect_discovery.md` (§3 - the deferred member-verification feature this design finally gives
a home to; §4 - the capital-side deal-flow finding behind §9) and `hackathon_context.md` (the Stage 2
judging criteria behind §7's entire existence).*
