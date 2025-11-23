# GitHub Actions Workflow Refresh

## Overview

All legacy workflows attempted to commit large Hugging Face models back into the
repository. Those steps routinely failed because GitHub blocks files larger than
100 MB and branch protection prevented automated pushes. The new automation set
replaces that brittle approach with two focused workflows and a reusable
model-downloader script.

## New Workflows

### 1. `ci.yml`

- Runs on every push to `main` and each pull request.
- Restores Bun and dependency caches, then runs linting, type-checking, and
  Jest while teeing output to log files.
- Provides fast feedback without requiring Expo credentials and publishes a
  detailed summary plus artifacts whenever a gate fails.

### 2. `manual-eas-build.yml`

- Manually triggered from the Actions tab.
- Validates secrets up front (including whether an optional Hugging Face token
  is configured) and clearly reports what is missing.
- Restores Bun and Hugging Face caches before installing dependencies to keep
  reruns fast.
- Optionally downloads Hugging Face models into `assets/models/` using
  `scripts/download_models.py` for the duration of the build.
- Executes `eas build` for iOS or Android and, when configured, submits the
  latest iOS build to App Store Connect.
- Uploads logs as artifacts if the build fails to aid debugging.

## Key Fixes

| Problem                                                    | Resolution                                                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Workflows failed while trying to commit >100 MB GGUF files | Model downloads now stay within the runner workspace—no more repository pushes from CI.         |
| Jobs crashed late due to missing Expo/Apple secrets        | A preflight job validates secrets and stops early with a clear summary.                         |
| Hugging Face throttled anonymous downloads                 | Optional `HUGGINGFACE_TOKEN` support and cache restoration reduce re-downloads and rate limits. |
| Quality gates provided little context on failure           | CI now uploads logs and publishes a detailed summary covering lint, typecheck, and tests.       |
| Duplicated shell snippets across many workflow files       | Centralised logic in `scripts/download_models.py` and removed redundant workflows.              |

## Local Usage

You can reuse the downloader locally:

```bash
python scripts/download_models.py --models qwen2-0.5b
```

Add `--skip-existing` to avoid re-downloading files you already have. Use
`--list` to inspect available identifiers or provide a Hugging Face token via
`--token`/`HUGGINGFACE_TOKEN` when you need authenticated access.

## Next Steps

- Set the `EXPO_TOKEN` secret (and Apple credentials if you plan to submit
  builds automatically).
- Trigger **Manual EAS Build** from the Actions tab once secrets are in place.
- Monitor the **CI** workflow to keep the main branch healthy.
