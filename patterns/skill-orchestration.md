# Skill Orchestration

> Pattern 02

Markdown files that turn LLMs into reliable executors. The consumer side of deterministic tools.

## Problem

You write a long system prompt. It has conditional logic scattered through prose paragraphs: "if the issue looks well-specified, do a lean plan; if it's missing context, do a full analysis first; if it has acceptance criteria but no file paths..."

The LLM follows it for a while. Then it starts drifting. It skips a condition. It bleeds instructions from one branch into another. It "interprets" a step instead of following it. You add more detail to the prompt. It gets worse, not better, because now there's more to ignore.

The behavior is untestable. You can't assert that the LLM will always take the right branch. You can't reproduce a failure. You can't even see which branch it took without reading the full output and reasoning backward.

The problem isn't the LLM's capability. It's that branching logic expressed in prose is a terrible control flow mechanism. I rewrote the same system prompt three times before realizing the fix wasn't better wording. It was moving the branching out of prose entirely.

## Solution

SKILL.md files that orchestrate deterministic tools. The skill calls tools via bash, reads their JSON output, and tells the LLM what to do next. Decision-making stays in the tools. Sequencing stays in the skill. The LLM just executes.

## What makes a skill code-first

Skills are markdown instructions the LLM follows step by step. The format comes from the open [Agent Skills](https://agentskills.io) standard: a file with phases, steps, and tool invocations that the LLM reads and executes.

What makes a skill *code-first* is where the decisions live. In a typical skill, the LLM reads the instructions and figures out what to do. In a code-first skill, the decisions are already made by the tools the skill calls. The skill's job is sequencing, not thinking.

```markdown
---
name: plan-issue
description: Analyze a GitHub issue and plan the implementation
tools: [tools/analyze-issue.ts]
---

## Phase 1: Analyze

1. Run: `bun tools/analyze-issue.ts --owner "{owner}" --repo "{repo}" --issue {number}`
2. Read the JSON output.

## Phase 2: Execute

Follow the `instructions` field from the tool output verbatim.

## Phase 3: Report

Summarize the plan and ask the user to approve before coding.
```

The skill defines the *workflow*. The tools do the *work*. The LLM follows the workflow and applies judgment only where the skill explicitly asks for it.

## Consuming Tool Output

How the skill consumes tool output depends on what the tool returns. Because every tool describes its own output shape (see [Self-Describing Tools](deterministic-tools.md#self-describing-tools)), the skill reads documented fields instead of guessing at them. The three levels mirror the tool spectrum.

### Data. The LLM interprets.

```markdown
## Phase 1: Gather context

1. Run: `bun tools/get-issue-signals.ts --owner "{owner}" --repo "{repo}" --issue {number}`
2. Review the signals in the JSON output (checkboxes, file paths, code blocks, word count).
3. Based on the signals, decide the best planning approach for this issue.
4. Explain your reasoning before proceeding.
```

The LLM has discretion. It reads the raw signals, applies judgment, and picks an approach. This is useful when the situation genuinely needs interpretation, when the data is one signal among many.

### Classification. The skill branches.

```markdown
## Phase 1: Classify

1. Run: `bun tools/classify-issue.ts --owner "{owner}" --repo "{repo}" --issue {number}`
2. Read the `complexity` field from the JSON output.

## Phase 2: Execute

Follow the procedure for the returned complexity:

### If complexity is "lean"

1. The issue is well-specified. List files to modify.
2. Write a short implementation plan.
3. Start coding.

### If complexity is "standard"

1. Identify acceptance criteria.
2. Search the codebase for related code.
3. Write a plan and ask the user to approve.

### If complexity is "full"

1. List missing information.
2. Search for related patterns in the codebase.
3. Write a detailed plan with alternatives.
4. Ask the user to approve before coding.
```

The classification is deterministic (the tool decided based on signal scoring). The procedures live in the skill. The LLM reads the complexity and follows the matching section. This works well when the number of routes is small and the procedures are short enough to fit in a skill file.

### Procedure. The LLM follows verbatim.

```markdown
## Phase 1: Analyze

1. Run: `bun tools/analyze-issue.ts --owner "{owner}" --repo "{repo}" --issue {number}`
2. Read the `instructions` field from the JSON output.

## Phase 2: Execute

Execute the `instructions` field verbatim.
Do NOT modify the procedure.
Do NOT skip steps.
Do NOT add steps.
Do NOT override the tool's decisions.

INVARIANT: Follow the instructions literally. No probabilistic branching.

## Phase 3: Report

Summarize what was done and link to any commits created.
```

Zero LLM branching. The tool decided everything: the complexity level, the planning procedure, the specific steps. The LLM is a pure executor. The skill is a thin shell.

This is the pattern I reach for most. The tool is a prompt factory: it generates the exact instructions the LLM should follow, based on deterministic analysis. If something breaks, you trace it to a line of code, not to a prompt that "usually works."

## Chaining Tools

Real workflows involve multiple tools in sequence. Each tool's output feeds the next step.

```markdown
## Phase 1: Gather

1. Run: `bun tools/git-state.ts`
2. Note the current branch, uncommitted files, and recent commits.

## Phase 2: Analyze

1. Run: `bun tools/analyze-issue.ts --owner "{owner}" --repo "{repo}" --issue {number}`
2. Read the `instructions` field.

## Phase 3: Execute

Follow the `instructions` from Phase 2, using the git context from Phase 1.

## Phase 4: Validate

1. Run: `bun tools/run-tests.ts --suite unit`
2. If the `pass` field is false, review failures and fix before proceeding.
```

Each tool is deterministic. The skill sequences them. The LLM carries context between phases but doesn't make routing decisions.

## Guards and Gates

Tools can also serve as guardrails within a workflow.

**Loop guards** prevent infinite retry cycles:

```markdown
## Fix Loop

1. Run tests.
2. If tests fail, attempt a fix.
3. Run: `bun tools/fix-loop-guard.ts --attempt {n} --max 3`
4. If the `halt` field is true, stop and report the failure. Do NOT attempt another fix.
```

The guard is deterministic. After 3 attempts, it returns `{ "halt": true }`. The LLM doesn't decide whether to keep trying.

**Scope guards** prevent the agent from drifting into unrelated files:

```markdown
## Phase 4: Verify scope

1. Run: `bun tools/scope-guard.ts --allowed "{filePaths from analyze-issue}" --changed "$(git diff --name-only)"`
2. If the `out_of_scope` field is not empty, revert those files and explain why they were excluded.
```

The tool compares modified files against the expected scope from the issue analysis. If the agent touched files outside that scope, the guard catches it. No judgment call, just a set comparison.

## Trade-offs

Having the whole workflow in one readable file is a big win. You can trace the execution path, verify each tool's output independently, and onboard someone new by pointing them at a markdown file instead of explaining a prompt chain.

The cost is maintenance: each workflow needs a SKILL.md that stays in sync with its tools. And the pattern depends on the LLM actually following the instructions. Strong models (Claude, GPT-4) do this well. Smaller models drift. That's a feature choice, not a bug: you're trading flexibility for reliability on purpose.

## Related

[Deterministic Tools](deterministic-tools.md) covers the producer side: how to build the CLI tools that skills consume.

---

> These examples are simplified for illustration. Real skills handle error cases, multi-tool pipelines, and richer output structures.

The skills from these examples are in the repo. Fork it and make them yours: [code-first-agents on GitHub](https://github.com/beogip/code-first-agents)

Building with these patterns? I'd like to hear how it goes: [LinkedIn](https://www.linkedin.com/in/juan-gipponi)
