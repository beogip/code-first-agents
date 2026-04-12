---
name:         scope_creep
status:       proposed
category:     suggestion
origin:       new-proposal
proposed_at:  2026-04-11
---

# Scope Creep

A tool writes to files outside the scope it declared in its inputs, so the aggregate effect of one skill run touches parts of the codebase the caller did not authorize.

## What it detects

A tool that takes a path or a set of paths as input, then writes to files or directories that are not reachable from those inputs. The tool's own documentation says it operates on X, but in practice it also modifies Y. A skill that calls this tool is authorizing work on X and getting work on X and Y. The extra work is invisible to the skill and to the pattern owner reviewing the tool's output.

This is not about a tool doing more than one thing. Tools are allowed to do several things, as long as the caller can name what they are. It is about drift between a tool's declared inputs and its actual writes.

## Detection signal

Two signals, either of which fires the heuristic:

1. **Static signal.** The tool's frontmatter declares a `writes:` field (a proposed new field), and the tool writes to paths outside that field during a run. Scanners compare the frontmatter against the actual writes captured from a test run.
2. **Prose signal.** The skill or the tool description contains a phrase like `modif(y|ies) .* (other|unrelated|additional) files`, `also updates`, `touches .* as a side effect`, or similar language that admits an out-of-scope write without gating it.

The static signal is preferred. The prose signal is a fallback for tools that have not adopted the `writes:` field yet.

## False-positive guards

- Writes to temporary directories (`$TMPDIR`, `/tmp`, project-local `.cache/`, `.tmp/`) are exempt. They are not part of the codebase's scope.
- Writes to the tool's own log file are exempt when the log path is declared in frontmatter.
- Writes to files explicitly passed in a `--extra-writes` flag or equivalent are exempt. The caller has authorized the extra work.
- Tools that run only in dry-run or read-only mode by default (and require an explicit `--apply` flag to write) are exempt when called without `--apply`.

## Example, BAD

```markdown
## Phase 3: refactor

1. Run `bun tools/rename-export.ts --file src/auth.ts --from OldName --to NewName`.
```

The tool's name says it renames one export in one file. In practice, the tool also writes to `src/auth.test.ts`, `docs/auth.md`, and `package.json` because it follows all references across the codebase. The skill authorized a rename in `src/auth.ts`. The reviewer of the skill cannot see the other writes at all.

## Example, GOOD

```markdown
## Phase 3: refactor

1. Run `bun tools/rename-export.ts --file src/auth.ts --from OldName --to NewName --write-scope "src/**/*.ts,docs/**/*.md"`.
2. Read the `files_written` field from the output. Confirm every path is inside the write scope.
```

The skill passes an explicit write scope. The tool refuses to write outside it. The caller can see, before the run, the surface area the rename will touch. After the run, the `files_written` field is the audit trail.

## Rationale

The Code-First pattern is a bargain: the caller hands a clear input to a tool and gets a clear output back. Scope creep breaks the bargain on the write side. A tool that writes outside its declared inputs is an agent with hidden state, because the caller cannot predict or review the effect of running it. The pattern asks for deterministic output; the same principle applies to deterministic write scope. When a tool wants to touch files the caller did not name, the tool should ask, not assume.

## Relationship to existing invariants

Pattern 01 "Isolation" says a tool runs without knowing which skill called it, and does not read surrounding context. Scope creep is the inverse of isolation from the write side: the tool does know the surrounding context (the repo), and uses that knowledge to write to files the caller never named. Isolation protects the tool from the caller. This heuristic protects the caller from the tool.

Pattern 01 "Purity" says a tool that calls a language model is not a deterministic tool. Scope creep is the filesystem analogue: a tool whose write surface depends on repo state the caller has not measured is not deterministic in a useful sense. Two runs on the same input can touch different files if the repo changed between runs.

## Open questions

- The static signal depends on a new tool frontmatter field, `writes:`. The spec does not define this field today. Accepting this heuristic means adding the field to Pattern 01's tool contract, or accepting that the heuristic is only testable with a prose-level signal until a field is defined.
- `writes:` can be a path glob, a file list, or a predicate (`writes only to files already staged`). The spec should pick one shape. A glob is the simplest, a predicate is the most expressive.
- The prose signal is a fallback and should not catch legitimate tools that honestly document their side effects. "Also updates the cache" is different from "modifies unrelated files". The word list needs tuning.
- Overlap with the existing isolation invariant: the pattern owner may decide that scope creep is already covered by "Isolation" and that the heuristic is not needed as a separate entry. In that case, the proposal should be downgraded to an example of an isolation violation rather than a standalone heuristic.
