---
name:         missing_termination
status:       accepted
category:     error
origin:       new-proposal
proposed_at:  2026-04-11
---

# Missing Termination

A skill describes a retry or a loop without naming a hard stop, so the LLM is free to keep going forever.

## What it detects

Phrases like "retry", "loop back to step N", "repeat", "try again", or "iterate" that are not paired with a bounded stop condition. A bounded stop is a numeric maximum ("max 3 rounds", "up to 5 attempts"), a counter variable that the skill updates and reads, or a call to a tool that owns the termination logic. Without one of these, the loop is open-ended and the only reason it terminates in practice is that the LLM runs out of context or picks a reasonable number to stop at. Both of those are non-deterministic terminators.

## Detection signal

A line containing any of `retry`, `loop`, `repeat`, `again`, `iterate`, followed in the same section by a step-number reference, a "step N" anchor, or an imperative that implies returning to an earlier phase. The scanner then checks, inside the same section, for any of:

- A numeric bound (`max N`, `up to N`, `N times`, `N attempts`, `N rounds`).
- A named counter variable with a comparison (`attempts >= max_attempts`, `round < max_rounds`).
- A tool invocation documented to return a termination field (`should_retry: false`, `continue: false`, `done: true`).

If none of these appear, a finding is emitted.

## False-positive guards

- Retries inside a fenced code block are skipped. Code examples are not skill loops.
- The phrase "no retry" is exempt. It is an explicit statement that the skill does not loop.
- A single-pass "try again with a different input" that is not a loop (one extra run) is exempt. The scanner counts only language that implies returning to an earlier step.
- Retries governed by an external queue or caller (the skill says "the caller decides when to retry") are exempt. Termination lives outside the skill.

## Example, BAD

```markdown
## Phase 4: fix errors

1. Run the test suite.
2. If any test fails, fix the failing test.
3. Loop back to step 1 until all tests pass.
```

"Until all tests pass" is not a bound. A test that fails on a nondeterministic cause (a flaky test, a bug the LLM cannot fix) runs this loop forever. The skill has no escape hatch and no cost ceiling.

## Example, GOOD

```markdown
## Phase 4: fix errors

1. Run `bun tools/loop-guard.ts init --max-rounds 2`.
2. Run the test suite.
3. If any test fails, fix the failing test and run `bun tools/loop-guard.ts advance`. Read the `should_continue` field.
4. If `should_continue` is true, loop back to step 2. Otherwise, STOP and report `loop_exhausted`.
```

The tool owns the counter and the maximum. The skill reads a boolean and loops only while the tool says to. The maximum is visible in the file.

## Rationale

Termination is the cost ceiling. A loop without a ceiling is a skill that can spend an unbounded amount of tokens and time on one call. The Code-First pattern is a cost-discipline pattern: moving decisions into code makes runs cheaper, faster, and reproducible. A missing termination condition undoes all three at once. Runs become more expensive (the loop runs longer), slower (the loop runs longer), and less reproducible (the stopping point depends on whatever the LLM decides counts as "enough").

## Relationship to existing invariants

Pattern 02 "No hidden state" says a skill that depends on memory between runs is a different pattern, and skills run from their first phase every time. Missing termination overlaps with this invariant but does not coincide with it. "No hidden state" is about state *between* runs. Missing termination is about bounds *inside* one run. A skill can satisfy "No hidden state" (every run starts fresh) and still fail this heuristic (the loop inside one run has no cap). The two invariants are in different axes.

Pattern 02 "Verbatim execution" is also relevant. A thin skill that consumes a tool which owns the termination counter is the canonical shape for a bounded loop: the tool tells the skill whether to continue, and the skill follows verbatim. This heuristic is the forcing function for that shape whenever a skill has any loop language.

## Design decisions

- The spec describes the shape of a termination condition (a numeric ceiling visible in the file or owned by a tool) without pinning vocabulary. "Max rounds", "attempts", "iterations", "budget" are all valid names. Each scanner picks its own keyword list.
- When `missing_termination` and `unconditional_spawn` both fire on the same section, the scanner emits both findings separately. Unconditional spawn is about a single expensive action without a gate. Missing termination is about a repeated action without a cap. The fixes are different.
- The category is `error`. The spec defines categories as severity levels: `error` means the scanner should block or fail CI, `warning` means the scanner reports but does not block, `suggestion` means the finding is optional. An unbounded loop is a cost bug, not a stylistic issue.
