# Code-First Agents -- Site

This branch (`gh-pages`) hosts the live site for **Code-First Agents**, a set of design patterns for building reliable AI agents by moving deterministic work from the LLM to code.

**Live site:** https://code-first-agents.com/

## Looking for the code?

Examples, tools, and skills live in the [`main` branch](https://github.com/beogip/code-first-agents/tree/main).

## Architecture

The site runs on two layers:

```
Browser/Agent request
        |
        v
  Cloudflare Worker          (Link headers, Accept: text/markdown negotiation)
        |
        v
  GitHub Pages (gh-pages)    (static HTML, CSS, markdown, assets)
```

**GitHub Pages** serves the static files: HTML pages, CSS, markdown mirrors, `llms.txt`, `llms-full.txt`, and `/.well-known/` metadata.

**Cloudflare Worker** (`worker/worker.js`) sits in front and adds two capabilities that a static host can't provide:

1. **Link response headers (RFC 8288)**: every response includes `Link` headers pointing agents to `llms.txt`, markdown alternates, and the agent-skills index.
2. **Markdown content negotiation**: requests with `Accept: text/markdown` get the `.md` version of the page with `Content-Type: text/markdown` instead of HTML. Same URL, two representations.

The worker also blocks public access to `/worker/*` so its own source code isn't served as site content.

### Deploying the worker

```bash
cd worker
npx wrangler login    # first time only
npx wrangler deploy
```

## Branch layout

| File / folder | What it is |
|---|---|
| `index.html` | Landing page |
| `index.md` | Markdown mirror of the landing for LLMs |
| `patterns/*.html` | Pattern pages (Deterministic Tools, Skill Orchestration) |
| `patterns/*.md` | Markdown mirrors of the pattern pages |
| `assets/style.css` | Site styles |
| `assets/website-copy.md` | Source-of-truth copy for all pages. Edit here first, then sync HTML + .md mirrors. |
| `llms.txt` | Index for LLMs ([llmstxt.org](https://llmstxt.org)) |
| `llms-full.txt` | Full site content in one markdown file for bulk AI ingestion |
| `robots.txt` | Crawl directives with explicit AI bot entries |
| `sitemap.xml` | Sitemap with HTML and .md URLs |
| `.well-known/agent-skills/` | Agent Skills Discovery index |
| `worker/` | Cloudflare Worker source (blocked from public access) |
| `.nojekyll` | Tell GitHub Pages not to process with Jekyll |

## Agent readiness

| Feature | How |
|---|---|
| `llms.txt` | Static file at `/llms.txt` |
| `llms-full.txt` | Static file at `/llms-full.txt` |
| Markdown negotiation | Worker serves `.md` when `Accept: text/markdown` |
| Link headers (RFC 8288) | Worker adds `Link` headers to every response |
| Agent Skills Discovery | Static `/.well-known/agent-skills/index.json` |
| Schema.org | JSON-LD on every page (WebSite, TechArticle, FAQPage, HowTo, BreadcrumbList) |
| AI crawler access | `robots.txt` explicitly allows GPTBot, ClaudeBot, PerplexityBot, GoogleOther |

## Editing the site

1. Edit `assets/website-copy.md` (source of truth)
2. Sync the corresponding `index.html` / `patterns/*.html`
3. Sync the corresponding `index.md` / `patterns/*.md`
4. Commit and push (GitHub Pages rebuilds automatically)
5. If you changed page paths or added pages, update `worker/worker.js` and redeploy: `cd worker && npx wrangler deploy`

## License

[MIT](LICENSE)
