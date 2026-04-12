---
name:         high_divergence
status:       proposed
category:     warning
origin:       retroactive
proposed_at:  2026-04-11
---

# High Divergence

A single section of a skill contains several conditional paths, each with several substeps, and the LLM is asked to pick the right path in prose.

## What it detects

Sections that have grown past the point where inline branching is safe. When a section holds several `if`, `else`, or `otherwise` blocks and each block carries several substeps, the skill is describing a procedure that depends on which branch the LLM takes. The procedure is long enough that drift between branches becomes likely, and the skill is the wrong place to hold it. At that point, the branching belongs in a tool that returns a Level 3 instructions field.

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

1. Look at the issue size.
2. If the issue is small:
   - Skip the research phase
   - Write a 3-step plan
   - Mark it as "lean"
3. Else if the issue is medium:
   - Run the context collector
   - Write a 5-step plan
   - Mark it as "standard"
4. Else if the issue is large:
   - Run the context collector
   - Run the architect agent
   - Write a 7-step plan
   - Mark it as "deep"
```

Three paths, several substeps each, and the LLM decides the size. The three branches share work (context collector, plan writing, labeling) and will drift.

## Example, GOOD

```markdown
## Phase 3: write the plan

1. Run `bun tools/plan-issue.ts --issue $N`.
2. Execute the `instructions` field verbatim.
```

The tool computes the size, picks the branch, and returns the literal procedure. The skill is three lines and does not branch.

## Rationale

Divergence is the point where the cost of keeping branches consistent in prose is higher than the cost of encoding them. Every edit to one branch has to be mirrored in the others, and the LLM is the one bridging the mirror. Tools hold branches without drift. At this size, the section should be a Level 3 tool call.

## Relationship to existing invariants

Pattern 02 "No hidden logic" requires every decision in a skill to be visible in the file. A divergent section is technically visible, the branches are right there, but the decision about which branch to take is not. This heuristic names the size at which visibility stops being enough, and the branching should move to a tool that returns instructions.

Pattern 02 also describes the three skill shapes (thick, branching, thin). High divergence is the signal that a branching skill has outgrown Level 2 and should drop to a thin shell consuming a Level 3 tool.

## Reference implementation

This heuristic already exists in `branch-scanner.ts` at `tools/branch-scanner.ts` lines 247 to 292, in the function `checkHighDivergence`. The path detector is:

```ts
if (/^\s*[-*]?\s*(?:\*\*)?(?:[Ii]f|[Ee]lse|[Oo]therwise)\b/.test(line)) {
  pathCount++;
  inPath = true;
}
```

The substep detector is:

```ts
if (inPath && /^\s{2,}[-*]|\d+\.\s/.test(line)) {
  substepCount++;
}
```

The finding fires when `pathCount >= 3 && substepCount >= 5`. These floors are scanner choices and belong to the reference implementation, not to the abstract description above. A section with 3 paths and 4 substeps passes, a section with 2 paths and 10 substeps passes. Both cases feed into the composite "high_branching_complexity" score at lines 411 to 445, which fires at a cumulative score of 7.

## Open questions

- The floors (3 paths, 5 substeps) are scanner choices. The spec names the shape of the signal, not the numbers. Does the spec stay silent on the numbers, or name a default pair that other scanners adopt?
- Composite scoring lets this heuristic combine with `ambiguous_threshold` and `unconditional_spawn` to produce a higher-severity finding. Should the spec describe the composite score, or treat it as a reference-implementation detail?
