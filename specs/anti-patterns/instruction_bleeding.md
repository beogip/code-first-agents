---
name:         instruction_bleeding
status:       proposed
category:     warning
origin:       new-proposal
proposed_at:  2026-04-11
---

# Instruction Bleeding

Steps from one conditional branch appear inside another branch block, so both branches execute work neither of them owns.

## What it detects

A skill section with several branch blocks where the instructions for one branch include numbered references, substeps, or imperative lines that belong to a different branch. The LLM reading the file cannot tell which branch actually owns which step. Running the "lean" branch pulls in work from the "full" branch, or vice versa. The contamination is usually the result of a past edit where a step was added to one branch and never removed from the other.

## Detection signal

Inside a section with two or more branch blocks:

- A branch block contains a line that refers to a step number ("step 4", "item 2") which only exists in a sibling branch.
- A branch block contains a known imperative line that already appears, verbatim or near-verbatim, inside a sibling branch.
- A branch block repeats a substep heading that appears in a sibling branch with a different set of follow-on steps.

All three are structural signals. The scanner pattern-matches against shared substrings across sibling branch blocks in the same section.

## False-positive guards

- Shared setup work placed before the first branch is not bleeding. Common prefix belongs to the section, not to any branch.
- Explicit cross-references ("same as the full branch, step 4") are not bleeding. The duplication is intentional and documented.
- Short one-line branches that share a verb are not bleeding. Repetition is not contamination.
- Branches separated by a clear halt or handoff ("STOP. End of branch.") are not bleeding. The second branch is a separate procedure.

## Example, BAD

```markdown
## Phase 2: execute the plan

- If the plan is **lean**:
  1. Run the build
  2. Run the unit tests
  3. Write the PR body
- If the plan is **full**:
  1. Run the build
  2. Run the unit tests
  3. Run the integration tests
  4. Run the architect review
  5. Write the PR body
```

"Run the build" and "Run the unit tests" belong to both branches. A past edit probably added the architect review to the full branch and forgot to cut the shared setup out. The LLM cannot tell whether the lean branch is supposed to pick items 1 and 2 from the full branch or the duplicated items 1 and 2 from its own block. The two copies can drift.

## Example, GOOD

```markdown
## Phase 2: execute the plan

1. Run the build.
2. Run the unit tests.
3. Run `bun tools/plan-mode.ts --plan $PLAN`. Read the `mode` field.
4. If `mode == "full"`, run the integration tests and the architect review.
5. Write the PR body.
```

Shared setup lives before the branch. The branch only holds the work that actually differs. No duplication, no drift.

## Rationale

Instruction bleeding is the shape of a skill that is one edit away from being wrong. The moment someone changes "Run the unit tests" in one branch and not the other, the two branches describe different procedures. The LLM reading the file has no way to decide which copy is authoritative. Fixing this by hoisting shared setup out of the branches removes the drift surface. When the shared prefix is large enough that hoisting feels awkward, the branches are probably a Level 3 tool.

## Relationship to existing invariants

Pattern 02 "No hidden logic" asks that every decision be visible in the skill. Instruction bleeding violates this in a specific way: the decision about which copy of the duplicated steps is authoritative is hidden by the duplication itself. The invariant says "make decisions visible". This heuristic says "if two branches share steps, the sharing has to be explicit, either by hoisting the common prefix or by cross-referencing with a named anchor".

This heuristic is also the branch-level cousin of `high_divergence`. Divergence is about size (too many paths, too many substeps). Bleeding is about overlap (branches that share text they should not share).

## Open questions

- Detection is expensive. Comparing every pair of branch blocks in a section for shared lines is `O(n^2)` in the number of branches. Most sections have two or three branches, so the cost is small in practice, but the spec should note the cost.
- The "same as the full branch, step 4" false-positive guard is a natural-language check. Scanners will implement it with a regex and will miss some phrasings. The spec should describe the intent (explicit cross-reference) rather than pinning a specific phrase.
- Overlap with `skipped_conditions`: a branch that bleeds into another can look like a branch that forgot its own steps. The two heuristics should emit separate findings when they both fire, so the scanner output is not ambiguous.
