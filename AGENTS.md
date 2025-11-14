# Repository Agent Instructions

This repository includes large automation scripts and extensive documentation. When you make changes:

- **Shell scripts** (`*.sh`)
  - Start scripts with `set -euo pipefail` and `IFS=$'\n\t'` for predictable execution.
  - Prefer idempotent operations (e.g., `git push --force-with-lease` instead of `--force`).
  - Guard remote mutation with clear log messages so users understand when fallbacks are used.
- **Documentation**
  - Keep instructions aligned with the current automation behaviour, especially around branch detection and environment variables.
  - Whenever scripts gain new flags or defaults, document them in the onboarding guides (`GITHUB_SETUP.md`, `PUSH_NOW.md`).

These conventions apply throughout the repository.
