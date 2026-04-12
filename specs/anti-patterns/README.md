# Anti-Patterns Registry

This directory holds heuristic proposals for detecting Code-First anti-patterns in skills and tools. Each file describes one heuristic: what it detects, the detection signal, false-positive guards, a good and a bad example, and the relationship to the invariants in [`../code-first-agents.md`](../code-first-agents.md).

## How to propose a heuristic

1. Copy [`_template.md`](./_template.md) to `specs/anti-patterns/<your-slug>.md`.
2. Fill in every section. Delete the ones that do not apply.
3. Open a PR against `main`.
4. The pattern owner reviews the proposal and sets the frontmatter `status:` field to `accepted`, `rejected`, `local-only`, or `revised`.

See [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) for the full review flow.

## Status

Each proposal has a `status:` field in its frontmatter. The index below groups proposals by that field.

### Proposed

Heuristics submitted and waiting for pattern-owner review.





### Accepted

- [ambiguous_threshold](./ambiguous_threshold.md), vague words like `complex` or `many` used near conditionals without numeric criteria. (retroactive)
- [high_divergence](./high_divergence.md), a section with many conditional paths and many substeps that should be extracted into a Level 3 tool. (retroactive)
- [instruction_bleeding](./instruction_bleeding.md), steps from one conditional branch contaminating another branch block.
- [missing_termination](./missing_termination.md), retry or loop language with no hard termination condition.
- [skipped_conditions](./skipped_conditions.md), a required decision point silently skipped instead of gated to a terminal outcome.
- [unconditional_spawn](./unconditional_spawn.md), agent spawning inside multi-path sections without a complexity gate. (retroactive)

### Rejected

- [scope_creep](./scope_creep.md), a tool modifying files outside its declared input scope. Rejected: requires runtime data and a spec change (`writes:` field) to work as a static check, and is already covered by Pattern 01 "Isolation".

### Local-only

Heuristics that stay useful in a specific codebase but do not belong in the abstract spec. Empty for now.

### Revised

Heuristics that were sent back for revision before a final decision. Empty for now.

## Out of scope

Two checks already exist in some scanners but are not proposed as heuristics here because they map directly to invariants in the main spec:

- **`prose_conditional`** (subjective "if" conditions), covered by Pattern 02 "No hidden logic".
- **`missing_instructions`** (tool output interpreted by the LLM instead of executed verbatim), covered by Pattern 02 "Verbatim execution at L3".

Do not re-propose these as standalone heuristics. If a scanner needs to flag them, it enforces the existing invariants.

## Severity categories

The `category:` frontmatter field defines the severity of the heuristic. Scanners use these levels to decide how to surface findings:

- **`error`**, the scanner should block or fail CI. The anti-pattern is a correctness or cost bug, not a style issue.
- **`warning`**, the scanner reports the finding but does not block. The anti-pattern hurts reliability but is not immediately dangerous.
- **`suggestion`**, the finding is optional. The anti-pattern is a missed opportunity, not a defect.

## Origin tags

The `origin:` frontmatter field distinguishes two kinds of proposals:

- **`retroactive`**, the heuristic already exists in scanner code and the proposal validates its shape against the spec. The file includes a "Reference implementation" section with exact regex and thresholds.
- **`new-proposal`**, the heuristic has no code yet. Implementation waits until the proposal is accepted.

Retroactive proposals exist to retire the gap between scanner code and the abstract spec. New proposals exist to gate scanner code behind pattern-owner review before any regex gets written.
