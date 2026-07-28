# Contributing to Code-First Agents

Thanks for your interest. Here's how to get involved.

## Proposing a new pattern

Open an issue with:

- **Name**: A short, descriptive name (e.g., "Code-First Validation")
- **Problem**: What problem does this pattern solve?
- **Solution**: How does the pattern solve it?
- **Example**: A brief code sketch showing the pattern in action

## Proposing a heuristic

Heuristics are smaller than patterns. A heuristic is a detection rule for a specific anti-pattern shape that scanners can flag in skills and tools. Each heuristic lives in `specs/anti-patterns/` as its own markdown file.

To propose one:

1. Copy `specs/anti-patterns/_template.md` to `specs/anti-patterns/<your-slug>.md`. The slug is snake_case and matches the filename.
2. Fill in every section of the template. Delete the ones that do not apply (see the notes inside the template).
3. Set the frontmatter `status:` field to `proposed`. Set `origin:` to `retroactive` if the heuristic already exists in a scanner and the proposal validates its shape, or `new-proposal` if there is no code yet.
4. Open a PR against `main`.

The pattern owner reviews the proposal and sets the frontmatter `status:` field to one of:

- `accepted`, the heuristic is part of the spec and scanners can implement it.
- `rejected`, the heuristic is not accepted. The owner adds a "Rejection rationale" section inside the file explaining why. The file stays in the directory as a record.
- `local-only`, the heuristic is useful in a specific codebase but does not belong in the abstract spec. Scanners can still implement it, but the spec does not cover it.
- `revised`, the heuristic needs changes before a final decision. The owner leaves comments on the PR. The author revises and the review continues.

`specs/anti-patterns/README.md` groups all proposals by status. Keep it in sync when adding a new file.

Do not write scanner code for a new heuristic before the PR is accepted. The review is the gate.

## Pattern structure

Every pattern page follows this structure:

1. **Problem**: The specific reliability or cost issue this addresses
2. **Solution**: The core idea in 2-3 sentences
3. **How it works**: Step-by-step explanation
4. **When to use**: Concrete scenarios where this pattern fits
5. **When not to use**: Scenarios where the LLM should decide instead
6. **Trade-offs**: What you gain and what you give up
7. **Example**: Working code with commentary

## Adding examples

- Examples are standalone TypeScript files that run with [Bun](https://bun.sh)
- No external dependencies — use `parseArgs` from Node's `util` for CLI args
- Each tool should follow the standard contract: named CLI parameters → JSON to stdout
- Include a top-of-file docstring explaining which tool type it demonstrates (Data / Classification / Procedure)
- Add a `main` section that runs a realistic example

## General guidelines

- All content in **English**
- Keep examples concise and focused on the pattern
- One file per tool
- Test before submitting: `bun examples/tools/your-tool.ts --arg value`
- Follow the existing tone: direct, confident, no AI-speak
