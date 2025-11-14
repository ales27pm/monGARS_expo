#!/usr/bin/env node
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const agentsPath = path.join(repoRoot, "AGENTS.md");
const packageJsonPath = path.join(repoRoot, "package.json");

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function buildToolingSection(commands) {
  const lines = [];
  if (commands.format) {
    lines.push(`- **Format**: \`${commands.format}\``);
  }
  if (commands.lint) {
    lines.push(`- **Lint**: \`${commands.lint}\``);
  }
  if (commands.typecheck) {
    lines.push(`- **Typecheck**: \`${commands.typecheck}\``);
  }
  if (commands.test) {
    lines.push(`- **Test**: \`${commands.test}\``);
  }
  if (commands.updateAgents) {
    lines.push(`- **Refresh this guide**: \`${commands.updateAgents}\``);
  }
  return lines.join("\n");
}

async function loadPrettier() {
  try {
    const imported = await import("prettier");
    return imported.default ?? imported;
  } catch (error) {
    if (error.code !== "ERR_MODULE_NOT_FOUND") {
      throw error;
    }

    console.warn('Prettier not installed locally; falling back to "npx prettier" for formatting.');
    return null;
  }
}

async function formatWithNpx(content) {
  return new Promise((resolve) => {
    const child = spawn("npx", ["prettier", "--stdin-filepath", "AGENTS.md"], {
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "inherit"],
    });

    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.on("error", () => {
      resolve(content);
    });

    child.on("close", (code) => {
      if (code === 0 && output.trim()) {
        resolve(output);
      } else {
        resolve(content);
      }
    });

    child.stdin.end(content);
  });
}

async function buildAgentsContent(pkg, prettier) {
  const scripts = pkg.scripts ?? {};
  const commands = {
    format: "npx prettier --write",
    lint: scripts.lint ? "npm run lint" : null,
    typecheck: scripts.typecheck ? "npm run typecheck" : null,
    test: scripts.test ? "npm test" : null,
    updateAgents: "npm run update:agents",
  };

  const toolingSection = buildToolingSection(commands);

  const content = `# Repository Agent Instructions

> **Auto-generated.** Run \`${commands.updateAgents}\` after changing automation, documentation, or project guardrails so this file stays accurate.

## Global conventions
- Keep changes production ready: prefer type-safe patterns, thoughtful logging, and clear error paths on every platform.
- Coordinate scripts and documentation: when automation changes, refresh the guides so contributors never see stale advice.
- Respect existing tooling pipelines. When in doubt, run the commands in the *Tooling quick reference* before pushing.

## Shell automation (root \`*.sh\`, \`scripts/*.sh\`)
- Begin scripts with \`set -euo pipefail\` and \`IFS=$'\\n\\t'\` to ensure predictable execution.
- Keep scripts idempotent and branch-aware; log fallbacks (like default branches or remote rewrites) before applying them.
- Guard any destructive git action (rebases, force pushes) with \`--force-with-lease\` and informative output so users can recover.

## Node + TypeScript automation (\`scripts/\`)
- Write modern ESM modules with top-level \`await\`-safe patterns and strong typing when using TypeScript.
- Fail fast with descriptive errors; prefer throwing with context over silent exits so CI can diagnose regressions.
- Reuse shared utilities (logging, fs helpers) when touching automation—duplicate logic makes the regeneration scripts harder to trust.

## React Native app code (\`App.tsx\`, \`src/\`)
- Keep components platform-aware: use \`Platform.OS\` guards for iOS/Android specific behaviour and fall back gracefully on web.
- Stick to the repository's Expo + TypeScript stack (React Navigation, Zustand, NativeWind) and respect existing patterns (hooks, slices).
- Provide thorough error boundaries and logging; network diagnostics modules must degrade safely when permissions or APIs are missing.

## Documentation (root \`*.md\`, \`docs/\`)
- Keep guidance aligned with the current automation scripts and Expo workflows—remove or update stale steps immediately.
- Cross-link related guides (build fixes, deployment playbooks) so contributors can find the canonical instructions quickly.
- Capture platform nuances (Xcode provisioning, Android keystores, sideloading) with reproducible steps verified on current toolchains.

## Tooling quick reference
${toolingSection}
`;

  if (prettier) {
    const options = await prettier.resolveConfig(agentsPath).catch(() => ({}));
    const formatted = await prettier.format(content, {
      ...options,
      parser: "markdown",
    });

    return formatted;
  }

  return formatWithNpx(content);
}

async function ensureAgentsUpToDate() {
  const pkg = await readJson(packageJsonPath);
  const prettier = await loadPrettier();
  const nextContent = await buildAgentsContent(pkg, prettier);

  let currentContent = "";
  try {
    currentContent = await fs.readFile(agentsPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  if (currentContent === nextContent) {
    console.log("AGENTS.md is already up to date.");
    return;
  }

  await fs.writeFile(agentsPath, nextContent, "utf8");
  console.log("AGENTS.md has been regenerated.");
}

ensureAgentsUpToDate().catch((error) => {
  console.error("Failed to update AGENTS.md");
  console.error(error);
  process.exitCode = 1;
});
