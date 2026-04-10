# Examples

These examples demonstrate the three levels of the Code-First Agents spectrum, using a GitHub issue planning workflow.

## The spectrum

| Level | Tool | What it returns | LLM role |
|-------|------|-----------------|----------|
| **1. Data** | [`get-issue-signals.ts`](tools/get-issue-signals.ts) | Raw structural signals | Interprets, decides |
| **2. Classification** | [`classify-issue.ts`](tools/classify-issue.ts) | Complexity + score | Reads classification, branches |
| **3. Instructions** | [`analyze-issue.ts`](tools/analyze-issue.ts) | Complete procedure | Executes verbatim |

Each level moves more decision-making from the LLM to deterministic code.

## Running the tools

All tools use [Bun](https://bun.sh). They fetch a GitHub issue and output JSON to stdout.

```bash
# Level 1: raw signals
bun examples/tools/get-issue-signals.ts --owner acme --repo app --issue 42

# Level 2: classification
bun examples/tools/classify-issue.ts --owner acme --repo app --issue 42

# Level 3: instructions (the tool is a prompt factory)
bun examples/tools/analyze-issue.ts --owner acme --repo app --issue 42
```

Set `GITHUB_TOKEN` in your environment if the repo is private or you're hitting rate limits.

## Skills

[`skills/plan-issue/`](skills/plan-issue/SKILL.md) is a complete SKILL.md example that consumes `analyze-issue.ts` at Level 3. The skill tells the LLM to run the tool and follow the `instructions` field verbatim. Zero LLM branching.

## Notes

These examples are simplified for illustration. Real tools handle edge cases, validation, retries, and richer output structures. The patterns are what matters, not the specific implementation.
