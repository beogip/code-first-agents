# Contributing to Code-First Agents

Thanks for your interest. Here's how to get involved.

## Proposing a new pattern

Open an issue with:

- **Name**: A short, descriptive name (e.g., "Code-First Validation")
- **Problem**: What problem does this pattern solve?
- **Solution**: How does the pattern solve it?
- **Example**: A brief code sketch showing the pattern in action

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
- Include a top-of-file docstring explaining which level of the spectrum it demonstrates (Data / Classification / Instructions)
- Add a `main` section that runs a realistic example

## General guidelines

- All content in **English**
- Keep examples concise and focused on the pattern
- One file per tool
- Test before submitting: `bun examples/tools/your-tool.ts --arg value`
- Follow the existing tone: direct, confident, no AI-speak
