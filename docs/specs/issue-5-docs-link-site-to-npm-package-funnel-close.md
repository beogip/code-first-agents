---
issue_number: 5
issue_title: "docs: link site to npm package (funnel close)"
repo: "beogip/code-first-agents"
labels: [documentation, marketing, P1, pre-launch]
plan_level: "standard"
depth: "medium"
branch_name: "feat/5-link-site-to-npm-package"
created_at: "2026-06-22T16:43:40Z"
---

# Implementation Plan: #5 — docs: link site to npm package (funnel close)

## Files

| File | Change |
|---|---|
| `index.html` | Add install block at the end of the Spectrum section (`#spectrum`), right after the prompt-factory prose (~line 533). |
| `patterns/deterministic-tools.html` | Add install block at the top of the page content. |
| `assets/style.css` | Only if `.code-block` + `.hero__cta` don't suffice for the install-block layout. |
| `index.html`, `patterns/deterministic-tools.html`, `patterns/skill-orchestration.html` | Bump `?v=7`→`?v=8` **only if** `assets/style.css` changes (CLAUDE.md cache-busting rule). |
| `assets/website-copy.md` | Mirror the new copy (README declares it the source-of-truth for page copy). |

## Codebase Context

**Modules / components to reuse:**
- `.code-block` (`assets/style.css:857-877`) — dark code/command block; reuse for the visible `bun add ...` command.
- `.hero__cta` (`assets/style.css:246-268`) — primary CTA button style; reuse for the npm button.
- `.section` / `.prose` — existing wrappers inside `#spectrum`.

**Patterns to respect:**
- The Spectrum section (`index.html:419-534`) explains the L1/L2/L3 tool spectrum and closes (lines 521-533) with prose about the tool becoming a "prompt factory" where "All branching logic lives in code you can test and debug." The install block is inserted immediately after this prose, as the natural conceptual hand-off.
- Existing external links all point to `https://github.com/beogip/code-first-agents` (e.g. `index.html:276`, `:608`, `:629`). Copy their `target`/`rel` attributes for the new npm anchors.
- Recent commits fixed mobile grid blowouts — new blocks must hold up at mobile width.

**The package** (`@code-first-agents/tool`, v0.1.5, verbatim npm description):
> "A code-first-agents framework for building deterministic CLI tools that LLM agents can discover, validate, and invoke with zero guesswork. Powered by Zod schemas and structured output contracts."

It is a TypeScript **framework** (inversion-of-control: `tool.run(argv)` owns parsing/validation/dispatch/JSON-envelope/exit semantics; you supply handlers) for building the exact L1/L2/L3 deterministic tools the Spectrum describes. It serves the deterministic-tools pattern specifically — not the whole code-first thesis — which is why the install moment lives in the deterministic-tools context, not the hero or closing.

## Steps

1. **`index.html` — Spectrum block:** insert an install block after the prompt-factory prose (~line 533, inside `#spectrum`), reusing `.code-block` for the command and a `.hero__cta`-style anchor to npm. **Done when:** AC-1 passes.
2. **`patterns/deterministic-tools.html` — top block:** insert an install block at the top of the page content. **Done when:** AC-2 passes.
3. **`assets/style.css` (conditional):** add minimal install-block styling only if `.code-block` + `.hero__cta` reuse is insufficient. **Done when:** block renders cleanly on desktop and mobile.
4. **Cache-bust (conditional):** if `assets/style.css` changed, bump `?v=7`→`?v=8` in `index.html`, `patterns/deterministic-tools.html`, `patterns/skill-orchestration.html`. **Done when:** AC-6 passes (or N/A if no CSS change).
5. **`assets/website-copy.md`:** mirror the new on-page copy. **Done when:** file matches the on-page text.
6. **Verify:** open both pages locally, desktop + mobile; confirm block position, visible command, and that the link href is exactly the npm URL. **Done when:** all ACs pass.

## Interfaces

No code interfaces (static HTML/CSS). New markup contract for an install block:
- a `.code-block` containing `bun add @code-first-agents/tool`
- an anchor (`.hero__cta` style) with text **Get it on npm** → `https://www.npmjs.com/package/@code-first-agents/tool`
- a one-line framing sentence above it (locked copy per spot).

## Function Design

N/A — static site, no functions.

## Acceptance Criteria (EARS)

- **AC-1:** The home page (`index.html`) SHALL display an install block at the end of the Spectrum section, after the prompt-factory prose, containing the line *"There's a framework for building exactly this. Add it in one line."*, the command `bun add @code-first-agents/tool` in a `.code-block`, and a **Get it on npm** button.
- **AC-2:** The deterministic-tools pattern page SHALL display an install block at the top of its content, containing the line *"The framework for building deterministic tools, packaged."*, the command `bun add @code-first-agents/tool`, and a **Get it on npm** button.
- **AC-3:** Each install command SHALL be rendered via the site's existing `.code-block` styling.
- **AC-4:** Every npm link added SHALL point to exactly `https://www.npmjs.com/package/@code-first-agents/tool`.
- **AC-5:** WHEN a user activates an npm link, the system SHALL open the npm package page using the same `target`/`rel` convention as the site's existing GitHub links.
- **AC-6:** IF `assets/style.css` is modified, THEN the `?v=N` query string SHALL be bumped (7→8) in `index.html`, `patterns/deterministic-tools.html`, and `patterns/skill-orchestration.html`.

## Out of Scope

- Hero and closing-section install CTAs (the tool serves the deterministic-tools pattern, not the whole thesis; a top-level install would overpromise).
- Linking to the `code-first-agents-tool` repo (narrowed to npm only).
- An install block on `patterns/skill-orchestration.html` (it receives the cache-bump only, and only if CSS changes).
- Publishing or verifying that the npm package is live.

## Edge Cases + Error Handling

| # | Scenario | Source | Handling |
|---|---|---|---|
| 1 | npm package version moves past 0.1.5 | [inferred] | Link targets the package page (version-agnostic), not a pinned version |
| 2 | Install block breaks grid/layout on mobile | [inferred] | Reuse responsive classes; test at mobile width (recent commits hit this) |
| 3 | External-link attributes inconsistent with rest of site | [inferred] | Copy `target`/`rel` from existing GitHub anchors |
| 4 | CSS changed but cache not busted → stale styles served | [from CLAUDE.md] | Apply AC-6 bump |
| 5 | Copy drift between HTML and `website-copy.md` | [inferred] | Step 5 mirrors copy into the source-of-truth |

## Done Criteria per Feature

| Feature | Must pass |
|---|---|
| Home funnel (Spectrum block) | AC-1, AC-3, AC-4, AC-5 |
| Pattern-page funnel | AC-2, AC-3, AC-4, AC-5 |
| Style/cache integrity | AC-6 |

## Risks

- Reused styles (`.code-block` + `.hero__cta`) may not fit the install block cleanly → may require minimal new CSS, which then triggers the cache-bump (AC-6).
- Copy drift between the HTML and `assets/website-copy.md` → mitigated by step 5.

## Test Strategy

Manual verification (static site, no test runner): open both pages locally, confirm block position (after the prompt-factory prose on the home page; top of the deterministic-tools page), visible command text, and that the link `href` is exactly `https://www.npmjs.com/package/@code-first-agents/tool`; check desktop and mobile widths; visually confirm reused styling.
