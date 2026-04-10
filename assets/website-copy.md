# Website Copy: Code-First Agents

> Source of truth for the site content. Edit this file first, then sync the HTML pages and the `.md` mirrors. The `.md` mirrors are what LLMs read via URL.

---

## Page 1: Landing

### Hero

**Code-First Agents**

Your agent works. Until it doesn't. And you can't tell why.

Move deterministic work from the LLM to code.

---

### The Problem

The LLM picks the wrong branch. It skips a step. It hallucinates a field name. You can't write a test for any of it because the decision happened inside a black box.

I've watched agents route tickets correctly most of the time. Then quietly misclassify a bug as a feature request, trigger the wrong workflow, and nobody notices for hours. The failure mode isn't a crash. It's a silent wrong answer.

I kept throwing tokens at the problem: longer prompts, more examples, chain-of-thought. It got marginally better. Never consistent. At some point I started moving the deterministic parts into code, and things stopped being a mystery.

The issue isn't that LLMs are bad. It's that we're asking them to do work that code should do.

---

### The Thesis

Moving decisions from the LLM to code changes three things at once.

Code doesn't drift. Same input, same output. No prompt sensitivity, no temperature variance, no "it worked yesterday." That alone is worth it.

It's also cheaper. A routing decision that runs as a local script instead of a chain-of-thought call costs a fraction of the tokens. And it's faster: a function runs in milliseconds where an LLM call takes seconds. Chain four decisions and the difference compounds.

The question isn't whether your agent uses tools. It's how much decision-making lives inside those tools vs inside the LLM.

Most agents use tools to fetch data or take actions. The LLM still decides what to do. In a code-first agent, the tools handle the decision-making too: they classify, they route, they assemble the procedure. The LLM calls the tool and follows whatever comes back. The more you push into code, the less you depend on probabilistic output for things that should be deterministic.

This aligns with how Anthropic thinks about it. In [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents), they draw a line between workflows (code-driven, predefined paths) and agents (LLM-driven, open-ended). Code-First Agents lives on the workflow side. Deterministic where possible, intelligent where necessary.

---

### The Architecture

Two components. One produces data, the other consumes it.

**Deterministic Tools** are CLI scripts that take named parameters, do deterministic processing, and output JSON to stdout. They're testable, fast, and predictable. They produce structured data the LLM can consume.

**Skills** are markdown instruction files (SKILL.md) that the LLM follows step by step. They call tools via bash, read the JSON output, and tell the LLM what to do next. They're the orchestration layer.

Tools do the heavy lifting. Skills wire them together into a workflow the LLM can follow.

---

### The Spectrum

Not all tools are equal. They exist on a spectrum based on how much decision-making they absorb from the LLM.

**Level 1: Data**
The tool returns structured facts. The LLM interprets them and decides what to do.

```
Tool returns: { "checkboxes": 3, "file_paths": 2, "code_blocks": 1, "word_count": 450 }
LLM does: reads the signals, makes a judgment call on issue complexity
```

**Level 2: Classification**
The tool scores signals and classifies. It returns a complexity level. The skill branches on it.

```
Tool returns: { "complexity": "standard", "score": 6 }
LLM does: reads the complexity, follows the matching branch in the skill
```

**Level 3: Instructions**
The tool scores, classifies, and builds the complete procedure. The LLM follows it verbatim.

```
Tool returns: { "complexity": "standard", "instructions": "## Step 1: Read the issue\n..." }
LLM does: executes the instructions exactly as written. Zero branching.
```

At Level 3, the tool becomes a prompt factory. It generates the exact procedure the LLM should follow based on deterministic analysis. The LLM just executes. All branching logic lives in code you can test and debug.

This inverts the usual tool-use pattern. Instead of the LLM using tools to help with its plan, the tool builds the plan and the LLM carries it out.

I built kael.factory, a plugin generator for Claude Code, using these exact patterns. Every decision in the generation pipeline runs on deterministic tools orchestrated by skills.

---

### Who

I'm Juan Gipponi. CTO at a tech agency, where I lead a dev team and integrate AI into how we actually work. Everything on this site is what I use in production.

[LinkedIn](https://www.linkedin.com/in/juan-gipponi)

---

### Pattern Pages

**[Deterministic Tools](/patterns/deterministic-tools)**
How to build CLI tools that do deterministic work and output JSON. The tool contract, the output spectrum, and progressive examples.

**[Skill Orchestration](/patterns/skill-orchestration)**
How to write SKILL.md files that consume tool output. The LLM as executor, chaining tools, guards, and the verbatim execution principle.

---

### When to Go Code-First

Not everything belongs in code.

**Move to code when:**

- Computational logic
- 3+ divergent paths
- Deterministic output
- Silent failures are costly

**Keep in the LLM when:**

- Needs judgment or creativity
- Ambiguous input
- Conversational context
- Multi-source synthesis

Most real agents are a mix. The goal isn't to remove the LLM. It's to stop wasting it on work that doesn't need intelligence.

---

Everything here is open source. Grab it, break it, adapt it: [code-first-agents on GitHub](https://github.com/beogip/code-first-agents)

If you're building agents and want to talk about this stuff, I'm on [LinkedIn](https://www.linkedin.com/in/juan-gipponi).

---

---

## Page 2: Deterministic Tools

### Hero

**Deterministic Tools**

CLI tools that do the work LLMs shouldn't. Write a test, run it, get the same result tomorrow.

---

### Problem

An issue has 5 checkboxes, references 3 file paths, and includes acceptance criteria. That's a well-specified issue. The planning approach should be lightweight.

But if you ask the LLM to figure that out from the raw issue body, you're spending tokens on pattern matching that regex can do in milliseconds. Worse, the LLM might miss a checkbox, miscount the signals, or change its assessment depending on how the issue is worded.

Every time you ask the LLM to do deterministic work, you're paying for unpredictability. You can't write a test for "the LLM usually counts checkboxes correctly." You can't debug why it called the same issue "complex" yesterday and "simple" today.

I ran into this building an issue triage agent. The same issue got different complexity ratings on different runs. Moving the signal counting to a script made it deterministic overnight.

---

### Solution

Move deterministic work into CLI tools with a standard contract. The tool takes named parameters, processes them with regular code (regex, scoring, file I/O, validation), and outputs JSON to stdout. The LLM calls the tool and consumes the result.

No API. No server. Just scripts that run locally and print JSON.

---

### The Tool Contract

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

---

### Self-Describing Tools

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

---

### The Spectrum

The same problem (deciding how to plan a GitHub issue) can be solved at three levels of sophistication. Each level moves more decision-making from the LLM to code.

#### Level 1: Data

The tool returns raw signals from the issue body. The LLM interprets them.

```
$ bun tools/get-issue-signals.ts --owner acme --repo app --issue 42
{ "checkboxes": 5, "file_paths": 3, "code_blocks": 1, "acceptance_criteria": true, "word_count": 450 }
```

The LLM gets raw signals and decides what to do. It has full discretion. Good for cases where the data needs interpretation in context.

#### Level 2: Classification

The tool counts signals, scores them deterministically, and classifies issue complexity. It returns a `complexity` field that the skill can branch on.

```
$ bun tools/classify-issue.ts --owner acme --repo app --issue 42
{ "complexity": "lean", "score": 8, "signals": { "checkboxes": 5, ... } }
```

The classification is deterministic and testable. An issue with 5 checkboxes and acceptance criteria always scores 8+, always routes to "lean." The skill reads `complexity` and follows the matching procedure. The LLM doesn't decide the complexity level.

#### Level 3: Instructions

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

---

### When to Use Each Level

**Data** when the LLM needs facts to make a judgment call. The situation is ambiguous, the data is one input among many, and you want the LLM's ability to synthesize.

**Classification** when you want testable, deterministic routing but the procedures are simple enough to live in the skill file. You get consistent categorization without building full instruction sets.

**Instructions** when there are 3+ paths with materially different multi-step procedures, or when invisible failures are unacceptable. This is the highest investment but also the highest reliability.

---

### Trade-offs

The upside is obvious: you can write unit tests for your routing logic, run the tool manually to debug, and get the same output tomorrow that you got today. No tokens wasted on work a function handles better.

The downside: you're writing and maintaining code. When procedures change, you update a script, not just a prompt. And the tool only handles what you coded for. Novel inputs might need a fallback path.

---

### Related

**[Skill Orchestration](/patterns/skill-orchestration)** covers the consumer side: how skills call these tools, read their output, and orchestrate the workflow.

---

All the tools from these examples are in the repo, ready to run: [code-first-agents on GitHub](https://github.com/beogip/code-first-agents)

---

---

## Page 3: Skill Orchestration

### Hero

**Skill Orchestration**

Markdown files that turn LLMs into reliable executors. The consumer side of deterministic tools.

---

### Problem

You write a long system prompt. It has conditional logic scattered through prose paragraphs: "if the issue looks well-specified, do a lean plan; if it's missing context, do a full analysis first; if it has acceptance criteria but no file paths..."

The LLM follows it for a while. Then it starts drifting. It skips a condition. It bleeds instructions from one branch into another. It "interprets" a step instead of following it. You add more detail to the prompt. It gets worse, not better, because now there's more to ignore.

The behavior is untestable. You can't assert that the LLM will always take the right branch. You can't reproduce a failure. You can't even see which branch it took without reading the full output and reasoning backward.

The problem isn't the LLM's capability. It's that branching logic expressed in prose is a terrible control flow mechanism. I rewrote the same system prompt three times before realizing the fix wasn't better wording. It was moving the branching out of prose entirely.

---

### Solution

SKILL.md files that orchestrate deterministic tools. The skill calls tools via bash, reads their JSON output, and tells the LLM what to do next. Decision-making stays in the tools. Sequencing stays in the skill. The LLM just executes.

---

### What makes a skill code-first

Skills are markdown instructions the LLM follows step by step. The format comes from the open [Agent Skills](https://agentskills.io) standard: a file with phases, steps, and tool invocations that the LLM reads and executes.

What makes a skill _code-first_ is where the decisions live. In a typical skill, the LLM reads the instructions and figures out what to do. In a code-first skill, the decisions are already made by the tools the skill calls. The skill's job is sequencing, not thinking.

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

The skill defines the _workflow_. The tools do the _work_. The LLM follows the workflow and applies judgment only where the skill explicitly asks for it.

---

### Consuming Tool Output

How the skill consumes tool output depends on what the tool returns. The three levels mirror the tool spectrum.

#### Level 1: Data. The LLM interprets.

```markdown
## Phase 1: Gather context

1. Run: `bun tools/get-issue-signals.ts --owner "{owner}" --repo "{repo}" --issue {number}`
2. Review the signals in the JSON output (checkboxes, file paths, code blocks, word count).
3. Based on the signals, decide the best planning approach for this issue.
4. Explain your reasoning before proceeding.
```

The LLM has discretion. It reads the raw signals, applies judgment, and picks an approach. This is useful when the situation genuinely needs interpretation, when the data is one signal among many.

#### Level 2: Classification. The skill branches.

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

#### Level 3: Instructions. The LLM follows verbatim.

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

---

### Chaining Tools

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

---

### Guards and Gates

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

---

### Trade-offs

Having the whole workflow in one readable file is a big win. You can trace the execution path, verify each tool's output independently, and onboard someone new by pointing them at a markdown file instead of explaining a prompt chain.

The cost is maintenance: each workflow needs a SKILL.md that stays in sync with its tools. And the pattern depends on the LLM actually following the instructions. Strong models (Claude, GPT-4) do this well. Smaller models drift. That's a feature choice, not a bug: you're trading flexibility for reliability on purpose.

---

### Related

**[Deterministic Tools](/patterns/deterministic-tools)** covers the producer side: how to build the CLI tools that skills consume.

---

> These examples are simplified for illustration. Real skills handle error cases, multi-tool pipelines, and richer output structures.

---

The skills from these examples are in the repo. Fork it and make them yours: [code-first-agents on GitHub](https://github.com/beogip/code-first-agents)

Building with these patterns? I'd like to hear how it goes: [LinkedIn](https://www.linkedin.com/in/juan-gipponi)
