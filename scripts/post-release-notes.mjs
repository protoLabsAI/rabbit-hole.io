#!/usr/bin/env node
/**
 * post-release-notes.mjs — Rewrite commits with Claude and post to Discord.
 *
 * Fires from .github/workflows/release-notes.yml on a v*.*.* tag push. Reads
 * commits between the previous tag and the new tag, asks Claude Haiku to
 * group and polish them, and posts the result to the rabbit-hole.io Discord
 * release channel via webhook.
 *
 * Usage:
 *   node scripts/post-release-notes.mjs [--from <ref>] [--to <ref>] [--title <string>]
 *
 * Env:
 *   ANTHROPIC_API_KEY   — required; Claude Haiku polishes the commit log
 *   DISCORD_WEBHOOK_URL — required; release channel webhook
 */

import { execSync } from "node:child_process";
import { parseArgs } from "node:util";

// ── Args ──────────────────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    from: { type: "string" },
    to: { type: "string", default: "HEAD" },
    title: { type: "string" },
  },
});

const to = values.to || "HEAD";

// ── Commits ───────────────────────────────────────────────────────────────────

let from = values.from;
if (!from) {
  try {
    from = execSync("git describe --tags --abbrev=0 HEAD^", {
      encoding: "utf8",
    }).trim();
    console.log(`Auto-detected range: ${from}..${to}`);
  } catch {
    // First release — no prior tag. Grab a sensible window instead of everything.
    from = execSync("git rev-list --max-count=50 HEAD | tail -1", {
      encoding: "utf8",
    }).trim();
    console.log("No previous tag — using last 50 commits");
  }
}

const rawLog = execSync(
  `git log ${from}..${to} --pretty=format:"%s" --no-merges`,
  { encoding: "utf8" },
).trim();

// Commit-message shapes we never want to surface in release notes.
const NOISE =
  /^(chore: release|chore\(release\)|chore: version packages|Merge |promote:|docs: session handoff|Co-Authored)/i;

const commits = rawLog
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !NOISE.test(l));

if (commits.length === 0) {
  console.log("No notable commits in range — nothing to post.");
  process.exit(0);
}

console.log(`${commits.length} commits to summarise.`);

// ── Version / title ───────────────────────────────────────────────────────────

let version = values.title;
if (!version) {
  try {
    version = execSync("git describe --tags", { encoding: "utf8" }).trim();
  } catch {
    version = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
    }).trim();
  }
}

// ── Claude rewrite ────────────────────────────────────────────────────────────

const apiKey = process.env.ANTHROPIC_API_KEY;

let notes;
if (!apiKey) {
  console.warn("ANTHROPIC_API_KEY not set — posting raw commits without rewrite.");
  notes = commits.map((c) => `• ${c}`).join("\n");
} else {
  const SYSTEM_PROMPT = `\
You are writing release notes for rabbit-hole.io — an AI-powered research platform \
built around an agentic Search Engine, an A2A research agent (consumed by the \
protoWorkstacean fleet), a knowledge graph (Neo4j + Qdrant), and a deep-research \
pipeline with streaming reports.

Given raw git commit subjects, rewrite them as polished release notes.

Rules:
- Group into 2–4 themed sections drawn from: Search Engine, A2A Agent, Knowledge Graph, Research Pipeline, Atlas, Infrastructure, Bug Fixes
- Each item is one sentence, present tense, outcome-focused (what it enables, not what changed)
- Skip purely internal housekeeping (fixture edits, comment typos, test data only, package renames)
- Use • for bullets. Use **Section Title** for headers. No emojis.
- Max 280 words. Plain markdown only — no code blocks, no headers with ##.`;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: commits.join("\n") }],
    }),
  });

  if (!resp.ok) {
    console.error(`Claude API error: ${resp.status}`, await resp.text());
    process.exit(1);
  }

  const data = await resp.json();
  notes = data.content?.[0]?.text ?? commits.map((c) => `• ${c}`).join("\n");
}

if (notes.length > 3900) notes = notes.slice(0, 3897) + "…";

// ── Discord post ──────────────────────────────────────────────────────────────

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
if (!webhookUrl) {
  console.log(
    "DISCORD_WEBHOOK_URL not set — release notes preview:\n\n" + notes,
  );
  process.exit(0);
}

const embed = {
  title: `rabbit-hole.io ${version}`,
  description: notes,
  // prod-environment theme accent — soft slate
  color: 0x44546f,
  timestamp: new Date().toISOString(),
  footer: { text: "rabbit-hole.io" },
};

const discordResp = await fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ embeds: [embed] }),
});

if (!discordResp.ok) {
  console.error(
    `Discord post failed (${discordResp.status}): ${await discordResp.text()}`,
  );
  process.exit(1);
}

console.log(`Posted release notes for ${version} to Discord.`);
