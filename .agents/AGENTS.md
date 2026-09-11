# Boardy.ai / Kuzana Connect - Project-Specific Rules

These supplement the global Antigravity Coding Manifesto (`/home/joseraven01/PROJECTS/AGENTS.md`) with rules specific to this repo. The 250-line file cap from the manifesto applies here too - the rules below exist because CSS specifically kept violating it (`index.css` grew to 1583 lines, `admin.css` to 470, before being split).

## CSS Architecture

**No monolithic global stylesheets.** Every component/view gets its own CSS file, co-located next to it, imported directly from that component:

```
components/CallOverlay.jsx
components/CallOverlay.css       <- import "./CallOverlay.css" in CallOverlay.jsx

features/matches/MatchesView.jsx
features/matches/Matches.css     <- import "./Matches.css" in MatchesView.jsx
```

- **One CSS file per component/feature-view**, named to match (`MatchesView.jsx` -> `Matches.css`, following the existing convention of dropping the `View`/`Panel`/`System` suffix when it reads better - match whatever's already used in that directory).
- **Only truly global, cross-feature content lives in shared files** (`src/index.css`, `src/styles/tokens.css`, `src/styles/primitives.css`): brand tokens/dark-mode variables, the reset, persistent app chrome (navbar, buttons/panels/chips/dots/spinners used everywhere), scrollbar styling. If a class is used by 2+ components in *different* features, it goes in `src/styles/` as its own small file (see `SharedFormFields.css`) or into `primitives.css` if it's a tiny shared atom - never bolted onto whichever component happened to define it first.
- **Before adding a new rule to an existing CSS file, check its line count.** If it's approaching 250, split before adding more - don't let it cross the line and clean up later.
- **Before splitting or moving CSS, grep for every class's actual consumers** (`grep -rln "class-name" src --include="*.jsx"`) rather than assuming from file layout - several classes in the original monolith weren't owned by the component their section header implied (e.g. `.stage-list`/`.stage-item`/`.stage-marker` looked match-review-specific but were actually shared with `InterviewProcessing.jsx` and two Bizi components).
- **Verify no class was dropped** after any CSS split: extract every class selector from the before/after state and diff the two sets - don't eyeball it.
- Mobile/responsive `@media` blocks split the same way as the base rules - a shared media query spanning many components' selectors gets broken apart so each selector's override lives in the same file as its base rule, not left as one giant cross-cutting block.
