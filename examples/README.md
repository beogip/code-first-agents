# Examples

These examples demonstrate the three tool types of the Code-First Agents spectrum, using a GitHub issue planning workflow.

## The spectrum

| Tool type | Tool | What it returns | LLM role |
|-------|------|-----------------|----------|
| **Data** | [`get-issue-signals.ts`](tools/get-issue-signals.ts) | Raw structural signals | Interprets, decides |
| **Classification** | [`classify-issue.ts`](tools/classify-issue.ts) | Complexity + score | Reads classification, branches |
| **Procedure** | [`analyze-issue.ts`](tools/analyze-issue.ts) | Complete procedure | Executes verbatim |

Each tool type moves more decision-making from the LLM to deterministic code.

## Running the tools

All tools use [Bun](https://bun.sh). They fetch a GitHub issue and output JSON to stdout.

```bash
# Data: raw signals
bun examples/tools/get-issue-signals.ts --owner acme --repo app --issue 42

# Classification: deterministic category
bun examples/tools/classify-issue.ts --owner acme --repo app --issue 42

# Procedure: the tool is a prompt factory
bun examples/tools/analyze-issue.ts --owner acme --repo app --issue 42
```

Set `GITHUB_TOKEN` in your environment if the repo is private or you're hitting rate limits.

## Skills

[`skills/plan-issue/`](skills/plan-issue/SKILL.md) is a complete SKILL.md example that consumes `analyze-issue.ts` as a procedure tool. The skill tells the LLM to run the tool and follow the `instructions` field verbatim. Zero LLM branching.

## Notes

These examples are simplified for illustration. Real tools handle edge cases, validation, retries, and richer output structures. The patterns are what matters, not the specific implementation.
