# Code-First Agents

> Design Patterns for AI Agents

Your agent works. Until it doesn't. And you can't tell why. Move deterministic work from the LLM to code.

## The Problem

The LLM picks the wrong branch. It skips a step. It hallucinates a field name. You can't write a test for any of it because the decision happened inside a black box.

I've watched agents route tickets correctly most of the time. Then quietly misclassify a bug as a feature request, trigger the wrong workflow, and go unnoticed for hours. The failure mode isn't a crash. It's a silent wrong answer.

I kept throwing tokens at the problem: longer prompts, more examples, chain-of-thought. Things got marginally better. Never consistent. Eventually I started moving the deterministic parts into code, and the mystery went away.

The issue isn't that LLMs are bad. It's that we're asking them to do work that code should do.

## The Thesis

**Moving decisions from the LLM to code changes three things at once.**

**Reliability.** Code doesn't drift. Same input, same output. No prompt sensitivity, no temperature variance, no "it worked yesterday."

**Cost.** A routing decision that runs as a local script costs a fraction of the tokens compared to a chain-of-thought call.

**Speed.** A function runs in milliseconds where an LLM call takes seconds. Chain four decisions and the difference compounds.

The question isn't whether your agent uses tools. It's *how much decision-making lives inside those tools vs inside the LLM*.

Most agents use tools to fetch data or take actions. The LLM still decides what to do. In a code-first agent, the **tools handle the decision-making too**: they classify, they route, they assemble the procedure. The LLM calls the tool and follows whatever comes back. The more you push into code, the less you depend on probabilistic output for things that should be deterministic.

This aligns with how Anthropic thinks about it. In [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents), they draw a line between workflows (code-driven, predefined paths) and agents (LLM-driven, open-ended). Code-First Agents lives on the workflow side. Deterministic where possible, intelligent where necessary.

## The Architecture

Two components. One produces data, the other consumes it.

**Deterministic Tools** are CLI scripts that take named parameters, do deterministic processing, and output JSON to stdout. They're testable, fast, and predictable. They produce structured data the LLM can consume.

**Skills** are markdown instruction files (SKILL.md) that the LLM follows step by step. They call tools via bash, read the JSON output, and tell the LLM what to do next. They're the orchestration layer.

Tools do the heavy lifting. Skills wire them together into a workflow the LLM can follow.

## The Spectrum

Not all tools are equal. They exist on a spectrum based on how much decision-making they absorb from the LLM.

### L1: Data

The tool returns structured facts. The LLM interprets them and decides what to do.

```
Tool returns: { "checkboxes": 3, "file_paths": 2, "code_blocks": 1 }
LLM does: reads the signals, makes a judgment call
```

### L2: Classification

The tool scores signals and classifies. It returns a complexity level. The skill branches on it.

```
Tool returns: { "complexity": "standard", "score": 6 }
LLM does: reads the complexity, follows the matching branch
```

### L3: Instructions

The tool scores, classifies, and builds the complete procedure. The LLM follows it verbatim.

```
Tool returns: { "complexity": "standard", "instructions": "## Step 1: Read the issue..." }
LLM does: TOOL decides everything. LLM executes verbatim. Zero branching.
```

At Level 3, the tool becomes a prompt factory — it generates the exact procedure the LLM should follow based on deterministic analysis. The LLM just executes. All branching logic lives in code you can test and debug.

This inverts the usual tool-use pattern. Instead of the LLM using tools to help with its plan, the tool builds the plan and the LLM carries it out.

I built kael.factory, a plugin generator for Claude Code, using exactly these patterns. Every decision in the generation pipeline runs on deterministic tools orchestrated by skills.

## Who

I'm Juan Gipponi. CTO at a tech agency, where I lead a dev team and integrate AI into how we actually work. Everything on this site is what I use in production.

[LinkedIn](https://www.linkedin.com/in/juan-gipponi)

## Pattern Catalogue

- **[Deterministic Tools](patterns/deterministic-tools.md)** — How to build CLI tools that do deterministic work and output JSON. The tool contract, the output spectrum, and progressive examples.
- **[Skill Orchestration](patterns/skill-orchestration.md)** — How to write SKILL.md files that consume tool output. The LLM as executor, chaining tools, guards, and the verbatim execution principle.

## When to Go Code-First

Not everything belongs in code.

| Move to code | Keep in LLM |
|---|---|
| Computational logic | Needs judgment or creativity |
| 3+ divergent paths | Ambiguous input |
| Deterministic output | Conversational context |
| Silent failures are costly | Multi-source synthesis |

Most real agents are a mix. The goal isn't to remove the LLM. It's to stop wasting it on work that doesn't need intelligence.

---

Everything here is open source. Grab it, break it, adapt it: [code-first-agents on GitHub](https://github.com/beogip/code-first-agents)

If you're building agents and want to talk about this stuff, I'm on [LinkedIn](https://www.linkedin.com/in/juan-gipponi).
