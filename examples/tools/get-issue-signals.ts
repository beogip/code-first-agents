#!/usr/bin/env bun
/**
 * get-issue-signals.ts
 *
 * Data: Fetches a GitHub issue and returns raw structural signals.
 * The LLM interprets the signals and decides what to do.
 *
 * Usage:
 *   bun examples/tools/get-issue-signals.ts --owner acme --repo app --issue 42
 *
 * Output:
 *   { "checkboxes": 5, "file_paths": 3, "code_blocks": 1, "acceptance_criteria": true, "word_count": 450 }
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
  console.error("Usage: get-issue-signals.ts --owner <owner> --repo <repo> --issue <number>");
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

console.log(JSON.stringify(signals, null, 2));
