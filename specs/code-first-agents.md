# Code-First Agents

**Status:** Living document · **Last updated:** 2026-09-08

## Opening thesis

The most reliable agents we've built share a common shape. Deterministic work lives in code, and the LLM orchestrates. This document describes that shape, the contracts that hold it together, and the trade-offs at each point along the spectrum.

## What is Code-First?

Code-First is a question of placement. Every decision an agent makes either lives in code or lives in the LLM. We've found that moving a decision into code, whenever the decision is deterministic, makes runs cheaper, faster, and reproducible. The decisions that stay in the LLM are the ones that genuinely need judgment.

A **deterministic decision** is one where the same input should always produce the same output. Scoring, classification, extraction, file I/O, API calls, threshold checks: none of these need a language model.

Two roles do the work together. **Tools** are the producer side: small CLI scripts with a fixed contract. **Skills** are the consumer side: markdown files the LLM reads and follows, calling tools phase by phase. Tools absorb decisions into code. Skills sequence the calls. The LLM becomes the glue between them.

Between pure LLM decisions and pure code decisions there is a spectrum. A tool can return raw data and hand interpretation back to the LLM. It can return a category and let the skill branch. It can return a complete procedure the LLM executes literally. We call this the **output spectrum**, and it runs from Data to Procedure.

## When (and when not) to use Code-First

Before adopting this pattern, check whether the task fits.

Code-First works well when the workflow can be decomposed into phases, when most of the work is computational, when the same task recurs often enough to justify writing code, and when silent failures would be expensive. It is the wrong fit when the task is genuinely open-ended, when the input is ambiguous and needs judgment, or when a single prompt would do the job once and disappear.

The simpler cut:

| Move to code           | Keep in LLM                  |
| ---------------------- | ---------------------------- |
| Computational logic    | Needs judgment or creativity |
| 3+ divergent paths     | Ambiguous input              |
| Deterministic output   | Conversational context       |
| Silent failures costly | Multi-source synthesis       |

Anthropic's [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) draws a line between workflows and agents. Code-First sits on the workflow side.

## The Spectrum

The three tool types describe how much of the decision lives in code.

**Data.** The tool returns raw, structured signals. The LLM interprets them and decides what to do. Most of the decision still lives in the model.

**Classification.** The tool returns a category derived from the input, along with the signals it used. The skill branches on the category. The decision is split: the tool classifies, the LLM acts on the class.

**Procedure.** The tool returns a complete, step-by-step sequence, usually markdown, that the caller executes literally. The LLM operates as an executor. The decision lives entirely in code.

A rough diagram:

```
  Data      ->      Classification  ->  Procedure
  (LLM interprets)  (LLM branches)      (LLM executes)

  more LLM    <==========================>    less LLM
  more flexible                          more reliable
```

As we move right, flexibility drops and reliability rises.

Earlier revisions numbered these Level 1, Level 2, and Level 3, abbreviated L1, L2, and L3, and named the third one Instructions. Those names are deprecated. Data, Classification, and Procedure replace them one for one.

## Pattern 01: Deterministic Tools

### Intent

Move computational work out of the LLM into CLI tools with a standard contract, so the same input always produces the same output. Any skill can call a tool. The tool does not know which skill is calling.

### Shape

This is the skeleton of a deterministic tool. It is not real code, it is the form:

```
#!/usr/bin/env bun
// Tool type: {data | classification | procedure}

const { values } = parseArgs({ /* named params */ });

// 1. Gather raw input (fetch, read, parse).
const input = await gather(values);

// 2. Transform deterministically. No LLM calls.
const result = transform(input);

// 3. Emit a single JSON object on stdout, whether the run succeeded or failed.
console.log(JSON.stringify({ ok: true, ...result }));
```

When we open a real tool file, we look for this shape. A file that calls a language model, hides state between runs, or prints prose to stdout does not match.

### The contract

Every deterministic tool shares the same contract:

- **Named input.** Tools accept named CLI parameters, not positional arguments.
- **JSON output.** Tools print a single JSON object to stdout on every run.
- **No LLM inside.** Tools never call a language model. If the work needs judgment, it is not a tool.
- **Deterministic.** Same input, same output, every time. No hidden state between runs.
- **Self-describing (recommended).** Tools expose their output schema via a `--schema` flag, so callers can validate the contract and CI can catch drift. A `--schema` run is its own case, and the object it returns is the schema.
- **Fail loud.** A failing tool uses the same channel a passing tool uses: a single JSON object on stdout, carrying a descriptive error message the caller can read. The tool throws descriptive errors internally, and its boundary serializes them into that object. The pattern does not prescribe how the process terminates. That decision is left to the implementation.
- **Error structure (suggested).** Returning the object is mandatory. Its exact structure is not. One shape that works: `ok` as a boolean, `error` as a short machine-readable identifier, and `message` as the human-readable description.

### The three tool types

**Data.** The tool returns raw structural signals extracted from the input. The LLM reads the signals and decides what to do.
*When to use:* The input is ambiguous, or the downstream procedure is trivial and does not justify encoding.
*Examples where a data tool is useful:* Extracting structured fields from a free-form user message. Pulling metadata from a document before summarization. Gathering telemetry that the LLM will synthesize into a narrative.

**Classification.** The tool returns a category derived from the input, plus the signals it used. The skill branches on the category.
*When to use:* Routing is testable and the branches are short enough to inline in the skill. The branches share most of their work.
*Examples where a classification tool is useful:* Deciding whether a support ticket is a bug, a question, or a feature request. Routing an incoming document to the right extractor. Picking between a short and a long response mode based on input size.

**Procedure.** The tool returns a complete, step-by-step sequence, usually markdown, that the caller executes verbatim. The LLM operates as an executor.
*When to use:* There are three or more branches with materially different multi-step procedures, and drift between branches is unacceptable. The procedure has to be auditable end to end.
*Examples where a procedure tool is useful:* Driving a multi-phase workflow that differs per case. Generating the exact steps of a release process before the LLM carries them out. Producing the playbook for an incident type before the agent acts on it.

### Invariants

- **Purity.** A tool that calls a language model is not a deterministic tool.
- **Reproducibility.** Same input, same output, always.
- **Isolation.** A tool runs without knowing which skill called it. It does not read surrounding context, and it does not keep state between runs.

### Trade-offs

**Upside.** Unit-testable, debuggable, reproducible. Fewer tokens per run, because the logic does not re-pay for itself on every call. When a tool exposes its schema, CI can validate its output on every build and catch drift before it reaches users. Tools are reusable across skills.

**Downside.** We maintain code. Changing the procedure means editing scripts, not rewording a prompt. Inputs that fall outside the tool's assumptions need an escape hatch or a fallback path. Coding trivial logic adds friction for zero payoff.

### Reference implementation

Three reference tools live in `examples/tools/`, one per tool type, built around a GitHub issue planning workflow. See the [examples README](../examples/README.md) for field names, scoring details, and runtime notes. The examples are illustrative, not normative. The pattern is defined by this document, not by the thresholds in the reference tools.

## Pattern 02: Skill Orchestration

### Intent

Write markdown files, `SKILL.md`, whose only job is to sequence deterministic tools. Decisions live in the tools. Sequencing lives in the skill. The LLM reads the skill and follows it phase by phase.

### Shape

The skeleton of a skill:

```
---
name: <skill-name>
description: <one line>
tools:
  - <path/to/tool.ts>
---

# <skill-name>

## Phase 1: <gather>

1. Run: `<tool invocation with named params>`
2. Parse the JSON output from stdout.
3. Read the documented fields.

## Phase 2: <act>

Depending on the tool type, one of:
- Interpret the signals (data tool).
- Branch on the category (classification tool).
- Execute the instructions verbatim (procedure tool).

## Phase 3: <report>

Summarize what was done. Link artifacts. Hand off or ask for approval.
```

This is the shape we pattern-match against when we open a real `SKILL.md`. Frontmatter, numbered phases, one tool per phase, a final handoff.

### The contract

A skill is structured markdown, not prose. The contract is:

- **Frontmatter.** Every skill declares its `name`, a `description`, and the `tools` it depends on.
- **Phases.** A skill is a sequence of numbered phases. Each phase has a single purpose.
- **Tool calls live in phases.** Each phase invokes zero or one tool via bash and reads its JSON output.
- **No hidden logic.** Every decision the skill makes is visible in the file. No instructions live outside the phases.
- **Ends with a handoff.** The last phase reports, hands off, or asks for approval.

### The three skill shapes

The tool type decides the shape of the skill.

**Thick skill.** The skill hands raw signals to the LLM with an interpretation prompt. The model does the work the tool did not absorb. Most of the logic sits in the skill and in the model.

**Branching skill.** The skill contains explicit `If <category>, do <branch>` sections. The LLM reads the class, picks the branch, and follows it. The skill is the routing table.

**Thin skill.** The skill is a shell of three phases: run the tool, execute the returned instructions, report. No branching. No interpretation. At this end of the spectrum the skill is often shorter than the tool it depends on.

### Invariants

- **Tools are trusted.** A skill reads documented fields from tool output. It does not inspect the tool's source to decide what to do.
- **One tool, one phase.** A phase invokes at most one tool. If two tools are needed, that is two phases.
- **Verbatim execution.** When a skill consumes a procedure tool, it does not modify, skip, add steps, or override tool decisions. It follows the instructions literally. No probabilistic branching. The LLM is an executor, nothing more.
- **No hidden state.** A skill that depends on memory between runs is a different pattern. Skills run from their first phase every time.

### Anti-patterns

Invariants describe what a healthy skill looks like. Anti-patterns describe the shapes we see when a skill drifts away from them. We keep a registry of heuristics, one per anti-pattern shape, that scanners can use to flag a skill during review.

The registry lives in [`anti-patterns/`](./anti-patterns/). Each heuristic has its own file with a detection signal, false-positive guards, a good and a bad example, and the invariant it relates to. See [`anti-patterns/README.md`](./anti-patterns/README.md) for the index and [`../CONTRIBUTING.md`](../CONTRIBUTING.md) for the proposal flow.

### Trade-offs

**Upside.** The whole workflow sits in one readable file. Tools are independently verifiable, so the skill inherits their reliability. We can audit, review, and version a skill the same way we version code. Swapping a tool swaps a subsystem, with no prose rewriting required.

**Downside.** Skills and tools have to evolve together. We need a capable model that actually follows instructions, because weaker models drift even when given explicit verbatim procedures. Adding a new branch means editing the tool, the skill, or both.

### Reference implementation

A reference skill lives in `examples/skills/plan-issue/SKILL.md`. It consumes the reference procedure tool and demonstrates a thin skill at the far end of the spectrum. See the [examples README](../examples/README.md) for the full walkthrough. As with the tools, the example is illustrative, not normative.

## How the patterns compose

Deterministic Tools and Skill Orchestration are two halves of the same architecture. Tools are the producer side. Skills are the consumer side. Neither is useful alone. A tool without a skill is a script nobody calls. A skill without deterministic tools is a prose prompt with extra structure.

The connection point is the tool contract: named params in, JSON to stdout, optionally a `--schema` flag. When tools are self-describing, skills can trust them without reading their internals. The spectrum runs on both sides because the shape of the tool's output decides the shape of the skill that consumes it. The more the tool absorbs, the thinner the skill becomes. With a procedure tool, the skill is a short shell and the LLM operates as an executor.

## Anti-patterns

Invariants describe the healthy shape. Anti-patterns describe the shapes we see when a skill or tool drifts away from them. The registry at [`anti-patterns/`](./anti-patterns/) holds one heuristic per anti-pattern, each with a detection signal, false-positive guards, examples, and the invariant it relates to.

See [`anti-patterns/README.md`](./anti-patterns/README.md) for the full index grouped by status.

## Summary

Three principles hold the pattern together.

1. Push deterministic work into code. Keep the LLM for judgment.
2. Let the shape of the tool's output decide the shape of the skill that consumes it.
3. A procedure tool writes the prompt the LLM will execute.

## Evolution

This section tracks meaningful changes to the patterns over time. Entries are chronological, newest first.

### 2026-09-08, Tools return the same JSON object on failure

A deterministic tool prints one JSON object on every run, whether the work succeeded or failed. The contract previously routed failures outside that object, so a caller had to parse two channels, and a failure was easy to swallow.

**What changed:**

- **Fail loud** now names the returned object as the failure channel. The object carries a descriptive error message the caller can read.
- Tools throw descriptive errors internally. The boundary catches them and serializes them into the returned object.
- How the process terminates is left to the implementation. The pattern no longer prescribes it.
- **Error structure (suggested)** offers `ok`, `error`, and `message` as one shape that works. Returning the object is mandatory, its structure is not, so field names stay in `examples/` under the separation rule.
- The tool skeleton emits `{ ok: true, ...result }`, so the result rides at the top level next to the flag.
- **Self-describing** states that a `--schema` run is its own case, so "every run" and the reserved flag do not read as a contradiction.

**Known divergence.** The tools in `examples/` still fail the old way. Bringing the reference implementation in line needs a follow-up change.

### 2026-07-28, Tool types replace the numbered levels

The three tool types are now named Data, Classification, and Procedure. They were previously numbered, and the third one was also called Instructions. A number said where a tool sat on the spectrum. It never said what the tool returns. The new names do.

**Why these three:**

- Each name states what the tool returns, so a reader who meets the term once can place it without the diagram.
- Procedure replaces Instructions because the tool output contract already carries an `instructions` field. One word for two referents made the spec ambiguous.
- The names stay lexically distinct from the skill shapes, which remain thick, branching, and thin.

**Aliases.** The old identifiers are deprecated, not erased. The Spectrum section carries a note mapping all seven of them to their replacements, so documents that still cite the numbered names stay resolvable.

**Scope.** The rename covers this file, the anti-patterns registry, the root README, `examples/`, and `CONTRIBUTING.md`. The published site follows in a separate change.

**Prior entries migrated.** The Evolution entries below this one had their vocabulary migrated to the new names. Leaving them would have made them cite an invariant that no longer exists. That invariant is now named "Verbatim execution".

### 2026-04-11, Anti-patterns registry

Introduces an anti-patterns registry at `specs/anti-patterns/`. The registry holds one markdown file per heuristic, with a template file (`_template.md`) that contributors copy to propose new heuristics and a README index grouped by status (proposed, accepted, rejected, local-only, revised).

**Seed proposals (seven, all with status `proposed`):**

- **Retroactive** (already in `branch-scanner.ts`, validated against the spec shape): `ambiguous_threshold`, `high_divergence`, `unconditional_spawn`.
- **New**: `instruction_bleeding`, `skipped_conditions`, `scope_creep`, `missing_termination`.

**Process changes:**

- `CONTRIBUTING.md` gains a "Proposing a heuristic" section. New heuristics land in the spec before any scanner code is written. Retroactive heuristics validate the scanner's shape against the abstract description.
- Pattern 02 gains an "Anti-patterns" subsection pointing to the registry. Invariants describe the healthy shape; the registry describes the shapes we see when a skill drifts.

**Out of scope for the seed registry:** `prose_conditional` and `missing_instructions` are not proposed as standalone heuristics because they map directly to Pattern 02 "No hidden logic" and "Verbatim execution" respectively. The registry README names them so they are not re-proposed.

### 2026-04-10, Initial spec

First formal specification derived from the site content and the reference implementations in `examples/`.

**Patterns included:**

- **Deterministic Tools** with the output spectrum (Data, Classification, Procedure).
- **Skill Orchestration** with a spectrum that mirrors the tool types.

**Key concepts formalized:**

- **Tool contract.** Named params in, JSON to stdout, no LLM calls inside.
- **Self-describing tools.** `--schema` flag, schema-as-validator, CI drift detection.
- **Prompt factory.** Procedure tools that produce the literal prompt the LLM will execute.
- **Verbatim execution principle.** With a procedure tool, the LLM operates as a pure executor, and invariants forbid modification.
- **Output spectrum.** Data, Classification, Procedure as a continuum of decision absorption.

**Reference implementations committed to `examples/`:**

- `examples/tools/get-issue-signals.ts`, Data
- `examples/tools/classify-issue.ts`, Classification
- `examples/tools/analyze-issue.ts`, Procedure (prompt factory)
- `examples/skills/plan-issue/SKILL.md`, reference thin skill

## How to update this spec

This document is the canonical description of the Code-First Agents pattern in the abstract. Tutorials, design rationale, and example code belong elsewhere. Concrete implementations live in `examples/`. The rendered version is published at https://beogip.github.io/code-first-agents/.

**When to update.** Update when the pattern itself changes. New invariants, clarified contracts, new tool types, or new composing patterns all qualify. Do not update when only an example changes. That lives in `examples/` and its README.

**How to update.**

1. Edit the relevant section in this file.
2. Bump the `Last updated` field at the top.
3. Add an entry under **Evolution** with the date, what changed, and why. Entries go newest first.
4. If the change introduces a new concept, give it a home in a real section, not only in the changelog.

**The separation rule.** The spec stays abstract. Scoring thresholds, field names, category labels, endpoints, and library choices belong in `examples/`. Heuristic: if replacing the example with a different domain makes a paragraph false, that paragraph describes the example. It does not belong here.

**Voice rules.**

- First-person plural ("we", "we've found") for claims and observations. Imperative or declarative for contracts and procedures. Short sentences. Short paragraphs.
- No em dashes. Use commas, colons, or periods.
- No RFC 2119 language. No MUST, SHOULD, or MAY.
- No AI-slop vocabulary. No "remarkable", "seamless", "leverage", "robust", "unlock", "harness".
- "Reasoning" is not how we describe what an LLM does. Use interprets, generates, executes, decides, or produces.
- No chiasmus, no triple anaphora, no forced parallelism.

**Relationship to examples and site.** The `examples/` directory is the reference implementation. The site publishes a rendered version of this document. When the pattern changes, update this file first, then propagate to the site build and adapt the examples if needed.
