---
name:         unconditional_spawn
status:       accepted
category:     suggestion
origin:       retroactive
proposed_at:  2026-04-11
---

# Unconditional Spawn

A skill launches a subagent inside a branching section without gating the launch on a measured condition.

## What it detects

Sections that already carry several conditional paths and contain a line that spawns or launches an agent, without any nearby gate that ties the spawn to a threshold. The section branches, but the expensive subagent runs on every path. The LLM has no signal telling it when the cost is worth paying.

## Detection signal

Two passes inside a single section:

1. Count conditional paths (same shape as `high_divergence`, lines that begin with `if`, `else`, or `otherwise`).
2. If the path count passes a floor, scan for agent-spawn prose: verbs like `spawn`, `launch`, phrases like `agent in parallel`, explicit `Agent(` calls, dual-agent patterns like "Blue Team / Red Team".

For each spawn line, look at the lines immediately before it. If none of them contain a complexity gate (a numeric threshold against `score`, `complexity`, `level`, or phrases like `only if`, `only when`, `gated by`), a finding is emitted.

One finding per section is enough. The scanner stops after the first spawn line that fails the gate check.

## False-positive guards

- Sections with fewer than the path-count floor are not scanned. Spawning in a single-path section is fine, it is unconditional by design.
- Spawn lines preceded by a numeric comparison (`if score >= 7`, `if complexity > low`) are exempt. The gate is present.
- Spawn lines preceded by a phrase from the scanner's gate allowlist (`only if`, `only when`, `gated by`) are exempt.
- Lines inside fenced code blocks are skipped. A spawn call inside a code example is not a skill branch.

## Example, BAD

```markdown
## Phase 2: review

1. If the PR has tests, read the test diff.
2. If the PR has migrations, read the migration diff.
3. If the PR touches auth, read the auth diff.
4. Launch the Blue Team and Red Team reviewer agents in parallel.
5. Collate their findings.
```

Four paths, and the dual-agent review fires no matter which paths were taken. A one-file typo fix pays the same cost as a 30-file migration.

## Example, GOOD

```markdown
## Phase 2: review

1. Run `bun tools/diff-size.ts --pr $N`. Read `severity` and `file_count`.
2. If `severity == "high"` or `file_count >= 10`, launch the Blue Team and Red Team reviewer agents in parallel.
3. Otherwise, run a single-pass review with the default reviewer.
4. Collate the findings.
```

The spawn is gated on a measured threshold. Small PRs get a cheap review, large ones get the expensive review.

## Rationale

Spawning subagents is the most expensive thing a skill can do. When the cost is unconditional, the skill pays it on every run, and the cost is invisible to the LLM reading the skill. The Code-First pattern asks us to move the spend decision into code, or at minimum to make it visible in the skill as a gate a human can read and a tool can test. Gateless spawning is the cost analogue of `ambiguous_threshold`: a decision the LLM cannot make deterministically, hidden behind a line that looks like an instruction.

## Relationship to existing invariants

Pattern 01 "Isolation" says a tool runs without knowing which skill called it. This heuristic is about the inverse case: a skill launching a tool-shaped thing (a subagent) without the skill knowing whether the launch is justified. The invariant covers the tool side, this heuristic covers the skill side.

Pattern 02 "No hidden logic" is the closest overlap. Gateless spawning hides the cost decision. This heuristic names the specific shape (spawn verbs near multiple branches) that the invariant covers abstractly.

## Reference implementation

One known implementation detects spawn lines with these patterns:

```ts
/\b[Ss]pawn\b.*\bagent\b/
/\b[Ll]aunch\b.*\bagent\b/
/\bagent\b.*\bin\s+parallel\b/i
/\bAgent\s*\(/
/\bBlue\s*Team\b.*\bRed\s*Team\b/i
```

For each spawn line, the scanner checks the lines immediately before it for a complexity gate:

```ts
/\b(?:score|threshold|level|complexity)\s*[><=!]+\s*\d/i
/\b(?:only\s+if|only\s+when|gated\s+by)\b/i
```

The path floor, the lookback window size, and the specific word lists are scanner choices. Other implementations can adapt the vocabulary and the window to their domain. The spec describes the gate as "the nearest preceding condition that ties the spawn to a measured threshold", not a fixed line count.

## Design decisions

- The spec describes the form of the signal ("lines that spawn or launch a subagent") without fixing a vocabulary list. Each scanner picks its own spawn keywords. The reference implementation gives one English-only word list as an illustrative starting point.
- The spec describes the gate as "the nearest preceding condition that ties the spawn to a measured threshold", not a fixed line count. Each scanner picks its own lookback strategy. A fixed window is one valid approach; walking backward to the nearest conditional is another.
