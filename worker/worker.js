const ORIGIN = "https://beogip.github.io/code-first-agents";

const MD_MAP = {
  "/": "/index.md",
  "/index.html": "/index.md",
  "/patterns/deterministic-tools.html": "/patterns/deterministic-tools.md",
  "/patterns/skill-orchestration.html": "/patterns/skill-orchestration.md",
};

const LINK_HEADERS = {
  "/": [
    '</llms.txt>; rel="describedby"; type="text/plain"; title="LLM content index"',
    '</llms-full.txt>; rel="describedby"; type="text/plain"; title="Full site content for LLMs"',
    '</index.md>; rel="alternate"; type="text/markdown"',
    '</.well-known/agent-skills/index.json>; rel="agent-skills"',
  ],
  "/index.html": [
    '</llms.txt>; rel="describedby"; type="text/plain"; title="LLM content index"',
    '</llms-full.txt>; rel="describedby"; type="text/plain"; title="Full site content for LLMs"',
    '</index.md>; rel="alternate"; type="text/markdown"',
    '</.well-known/agent-skills/index.json>; rel="agent-skills"',
  ],
  "/patterns/deterministic-tools.html": [
    '</llms.txt>; rel="describedby"; type="text/plain"; title="LLM content index"',
    '</patterns/deterministic-tools.md>; rel="alternate"; type="text/markdown"',
  ],
  "/patterns/skill-orchestration.html": [
    '</llms.txt>; rel="describedby"; type="text/plain"; title="LLM content index"',
    '</patterns/skill-orchestration.md>; rel="alternate"; type="text/markdown"',
  ],
};

function wantsMarkdown(request) {
  const accept = request.headers.get("Accept") || "";
  if (!accept.includes("text/markdown")) return false;
  if (!accept.includes("text/html")) return true;

  const types = accept.split(",").map((t) => {
    const [media, ...params] = t.trim().split(";");
    const q = params
      .map((p) => p.trim())
      .find((p) => p.startsWith("q="));
    return { media: media.trim(), q: q ? parseFloat(q.split("=")[1]) : 1.0 };
  });

  const mdQ =
    types.find((t) => t.media === "text/markdown")?.q ?? 0;
  const htmlQ =
    types.find((t) => t.media === "text/html")?.q ?? 0;

  return mdQ > htmlQ;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let pathname = url.pathname;

    if (pathname.endsWith("/") && pathname !== "/") {
      pathname = pathname.slice(0, -1);
    }

    if (pathname.startsWith("/worker")) {
      return new Response("Not Found", { status: 404 });
    }

    if (wantsMarkdown(request)) {
      const mdPath = MD_MAP[pathname];
      if (mdPath) {
        const mdResponse = await fetch(ORIGIN + mdPath);
        if (mdResponse.ok) {
          const body = await mdResponse.text();
          return new Response(body, {
            status: 200,
            headers: {
              "Content-Type": "text/markdown; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=3600",
              "Vary": "Accept",
            },
          });
        }
      }
    }

    const originUrl = ORIGIN + pathname + url.search;
    const originResponse = await fetch(originUrl, {
      method: request.method,
      headers: request.headers,
    });

    const response = new Response(originResponse.body, originResponse);

    response.headers.set("Vary", "Accept");

    const links = LINK_HEADERS[pathname];
    if (links) {
      const existing = response.headers.get("Link");
      const all = existing ? [existing, ...links] : links;
      response.headers.set("Link", all.join(", "));
    }

    return response;
  },
};
