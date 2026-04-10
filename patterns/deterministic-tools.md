# Deterministic Tools

> Pattern 01

CLI tools that do the work LLMs shouldn't. Write a test, run it, get the same result tomorrow.

## Problem

An issue has 5 checkboxes, references 3 file paths, and includes acceptance criteria. That's a well-specified issue. The planning approach should be lightweight.

But if you ask the LLM to figure that out from the raw issue body, you're spending tokens on pattern matching that regex can do in milliseconds. Worse, the LLM might miss a checkbox, miscount the signals, or change its assessment depending on how the issue is worded.

Every time you ask the LLM to do deterministic work, you're paying for unpredictability. You can't write a test for "the LLM usually counts checkboxes correctly." You can't debug why it called the same issue "complex" yesterday and "simple" today.

I ran into this building an issue triage agent. The same issue got different complexity ratings on different runs. Moving the signal counting to a script made it deterministic overnight.

## Solution

Move deterministic work into CLI tools with a standard contract. The tool takes named parameters, processes them with regular code (regex, scoring, file I/O, validation), and outputs JSON to stdout. The LLM calls the tool and consumes the result.

No API. No server. Just scripts that run locally and print JSON.

## The Tool Contract

The contract is simple:

**Input:** Named CLI parameters.

```bash
bun tools/get-issue-signals.ts --owner "acme" --repo "app" --issue 42
```

**Processing:** Regular, deterministic code. No LLM calls inside the tool.

**Output:** JSON to stdout.

```json
{ "checkboxes": 3, "file_paths": 2, "code_blocks": 1, "word_count": 450 }
```

**Execution:** Run with `bun` (TypeScript) or `python3`. The skill calls the tool via bash and reads stdout.

A minimal tool: named params in, JSON out. Testable with any test runner. Debuggable by running it manually.

## Self-Describing Tools

There's a gap in the pattern so far: how does the LLM know what the tool's output looks like?

You can describe it in the skill. You can hardcode field names. But the moment the tool changes, the skill drifts and you find out at runtime, not at commit time. I added this after a tool changed its output and three skills broke silently.

The fix is to let the tool describe itself. Every deterministic tool supports a `--schema` flag that prints its output contract:

```bash
$ bun tools/analyze-issue.ts --schema
{"type":"object","properties":{"complexity":{"type":"string","enum":["lean","standard","full"]}, ...}}
```

The trick is where the schema comes from. It's not a separate file. It's not a doc comment. It's the same object the tool uses to validate its own output before printing.

```typescript
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const Output = z.object({
  complexity: z.enum(["lean", "standard", "full"]),
  score: z.number().int().min(0).max(10),
  instructions: z.string(),
});

const args = parseArgs(process.argv);

if (args.schema) {
  console.log(JSON.stringify(zodToJsonSchema(Output)));
  process.exit(0);
}

const result = await analyze(args);
console.log(JSON.stringify(Output.parse(result)));
```

One definition, three uses: it validates the output at runtime, it generates the schema on demand, and it types the code. The tool can't lie about its output shape because the shape IS the validator. If someone changes the output without updating the schema, the unit test that runs the tool against its own schema fails in CI.

Python tools do the same with Pydantic. The pattern is framework-agnostic: any library that lets you define a schema once and use it for validation plus JSON Schema generation works.

You pay a dependency (Zod or Pydantic). You get a contract the LLM can discover, a validator that enforces it, and a CI check that catches drift.

## The Spectrum

The same problem (deciding how to plan a GitHub issue) can be solved at three levels of sophistication. Each level moves more decision-making from the LLM to code.

### Level 1: Data

The tool returns raw signals from the issue body. The LLM interprets them.

```
$ bun tools/get-issue-signals.ts --owner acme --repo app --issue 42
{ "checkboxes": 5, "file_paths": 3, "code_blocks": 1, "acceptance_criteria": true, "word_count": 450 }
```

The LLM gets raw signals and decides what to do. It has full discretion. Good for cases where the data needs interpretation in context.

### Level 2: Classification

The tool counts signals, scores them deterministically, and classifies issue complexity. It returns a `complexity` field that the skill can branch on.

```
$ bun tools/classify-issue.ts --owner acme --repo app --issue 42
{ "complexity": "lean", "score": 8, "signals": { "checkboxes": 5, ... } }
```

The classification is deterministic and testable. An issue with 5 checkboxes and acceptance criteria always scores 8+, always routes to "lean." The skill reads `complexity` and follows the matching procedure. The LLM doesn't decide the complexity level.

### Level 3: Instructions

The tool scores, classifies, and builds the complete planning procedure. It returns an `instructions` field with literal steps the LLM follows verbatim.

```
$ bun tools/analyze-issue.ts --owner acme --repo app --issue 42
{
  "complexity": "lean",
  "score": 8,
  "instructions": "## Lean Plan\n1. The issue is well-specified. Skip deep analysis..."
}
```

At Level 3, the LLM does zero branching. It calls the tool, reads `instructions`, and follows them. All decision logic, all branching, all procedure selection is in deterministic, testable code. The LLM is a pure executor.

> These examples are simplified for illustration. Real tools handle edge cases, validation, and richer output structures.

## When to Use Each Level

**Data** when the LLM needs facts to make a judgment call. The situation is ambiguous, the data is one input among many, and you want the LLM's ability to synthesize.

**Classification** when you want testable, deterministic routing but the procedures are simple enough to live in the skill file. You get consistent categorization without building full instruction sets.

**Instructions** when there are 3+ paths with materially different multi-step procedures, or when invisible failures are unacceptable. This is the highest investment but also the highest reliability.

## Trade-offs

The upside is obvious: you can write unit tests for your routing logic, run the tool manually to debug, and get the same output tomorrow that you got today. No tokens wasted on work a function handles better.

The downside: you're writing and maintaining code. When procedures change, you update a script, not just a prompt. And the tool only handles what you coded for. Novel inputs might need a fallback path.

## Related

[Skill Orchestration](skill-orchestration.md) covers the consumer side: how skills call these tools, read their output, and orchestrate the workflow.

---

All the tools from these examples are in the repo, ready to run: [code-first-agents on GitHub](https://github.com/beogip/code-first-agents)
