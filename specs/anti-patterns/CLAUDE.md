# Anti-Patterns Registry — Working Instructions

This directory holds heuristic proposals. Every file except `_template.md`, `README.md`, and this file is a proposal.

## Accepting, rejecting, or revising a heuristic

When the pattern owner decides on a proposal:

1. Update the `status:` field in the proposal's frontmatter to `accepted`, `rejected`, `local-only`, or `revised`.
2. If `status: rejected`, add a "Rejection rationale" section at the bottom of the file with the reason.
3. If the proposal had "Open questions", replace the section with "Design decisions" containing the resolved answers. Delete questions that are no longer relevant.
4. Move the entry in `README.md` from its current status group to the new one. Keep the one-line format: `- [slug](./slug.md), hook sentence.`
5. Never delete a proposal file. Rejected and local-only proposals stay in the directory as a record.

## Creating a new proposal

1. Copy `_template.md` to `<slug>.md`. The slug is `snake_case` and matches the filename.
2. Fill in every section. Delete sections that do not apply (guidance is in HTML comments inside the template).
3. Add an entry under "Proposed" in `README.md`.
4. Set `status: proposed` in frontmatter.

## Voice rules

All text in this directory follows the voice rules from `../code-first-agents.md`:

- First-person plural ("we", "we have found") for observations
- Imperative or declarative for contracts
- Short sentences, short paragraphs
- No em dashes (U+2014). Use commas, colons, or periods
- No RFC 2119 (`MUST`, `SHOULD`, `MAY`)
- No AI-slop vocabulary (`leverage`, `robust`, `seamless`, `remarkable`, `unlock`, `harness`)
- "Reasoning" is not how we describe what an LLM does. Use: interprets, generates, executes, decides, produces

## Separation rule

The abstract description of a heuristic (sections "What it detects", "Detection signal", "False-positive guards") stays free of numeric thresholds, specific regex, and implementation labels. Those belong in the "Reference implementation" section, which only exists for retroactive heuristics (`origin: retroactive`).

If a reviewer asks "would this paragraph be false if I swapped the example domain?", the paragraph describes the implementation, not the heuristic. Move it to "Reference implementation".

## Section order

All proposal files share this H2 order (enforced by `_template.md`):

1. What it detects
2. Detection signal
3. False-positive guards
4. Example, BAD
5. Example, GOOD
6. Rationale
7. Relationship to existing invariants
8. Reference implementation *(only when `origin: retroactive`)*
9. Design decisions *(resolved open questions)* or Open questions *(unresolved)*
10. Rejection rationale *(only when `status: rejected`)*

Do not reorder or rename these headings. Structural consistency across files is a requirement.

## README.md is the index

`README.md` groups proposals by status. It is the single place a reader goes to see what is proposed, accepted, rejected, local-only, or revised. Every frontmatter `status:` change in a proposal file requires a matching move in `README.md`. The two must stay in sync.
