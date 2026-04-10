---
name: plan-issue
description: Analyze a GitHub issue and generate a planning procedure for the LLM to execute
tools:
  - examples/tools/analyze-issue.ts
---

# plan-issue

This skill demonstrates **Level 3: Instructions** from the Code-First Agents pattern.
The tool decides everything. The LLM executes.

## Phase 1: Analyze

1. Run: `bun examples/tools/analyze-issue.ts --owner "{owner}" --repo "{repo}" --issue {number}`
2. Parse the JSON output from stdout.
3. Read the `instructions` field.

## Phase 2: Execute

Execute the `instructions` field verbatim.

- Do NOT modify the procedure.
- Do NOT skip steps.
- Do NOT add steps.
- Do NOT override the tool's decisions.

**INVARIANT:** Follow the instructions literally. No probabilistic branching.

## Phase 3: Report

1. Summarize what was done.
2. Link to any commits, PRs, or files created.
3. Ask the user to approve before merging.

---

## Why this works

The tool (`analyze-issue.ts`) already decided:
- **What complexity level** this issue is (lean / standard / full)
- **What procedure** to follow for that complexity
- **What specific steps** the LLM should execute

The skill doesn't need to branch. It just invokes the tool and tells the LLM to follow the output. Every decision lives in deterministic code that can be unit tested.

See [Code-First Agents — Skill Orchestration](https://github.com/beogip/code-first-agents) for the full pattern.
