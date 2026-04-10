# Code-First Agents — Site

This branch (`gh-pages`) hosts the live site for **Code-First Agents**, a set of design patterns for building reliable AI agents by moving deterministic work from the LLM to code.

**Live site:** https://beogip.github.io/code-first-agents/

## Looking for the code?

Examples, tools, and skills live in the [`main` branch](https://github.com/beogip/code-first-agents/tree/main).

## Branch layout

| File / folder | What it is |
|---|---|
| `index.html` | Landing page |
| `index.md` | Markdown mirror of the landing for LLMs |
| `patterns/*.html` | Pattern pages (Deterministic Tools, Skill Orchestration) |
| `patterns/*.md` | Markdown mirrors of the pattern pages |
| `assets/style.css` | Site styles |
| `assets/website-copy.md` | Source-of-truth copy for all pages. Edit here first, then sync HTML + .md mirrors. |
| `llms.txt` | Index for LLMs ([standard](https://llmstxt.org)) |
| `.nojekyll` | Tell GitHub Pages not to process with Jekyll |

## Editing the site

1. Edit `assets/website-copy.md` (source of truth)
2. Sync the corresponding `index.html` / `patterns/*.html`
3. Sync the corresponding `index.md` / `patterns/*.md`
4. Commit and push — GitHub Pages rebuilds automatically

## License

[MIT](LICENSE)
