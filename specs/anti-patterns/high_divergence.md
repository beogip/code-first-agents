---
name:         high_divergence
status:       accepted
category:     warning
origin:       retroactive
proposed_at:  2026-04-11
---

# High Divergence

A single section of a skill contains several conditional paths, each with several substeps, and the LLM is asked to pick the right path in prose.

## What it detects

Sections that have grown past the point where inline branching is safe. When a section holds several `if`, `else`, or `otherwise` blocks and each block carries several substeps, the skill is describing a procedure that depends on which branch the LLM takes. The procedure is long enough that drift between branches becomes likely, and the skill is the wrong place to hold it. At that point, the branching belongs in a tool that returns an `instructions` field.

## Detection signal

Two counts are taken inside a single section:

1. Path count, the number of lines that begin a conditional branch (`if`, `else`, `otherwise`), possibly preceded by list markers.
2. Substep count, the number of indented or numbered lines that belong to a path after it starts.

When both counts pass a scanner-defined floor, the section is flagged.

## False-positive guards

- Single-path sections are never flagged. One branch is not divergence.
- Very short branches (one or two substeps per path) are not flagged. The cost of extracting them into a tool is higher than the drift risk.
- Sections inside fenced code blocks are skipped at parse time. A `if` inside a code example is not a skill branch.
- Binary-gate patterns (`if error`, `STOP`, `if validation fails`) are not counted as paths. They are halt conditions, not branch picks.

## Example, BAD

```markdown
## Phase 3: write the plan

1. Read the issue labels.
2. If the label is `bug`:
   - Reproduce the error locally
   - Write a root-cause analysis
   - Propose a fix with a test plan
3. Else if the label is `feature`:
   - Run the context collector on related modules
   - Draft an interface contract
   - Write an implementation plan with dependencies
4. Else if the label is `refactor`:
   - Map all call sites of the target function
   - Score each call site for migration risk
   - Write a migration plan ordered by risk
```

Three paths with distinct procedures, and the LLM picks the path from a prose label. Each branch has several substeps that diverge completely. The section is large enough that keeping all three procedures in the skill invites drift; extracting the routing into a tool that returns instructions eliminates the branching.

## Example, GOOD

```markdown
## Phase 3: write the plan

1. Run `bun tools/plan-issue.ts --issue $N`.
2. Execute the `instructions` field verbatim.
```

The tool computes the size, picks the branch, and returns the literal procedure. The skill is three lines and does not branch.

## Rationale

Divergence is the point where the cost of keeping branches consistent in prose is higher than the cost of encoding them. Every edit to one branch has to be mirrored in the others, and the LLM is the one bridging the mirror. Tools hold branches without drift. At this size, the section should be a procedure tool call.

## Relationship to existing invariants

Pattern 02 "No hidden logic" requires every decision in a skill to be visible in the file. A divergent section is technically visible, the branches are right there, but the decision about which branch to take is not. This heuristic names the size at which visibility stops being enough, and the branching should move to a tool that returns instructions.

Pattern 02 also describes the three skill shapes (thick, branching, thin). High divergence is the signal that a branching skill has outgrown classification and should drop to a thin shell consuming a procedure tool.

## Reference implementation

One known implementation detects paths and substeps with two regex passes per section:

```ts
// Path detector: lines that start a conditional branch
/^\s*[-*]?\s*(?:\*\*)?(?:[Ii]f|[Ee]lse|[Oo]therwise)\b/

// Substep detector: indented or numbered lines inside a path
/^\s{2,}[-*]|\d+\.\s/
```

The finding fires when both counts pass a scanner-defined floor (one implementation uses 3 paths and 5 substeps). A section with few paths but many substeps, or many paths but few substeps, passes. The floors are scanner choices. Other implementations can pick different numbers based on the skills they audit.

Some scanners combine this heuristic with `ambiguous_threshold` and `unconditional_spawn` into a composite score that fires a higher-severity finding. Composite scoring is an implementation choice, not part of this heuristic's abstract definition.

## Design decisions

- The spec stays silent on numeric floors. Each scanner picks its own thresholds for path count and substep count. The reference implementation section gives one example pair as a starting point, not as a default.
- Composite scoring (combining this heuristic with others to produce a higher-severity finding) is an implementation detail. The spec does not define it.
