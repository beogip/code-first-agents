---
name:         skipped_conditions
status:       accepted
category:     warning
origin:       new-proposal
proposed_at:  2026-04-11
---

# Skipped Conditions

A skill states a conditional check but never gates the flow on a terminal outcome, so the LLM can legitimately ignore the check and continue.

## What it detects

Lines that introduce a decision with "if", "when", or "unless", followed by prose that describes what should happen, but with no downstream halt, no "else" branch, and no visible consequence when the condition is false. The LLM reading the skill sees "if X, do Y" and has three legitimate interpretations: do Y only when X is true, do Y always, or skip Y always. The skill does not pin the branch down, so the LLM picks one based on context.

## Detection signal

A bare `if` line (one that is not covered by the binary-gate allowlist from `ambiguous_threshold`) without any of the following within the same section:

- A corresponding `else`, `otherwise`, or `if not` clause that specifies the false-branch behavior.
- A `STOP`, `→ error`, `halt`, `fail`, or explicit "do not continue" instruction inside the `if` body.
- A named anchor the skill returns to ("skip to Step 5", "go to Phase 3") when the condition is false.
- A tool invocation whose output is the source of the condition, with the tool's documented fields named in the skill.

Put differently: the heuristic is the inverse of the `BINARY_GATE_PATTERNS` allowlist that `ambiguous_threshold` uses. Binary gates exempt clean halt logic. Skipped conditions fire when a skill introduces a check but fails to land it in the allowlist.

## False-positive guards

- Lines matching any binary-gate pattern are exempt. They already resolve to a terminal outcome.
- Lines inside fenced code blocks are skipped. A `if` in a code example is not a skill branch.
- A single-line section with one `if` that maps to the section heading (the section is itself the "when X" branch) is exempt. The condition is the entry guard for the whole section.
- Two `if` lines in a row that together cover all cases (`if X ... if not X ...`) are exempt. They form an implicit else.

## Example, BAD

```markdown
## Phase 2: validate

1. If the issue has acceptance criteria, read them.
2. Run the planner.
3. Write the plan.
```

The LLM has no signal telling it what to do when the issue has no acceptance criteria. Skip step 1 and run the planner? Fail? Ask the user? Three runs can pick three different answers. The condition is named but not gated.

## Example, GOOD

```markdown
## Phase 2: validate

1. Run `bun tools/parse-issue.ts --issue $N`. Read the `has_acceptance_criteria` field.
2. If `has_acceptance_criteria` is false, STOP and report `no_criteria` to the caller.
3. Read the acceptance criteria.
4. Run the planner.
5. Write the plan.
```

The check has a terminal outcome. The LLM does not have to guess what to do in the false case. The skill either halts or continues, and the choice lives in the file.

## Rationale

Skipped conditions are the shape of a skill that was half-written and never closed. The author meant to say "only do step 1 when this is true", but never wrote the false-case branch. The LLM fills the gap, and the gap is a probabilistic decision about a check the skill explicitly named. The fix is always the same: give the check a terminal outcome, either a halt, an explicit else, or a tool that eliminates the check.

## Relationship to existing invariants

Pattern 02 "No hidden logic" is the umbrella. Skipped conditions is a specific failure mode: the condition is visible, but the resolution is not. The invariant asks for every decision to be in the file. This heuristic asks for every conditional check to resolve to a branch that is also in the file.

Skipped conditions is also the inverse of the binary-gate allowlist used by `ambiguous_threshold`. Binary gates are the accept-list: the shapes that say "this is fine, the check has a terminal outcome". Skipped conditions fires when a check fails to match that allowlist and has no other resolution nearby. The two heuristics share the same allowlist from opposite sides.

## Design decisions

- The spec describes the shape of a terminal outcome (`halt`, `else`, `named anchor`, `skip to step N`) without pinning a specific allowlist. Each scanner builds its own allowlist of terminal patterns. This is consistent with how `ambiguous_threshold` handles its vague-word list.
- The spec names "section" (## heading boundaries) as the suggested unit of scope for finding the resolution of a conditional. A scanner may use a wider window, but a resolution that lives in a different section is like an `else` in a different function: it is a design smell even if the scanner does not flag it.
- When `skipped_conditions` and `ambiguous_threshold` both fire on the same line, the scanner emits both findings separately. The fixes are different: one asks for a numeric criterion, the other asks for a terminal outcome.
- The heuristic does not depend on any specific allowlist. It depends on the concept of a terminal outcome. This makes it spec-level, not implementation-defined.
