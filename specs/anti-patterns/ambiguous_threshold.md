---
name: ambiguous_threshold
status: proposed
category: warning
origin: retroactive
proposed_at: 2026-04-11
---

# Ambiguous Threshold

A skill uses a vague adjective near a conditional without giving the LLM a numeric rule to decide on.

## What it detects

Lines in a skill that combine a subjective word like "complex", "many", or "small" with a conditional keyword like "if", "when", or "depending", and do not include any numeric criterion or score. The LLM is left to decide what "complex" means on its own, and the same input can produce different branches on different runs.

## Detection signal

A line matches three conditions at once:

1. It contains a vague adjective.
2. It contains a conditional keyword.
3. It does not contain a number or a scoring reference.

The scanner also exempts lines that look like binary gates (stop conditions, typed comparisons) to avoid flagging clean halt logic as ambiguous.

## False-positive guards

- Lines with an explicit numeric comparison (`score >= 7`, `count < 3`) are exempt. They are already deterministic.
- Lines that reference a named score or threshold variable (`score`, `threshold`) are exempt. The deterministic work happens elsewhere.
- Lines matching the binary-gate allowlist (`STOP`, `if error`, `if validation fails`, variable comparisons like ``if `foo` is empty``) are exempt. They are halt conditions, not branch picks.

## Example, BAD

```markdown
## Phase 2: plan

1. Read the issue body.
2. If the issue is complex, spawn a research subagent.
   Otherwise, write the plan directly.
```

"Complex" is unbounded. Two runs on the same issue can pick different branches.

## Example, GOOD

```markdown
## Phase 2: plan

1. Run `bun tools/classify-issue.ts --issue $N`. Read the `complexity_score` field.
2. If `complexity_score >= 7`, spawn a research subagent.
3. Otherwise, write the plan directly.
```

The decision lives in the tool. The skill reads a number and branches on a threshold that is visible in the file.

## Rationale

Code-First is a question of placement. When a skill uses a vague adjective inside a branch condition, the decision is neither in code nor visible in the skill, it is inside the LLM's interpretation of one word. The same run produces different branches. We fix this by giving the skill a numeric signal to read, or by moving the branching into a Level 2 or Level 3 tool.

## Relationship to existing invariants

Pattern 02 "No hidden logic" requires every decision a skill makes to be visible in the file. Ambiguous thresholds violate this indirectly: the decision is visible in prose but not actionable without the LLM reinventing a rule. This heuristic narrows the invariant to one specific failure shape, the subjective adjective inside a branch condition.

## Reference implementation

This heuristic already exists in `branch-scanner.ts` at `tools/branch-scanner.ts` lines 211 to 242, in the function `checkAmbiguousThreshold`. The regexes are:

```ts
const vagueWords =
  /\b(?:complex|trivial|simple|large|small|many|few|significant|substantial|extensive|minimal|basic|advanced)\b/i;
const nearConditional =
  /\b(?:[Ii]f|[Ww]hen|[Uu]nless|[Cc]hoose|[Dd]ecide|[Dd]epending)\b/;
const hasNumeric = /\b\d+\b|[><=!]+\s*\d|\bscore\b|\bthreshold\b/i;
```

A finding is emitted when `vagueWords.test(line) && nearConditional.test(line) && !hasNumeric.test(line) && !isBinaryGate(line)`. The binary-gate allowlist lives in the same file at lines 123 to 143. The word list and the conditional list are scanner choices and belong to the reference implementation, not to the abstract description above.

## Open questions

- The vague-word list is hand-picked. Should the spec fix the list, or leave it to each scanner to tune?
- "Advanced" and "basic" can appear in legitimate contexts (a glossary, a user-facing label). The scanner relies on proximity to a conditional keyword to filter these out. The spec should note that proximity is load-bearing.
