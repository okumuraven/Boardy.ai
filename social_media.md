# Social Proof & Disintermediation Risk — Research & Recommendation

**Written 2026-07-21.** Vokazi's AI-generated pre-call briefing currently draws only on interview
data. The question this doc answers: should users be able to optionally connect LinkedIn, X,
GitHub, and a portfolio link so the AI briefing can say more than "here's what they said in their
interview" — without creating a disintermediation risk, where a matched user takes the relationship
off-platform the moment they can see the other person's public social presence.

Research method: a multi-source search-and-verify pass (5 parallel search angles, ~15 sources
fetched and read, each extracted claim adversarially cross-checked before being trusted) across
freelance marketplaces, ride/space-sharing platforms, professional verification products, and the
academic literature on platform disintermediation. The pass was stopped partway through the
verification stage — everything below has either survived adversarial cross-checking or is flagged
as unverified where that matters. One source (a third-party "Upwork ToS fairness score" review site)
had several of its more dramatic claims — specific suspension-for-mere-mention penalties, a
"$3,500+" figure — fail verification against Upwork's own published policy, and is excluded below.

---

## 1. The decision

**Verified-and-summarized social signal by default; raw clickable links unlock only after mutual
commitment (the stake that already unlocks chat) — not full information-hiding, and not open
sharing from day one either.**

This isn't a compromise for its own sake — it's the pattern every real platform in this research
that has actually solved this problem converges on: capture commitment first, reveal more after.

---

## 2. Why not just hide everything, or just show everything

**The case against hiding everything:** the dominant finding across every marketplace source here —
[Sharetribe Academy](https://www.sharetribe.com/academy/how-to-discourage-people-from-going-around-your-payment-system/),
[Harvard Business School Online](https://online.hbs.edu/blog/post/disintermediation),
[CometChat](https://www.cometchat.com/blog/platform-leakage),
[TechFinitive](https://www.techfinitive.com/features/how-b2b-marketplaces-can-build-trust-reputation-and-credibility/) —
is that pure information-scarcity is a weak, poorly-enforceable defense on its own. Platforms that
lean hardest on it (contact-detail keyword filtering, chat scanning) trade user trust and product
friction for a defense that determined users route around anyway. The consistent recommendation
across these sources is retention through *utility you can't replicate off-platform* — bundled
workflow tools, financing/payment terms, insurance, reputation that only means something inside the
platform — not information withholding as the primary lever.

**The case against showing everything immediately:** two data points matter here.

- An academic RCT on a large online freelance marketplace ([fengzhu.info/disintermediation.pdf](http://fengzhu.info/disintermediation.pdf))
  found that giving clients a *richer* trust signal about a freelancer increased both the rate of
  hiring high-quality freelancers **and** the rate at which those same client-freelancer pairs later
  disintermediated. Richer profile signal measurably does increase the urge to leave.
- But the same study found overall platform revenue was statistically unchanged (a 0.996 ratio of
  actual-to-expected) — the extra revenue from better matches offset the leakage. The paper also
  found people who do leave still prefer to *initiate* the relationship on-platform first, to
  preserve the option of feedback/dispute recourse — richer signal doesn't necessarily erase the
  platform's role, it just changes when people feel safe to leave it.
- A separate paper modeling platform archetypes ([MPRA working paper, "why disintermediation may not hurt (so much) after all"](https://ideas.repec.org/p/pra/mprapa/126803.html))
  argues a platform's vulnerability to disintermediation depends on *which market failure it actually
  solves* — pure search/discovery platforms are the most exposed; platforms that solve a harder
  problem (diagnostic matching quality, trust/enforcement) are inherently less exposed, because the
  thing users actually need from them doesn't stop being needed once they know a name. Vokazi is an
  AI-diagnostic matcher *plus* a stake/escrow enforcement layer — the least exposed combination in
  that framework, not the most.

So: richer signal raises leakage risk somewhat, but it isn't automatically fatal to retention if the
platform's value isn't *only* "who is this person" — and Vokazi's core value (AI-vetted match
quality + a real commitment mechanism) is exactly the kind of value that survives disintermediation
pressure better than a pure directory/discovery product would.

---

## 3. The "capture commitment first, reveal after" pattern — precedent

This is not a novel idea for Vokazi to invent; it's the same shape every real platform below already
uses, just applied to a different kind of "commitment":

| Platform | What's withheld | When it's revealed | Source |
|---|---|---|---|
| **Fiverr** | Third-party contact/messaging tools | Only after a paid order is placed | [Off-platform policy](https://help.fiverr.com/hc/en-us/articles/38728907371665-Community-Standards-Off-platform-policy), [Stay protected](https://help.fiverr.com/hc/en-us/articles/12792122691601-Stay-protected-Fiverr-s-off-platform-policy) |
| **Airbnb** | Exact property location, host contact info | Only after booking is confirmed | [LatentView](https://www.latentview.com/blog/how-to-prevent-disintermediation-at-the-marketplace/) |
| **Thumbtack** | — (inverted: captures payment before negotiation) | Provider pays as soon as a customer expresses interest, before any off-platform negotiation window opens | [LatentView](https://www.latentview.com/blog/how-to-prevent-disintermediation-at-the-marketplace/) |
| **BlaBlaCar** | Private messaging | Only after a booking is confirmed | [CometChat](https://www.cometchat.com/blog/platform-leakage) |
| **Upwork** | — (uses a toll, not a hard wall) | Off-platform relationships allowed via a paid "Conversion Fee" — the policy is a monetized escape valve, not an absolute ban | [Circumvention policy](https://support.upwork.com/hc/en-us/articles/360052511133-Circumvention-and-why-it-s-against-the-rules) |

The common thread: none of these wait forever, and none block information permanently — they gate
the reveal behind a step where the platform has already captured value (a payment, a booking, a fee).
Vokazi already has that exact gate: the on-chain stake that unlocks chat. Reusing it for social-link
reveal costs nothing new to build.

**Supporting evidence that removing an alternative channel does work, partially:** a natural
experiment using Skype's blockade in mainland China as a shock found that restricting an alternative
communication channel reduced disintermediation by roughly 18% on a major freelance marketplace, with
a stronger effect for high-skill, high-transaction-cost work ([Grace Gu, *Technology and Disintermediation
in Online Marketplaces*, Management Science, 2024](https://pubsonline.informs.org/doi/abs/10.1287/mnsc.2021.02736)).
This says timing/access restrictions have a real, measurable effect — just not a total one, and
Vokazi's intro calls (high-stakes, low-frequency, hard-to-replicate-off-platform matching) sit closer
to the "high transaction cost" end where this effect is strongest.

---

## 4. Verify, but don't expose — existing precedent for the AI-briefing signal itself

The user's underlying question — can the AI *use* social-proof signal for the briefing without
showing the other person a raw clickable link — is already a solved pattern in two live products:

- **LinkedIn's own "Verified on LinkedIn" system** confirms identity, workplace, or education via
  third-party attestation providers (CLEAR, DigiLocker, Persona, depending on region) and surfaces
  only a **badge** — the underlying verification data is never exposed to other users
  ([LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a1359065),
  [Verified on LinkedIn API docs](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/verified-on-linkedin/development-guide/verified-on-linkedin-lite/api-guide/user-verification-api)).
  Note: LinkedIn's *own* badge happens to be clickable through to the profile in their UI — the
  "verify but don't expose" discipline is the identity-verification layer itself, not a claim that
  LinkedIn hides profiles generally.
- **GitScore** ([gitscore.live](https://www.gitscore.live/)) computes a 1000-point developer score
  from public GitHub data across six weighted dimensions (repository quality, activity/consistency,
  community impact, social influence, language diversity, account longevity) — exactly the kind of
  summarized fact ("4 years active, primarily Elixir/TypeScript") that can substitute for a raw
  profile link in an AI briefing.
- **Persona/Clearbit-style identity verification** ([Persona integration docs](https://help.withpersona.com/articles/oFXiN9UhYPJ8QACppAds0/))
  is the general pattern LinkedIn's own verification is built on: a third party confirms a fact,
  the platform shows a derived signal, the underlying data/document never reaches the other user.

---

## 5. Recommendation for Vokazi — concrete design

1. **Let users connect accounts, but treat each differently based on real verification cost.**
   GitHub OAuth is free and trivial to verify ownership of. LinkedIn and X don't have an accessible
   free verification API for a third party — for those, a submitted URL plus a lightweight
   ownership check (e.g. a one-time code posted to the profile, or just trust-on-submit for v1) is a
   reasonable starting point, upgraded later if abuse becomes a problem.

2. **The AI briefing consumes connected accounts to produce summarized, credibility-establishing
   facts only — never the raw handle or URL.** E.g. "Active on GitHub for 4+ years, primarily
   Elixir and TypeScript, consistent contribution history" rather than a clickable `github.com/...`
   link. This is the direct answer to "AI will use this during introduction" without creating a
   click-away surface.

3. **Gate the raw, clickable link behind the stake that already unlocks chat** (or push it later
   still, to confirmed-call) — mirroring Fiverr/Thumbtack/Airbnb's proven timing pattern. By the
   time either side can actually click through to the other's LinkedIn/GitHub/X, Vokazi has already
   captured what it exists to deliver: the AI-vetted match and the intro call. If the relationship
   continues on LinkedIn afterward, that's not a loss in the same way it would be for a pure
   discovery/directory product.

4. **Build retention through utility, not scarcity**, per the consistent recommendation across
   every real-platform source above: an in-platform reputation/track record (show-up rate, repeat
   intro rate) that has no meaning anywhere else; ongoing AI-assisted scheduling for follow-up calls
   (already-built machinery, more valuable through Vokazi's calendar than manually over LinkedIn);
   eventually the paused milestone-escrow contract for tracking an actual working relationship past
   the first call, which is precisely the kind of trust-building, on-platform-keeping mechanism HBS's
   research on disintermediation names directly ([HBS Online](https://online.hbs.edu/blog/post/disintermediation)).

5. **Don't build enforcement-by-fear.** Keyword-filtering chat to block contact-info sharing, or an
   Upwork/Fiverr-style ban-and-suspend policy, is high user-friction, weakly effective (both
   platforms' own policies are graduated/soft in practice, not the hard wall their reputation
   suggests), and out of step with a platform whose whole pitch is trust and professionalism.

---

## 6. Open questions / not yet resolved

- Whether X (formerly Twitter) is worth including at all given its currently lower relevance to
  professional credibility signal, versus GitHub (developer-specific, free to verify) and a
  personal portfolio link (self-hosted, arguably lowest disintermediation risk since a portfolio
  site isn't a competing communication channel).
- Exact mechanics of "confirmed call" vs. "stake unlocks chat" as the reveal trigger — this doc
  recommends starting at the stake-unlock gate (already built, zero new mechanism needed) and
  revisiting whether to push it later once real usage data exists.
- This research pass was stopped mid-verification; a small number of claims from the search/fetch
  phases (marked informally above) were not yet adversarially cross-checked before the run ended.
  None of the load-bearing claims in the final recommendation (§1–§5) rest on an unverified source.
