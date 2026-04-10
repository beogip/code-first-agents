#!/usr/bin/env bun
/**
 * classify-issue.ts
 *
 * Level 2 (Classification): Fetches a GitHub issue, scores its structural
 * signals, and returns a complexity classification. The LLM reads the
 * classification and branches its behavior accordingly.
 *
 * Usage:
 *   bun examples/tools/classify-issue.ts --owner acme --repo app --issue 42
 *
 * Output:
 *   { "complexity": "lean", "score": 8, "signals": { ... } }
 */

import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    owner: { type: "string" },
    repo: { type: "string" },
    issue: { type: "string" },
  },
});

if (!values.owner || !values.repo || !values.issue) {
  console.error("Usage: classify-issue.ts --owner <owner> --repo <repo> --issue <number>");
  process.exit(1);
}

const headers: Record<string, string> = {};
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

const res = await fetch(
  `https://api.github.com/repos/${values.owner}/${values.repo}/issues/${values.issue}`,
  { headers },
);

if (!res.ok) {
  console.error(`GitHub API error: ${res.status} ${res.statusText}`);
  process.exit(1);
}

const { body = "", title = "" } = await res.json();
const text = `${title} ${body}`;

const signals = {
  checkboxes: (body.match(/- \[[ x]\]/g) ?? []).length,
  file_paths: (text.match(/[\w./]+\.\w{1,4}/g) ?? []).length,
  code_blocks: Math.floor((body.match(/```/g) ?? []).length / 2),
  acceptance_criteria: /acceptance|criteria|must|should/i.test(body),
  word_count: body.split(/\s+/).filter(Boolean).length,
};

let score = 0;
if (signals.checkboxes >= 2) score += 3;
if (signals.acceptance_criteria) score += 2;
if (signals.file_paths >= 1) score += 2;
if (signals.code_blocks >= 1) score += 1;
if (signals.word_count >= 200) score += 1;

const complexity = score >= 7 ? "lean" : score >= 4 ? "standard" : "full";

console.log(JSON.stringify({ complexity, score, signals }, null, 2));
