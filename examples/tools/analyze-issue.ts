#!/usr/bin/env bun
/**
 * analyze-issue.ts
 *
 * Procedure: Fetches a GitHub issue, scores its signals,
 * classifies its complexity, AND returns literal instructions for the LLM
 * to follow verbatim. Here the tool becomes a prompt factory:
 * every decision lives in deterministic code, and the LLM just executes.
 *
 * Usage:
 *   bun examples/tools/analyze-issue.ts --owner acme --repo app --issue 42
 *
 * Output:
 *   { "complexity": "lean", "score": 8, "signals": { ... }, "instructions": "..." }
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
  console.error("Usage: analyze-issue.ts --owner <owner> --repo <repo> --issue <number>");
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

const procedures: Record<string, string> = {
  lean: `## Lean Plan
1. The issue is well-specified. Skip deep analysis.
2. List the files to modify based on the file paths in the issue.
3. Write a 3-5 bullet implementation plan.
4. Start coding immediately.`,

  standard: `## Standard Plan
1. Read the full issue and identify acceptance criteria.
2. Search the codebase for related code.
3. Write a plan covering: files to modify, approach, edge cases.
4. Ask the user to approve the plan before coding.`,

  full: `## Full Plan
1. The issue is underspecified. Gather more context before planning.
2. List what information is missing (acceptance criteria, affected files, scope).
3. Search the codebase for related patterns.
4. Write a detailed plan with alternatives and trade-offs.
5. Ask the user to approve the plan before coding.`,
};

const instructions = procedures[complexity];

console.log(JSON.stringify({ complexity, score, signals, instructions }, null, 2));
