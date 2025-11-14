# Repository Agent Instructions

> **Auto-generated.** Run `npm run update:agents` after changing automation, documentation, or project guardrails so this file stays accurate.

## Global conventions

- Keep changes production ready: prefer type-safe patterns, thoughtful logging, and clear error paths on every platform.
- Coordinate scripts and documentation: when automation changes, refresh the guides so contributors never see stale advice.
- Respect existing tooling pipelines. When in doubt, run the commands in the _Tooling quick reference_ before pushing.

## Shell automation (root `*.sh`, `scripts/*.sh`)

- Begin scripts with `set -euo pipefail` and `IFS=$'\n\t'` to ensure predictable execution.
- Keep scripts idempotent and branch-aware; log fallbacks (like default branches or remote rewrites) before applying them.
- Guard any destructive git action (rebases, force pushes) with `--force-with-lease` and informative output so users can recover.

## Node + TypeScript automation (`scripts/`)

- Write modern ESM modules with top-level `await`-safe patterns and strong typing when using TypeScript.
- Fail fast with descriptive errors; prefer throwing with context over silent exits so CI can diagnose regressions.
- Reuse shared utilities (logging, fs helpers) when touching automation—duplicate logic makes the regeneration scripts harder to trust.

## React Native app code (`App.tsx`, `src/`)

- Keep components platform-aware: use `Platform.OS` guards for iOS/Android specific behaviour and fall back gracefully on web.
- Stick to the repository's Expo + TypeScript stack (React Navigation, Zustand, NativeWind) and respect existing patterns (hooks, slices).
- Provide thorough error boundaries and logging; network diagnostics modules must degrade safely when permissions or APIs are missing.

## Documentation (root `*.md`, `docs/`)

- Keep guidance aligned with the current automation scripts and Expo workflows—remove or update stale steps immediately.
- Cross-link related guides (build fixes, deployment playbooks) so contributors can find the canonical instructions quickly.
- Capture platform nuances (Xcode provisioning, Android keystores, sideloading) with reproducible steps verified on current toolchains.

## Tooling quick reference

- **Format**: `npx prettier --write`
- **Lint**: `npm run lint`
- **Typecheck**: `npm run typecheck`
- **Test**: `npm test`
- **Refresh this guide**: `npm run update:agents`
