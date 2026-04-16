#!/usr/bin/env node
/**
 * post-dev-commit.mjs — post the most recent commit on main to the dev Discord channel.
 *
 * Fires from .github/workflows/dev-notes.yml on push to main. Keeps the dev
 * channel aware of what's landing between tagged releases without the
 * ceremony of the polished release notes. One commit = one short message.
 *
 * Env:
 *   DISCORD_WEBHOOK_URL — required; dev channel webhook
 */

import { execSync } from "node:child_process";

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
if (!webhookUrl) {
  console.warn("DISCORD_WEBHOOK_URL not set — dev commit not posted.");
  process.exit(0);
}

const subject = execSync('git log -1 --pretty=format:"%s"', {
  encoding: "utf8",
}).trim();
const author = execSync('git log -1 --pretty=format:"%an"', {
  encoding: "utf8",
}).trim();
const sha = execSync("git rev-parse --short HEAD", {
  encoding: "utf8",
}).trim();
const repo = process.env.GITHUB_REPOSITORY ?? "protoLabsAI/rabbit-hole.io";

// Skip release-bump bot commits — they'd spam the channel every publish cycle.
const NOISE =
  /^(chore: release|chore\(release\)|chore: version packages|Merge |promote:)/i;
if (NOISE.test(subject)) {
  console.log(`Skipping noise commit: ${subject}`);
  process.exit(0);
}

const embed = {
  description: `**${subject}**\n${author} • [\`${sha}\`](https://github.com/${repo}/commit/${sha})`,
  color: 0x44546f,
  timestamp: new Date().toISOString(),
  footer: { text: "rabbit-hole.io · main" },
};

const resp = await fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ embeds: [embed] }),
});

if (!resp.ok) {
  console.error(`Discord post failed (${resp.status}): ${await resp.text()}`);
  process.exit(1);
}

console.log(`Posted dev commit ${sha} to Discord.`);
