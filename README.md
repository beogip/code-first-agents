# Code-First Agents

**Design patterns for building reliable AI agents by moving deterministic work from the LLM to code.**

Your agent works. Until it doesn't. And you can't tell why.

The LLM picks the wrong branch. It skips a step. It hallucinates a field name. You can't write a test for any of it because the decision happened inside a black box.

Code-First Agents is a set of patterns for moving decision-making out of the LLM and into deterministic code. The LLM orchestrates. Code executes. The more you push into code, the less you depend on probabilistic output for things that should be deterministic.

## Patterns

| Pattern | Description |
|---------|-------------|
| [Deterministic Tools](https://beogip.github.io/code-first-agents/patterns/deterministic-tools.html) | How to build CLI tools that do deterministic work and output JSON. The tool contract, the output spectrum, and progressive examples. |
| [Skill Orchestration](https://beogip.github.io/code-first-agents/patterns/skill-orchestration.html) | How to write SKILL.md files that consume tool output. The LLM as executor, chaining tools, guards, and the verbatim execution principle. |

For the formal specification of both patterns, including the contract, trade-offs, reference implementations, and evolution history, see [`specs/code-first-agents.md`](specs/code-first-agents.md).

## The spectrum

Tools exist on a spectrum based on how much decision-making they absorb from the LLM:

| Tool type | Tool returns | LLM does | Example |
|-------|-------------|----------|---------|
| **Data** | Structured facts | Interprets, decides | [`get-issue-signals.ts`](examples/tools/get-issue-signals.ts) |
| **Classification** | Data + classification | Reads the class, branches | [`classify-issue.ts`](examples/tools/classify-issue.ts) |
| **Procedure** | Literal procedure | Executes verbatim | [`analyze-issue.ts`](examples/tools/analyze-issue.ts) |

A procedure tool becomes a prompt factory. The LLM is a pure executor.

## Examples

The [`examples/`](examples/) directory contains a complete GitHub issue planning workflow that demonstrates the three tool types. All tools run with [Bun](https://bun.sh):

```bash
# Data: raw signals from the issue body
bun examples/tools/get-issue-signals.ts --owner acme --repo app --issue 42

# Classification: deterministic category
bun examples/tools/classify-issue.ts --owner acme --repo app --issue 42

# Procedure: complete planning steps
bun examples/tools/analyze-issue.ts --owner acme --repo app --issue 42
```

See [`examples/skills/plan-issue/SKILL.md`](examples/skills/plan-issue/SKILL.md) for a full skill that orchestrates `analyze-issue.ts` as a procedure tool.

## Specs

- [Code-First Agents Spec](specs/code-first-agents.md): formal specification covering the tool contract, skill orchestration, trade-offs, reference implementations, and evolution history.
- [Anti-Patterns Registry](specs/anti-patterns/): catalog of heuristics for detecting when a skill or tool violates the code-first contract.

## Site

The full documentation lives at **https://beogip.github.io/code-first-agents/**.

The site source (HTML, CSS, markdown mirrors) lives in the [`gh-pages` branch](https://github.com/beogip/code-first-agents/tree/gh-pages). This branch (`main`) holds the example tools, the example skill, and the repo metadata.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on proposing new patterns and adding examples.

## License

[MIT](LICENSE)

## Author

Built by [Juan Gipponi](https://www.linkedin.com/in/juan-gipponi).
