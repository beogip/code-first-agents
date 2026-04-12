---
name:         your_heuristic_slug
status:       proposed
category:     warning
origin:       new-proposal
proposed_at:  2026-04-11
---

<!--
This file is the canonical template for heuristic proposals.

How to use it:
  1. Copy this file to specs/anti-patterns/<your-slug>.md
  2. Replace every placeholder, including the frontmatter fields above
  3. Delete the sections that do not apply (see the notes below each heading)
  4. Delete these top-level comments before opening your PR

Frontmatter fields:
  name         snake_case slug, matches the filename
  status       proposed | accepted | rejected | local-only | revised
  category     warning | suggestion | error
  origin       retroactive (already in some scanner code) | new-proposal
  proposed_at  YYYY-MM-DD the proposal was first written

Voice rules (from specs/code-first-agents.md, section "Voice rules"):
  - First-person plural ("we", "we have found") for claims and observations
  - Imperative or declarative for contracts and procedures
  - Short sentences, short paragraphs
  - No em dashes. Use commas, colons, or periods
  - No RFC 2119 language (no MUST, SHOULD, MAY)
  - No AI-slop vocabulary (no "leverage", "robust", "seamless", "remarkable", "unlock", "harness")
  - "Reasoning" is not how we describe what an LLM does. Use interprets, generates, executes, decides, produces
-->

# Heuristic Name

One sentence describing the anti-pattern in plain language.

## What it detects

<!--
Two or three sentences. What shape of skill does this heuristic flag?
Stay abstract. Concrete thresholds go in "Reference implementation", not here.
-->

## Detection signal

<!--
The concrete pattern a scanner looks for. One of:
  - A regex, quoted exactly if the heuristic is already implemented
  - A structural signal (headings, list shape, step count)
  - A prose pattern (sentence shape, keyword proximity)

If the heuristic is retroactive, quote the regex from the source file and cite
the file and line numbers.
-->

## False-positive guards

<!--
Bullet list. Each bullet names a case the scanner should exempt, and why.
Example: "Numeric conditions (`score >= 7`) are not flagged: they are already deterministic."
-->

- 

## Example, BAD

<!--
A realistic skill fragment that triggers the heuristic. Use a fenced code block.
Prefer examples taken from real skills over invented ones.
-->

```markdown
Paste the offending skill fragment here.
```

## Example, GOOD

<!--
The refactored version. Show how the anti-pattern is avoided.
Keep the example focused on one thing. Do not refactor unrelated parts.
-->

```markdown
Paste the refactored skill fragment here.
```

## Rationale

<!--
Why does this anti-pattern hurt? Which Code-First principle does it violate?
Two or three sentences.
-->

## Relationship to existing invariants

<!--
Name the Pattern 01 or Pattern 02 invariants this heuristic relates to.
Then state the distinction: what does this heuristic cover that the invariant does not?

This section is required for every proposal. Overlap between heuristics and
invariants is the most common reason a proposal gets rejected, so call it out
up front.
-->

## Reference implementation

<!--
Delete this section if origin is "new-proposal".

For retroactive heuristics, document the concrete thresholds and regex used in
the source scanner. Thresholds belong here, not in the abstract description
above (see the "separation rule" in specs/code-first-agents.md).

Cite file paths and line numbers. Quote the regex exactly.
-->

## Open questions

<!--
Optional. Use this section to flag things the pattern owner needs to decide.
Examples: unresolved overlap with an invariant, a new frontmatter field the
heuristic depends on, a threshold the author is not sure about.

Delete the section if there are no open questions.
-->

## Rejection rationale

<!--
Populated only when status is "rejected". The pattern owner writes the reason
here at review time. If status is not "rejected", delete this section.
-->
