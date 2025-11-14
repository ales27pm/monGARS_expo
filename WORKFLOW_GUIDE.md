# GitHub Actions Workflow Guide

This repository now ships with two maintained workflows:

1. **CI (`.github/workflows/ci.yml`)** — runs automatically on pushes and pull
   requests. It installs dependencies with Bun, restores caches, and runs
   linting, type-checking, and Jest with rich summaries and log artifacts.
2. **Manual EAS Build (`.github/workflows/manual-eas-build.yml`)** — triggered
   from the Actions tab when you need a release build. It verifies secrets,
   optionally downloads Hugging Face models, and performs the EAS build. iOS
   builds can be submitted directly to App Store Connect once credentials are
   configured.

## 1. Continuous Integration (CI)

- **Trigger:** `push` to `main`, any `pull_request`.
- **Runner:** `ubuntu-latest`.
- **Key upgrades:**
  - Concurrency control cancels superseded runs automatically.
  - Bun and `node_modules` caches accelerate repeat installs.
  - Lint, type-check, and Jest run with `tee` so logs are preserved even on
    failure.
  - A final summary posts pass/fail status for each check to the workflow
    summary and fails the job if any gate breaks.
  - When any gate fails, the captured logs are uploaded as an artifact for easy
    download.
- **Secrets:** none required.
- **Failure handling:** even when one of the quality gates fails the workflow
  continues long enough to upload logs and produce a human-readable summary,
  then exits non-zero so the PR status reflects the failure.

## 2. Manual EAS Build

- **Trigger:** `workflow_dispatch` (run it manually from the Actions tab).
- **Inputs:**
  - `platform`: `ios` or `android` (default `ios`).
  - `profile`: EAS profile to use (default `production`).
  - `release_channel`: optional release channel name.
  - `models`: comma separated list of model IDs (`qwen2-0.5b`,
    `llama-3.2-1b`, `smollm2-1.7b`, `phi-3-mini`, `all`, or `none`).
  - `submit_to_store`: boolean to submit the latest iOS build with `eas submit`.
- **Optional secrets:**
  - `HUGGINGFACE_TOKEN` — enables authenticated model downloads when private or
    rate-limited models are required. Anonymous downloads still work for public
    models, but the workflow now surfaces whether the token was provided in the
    preflight summary.
- **Secrets:**
  - `EXPO_TOKEN` (required for any build).
  - `APPLE_ID` and `APPLE_APP_SPECIFIC_PASSWORD` (only if submitting to the App
    Store).
- **Flow:**
  1. **Preflight validation** — checks secrets and prints a summary before any
     expensive work. Missing values cause the workflow to stop immediately.
  2. **Dependencies** — restores Bun and Hugging Face caches, installs
     JavaScript dependencies, and bootstraps Python with `huggingface-hub` when
     models are requested.
  3. **Model download (optional)** — runs `python scripts/download_models.py`
     with `--skip-existing`. The script now reads Hugging Face tokens from the
     `HUGGINGFACE_TOKEN`/`HF_TOKEN` environment variables automatically.
  4. **EAS build** — calls `eas build --wait` for the specified platform and
     profile.
  5. **Submission (optional)** — runs `eas submit --latest` for iOS when
     `submit_to_store` is enabled and credentials are present.
  6. **Summary** — writes a concise report to the workflow summary tab,
     including whether a Hugging Face token was supplied.

### Downloading Models Locally

The workflow uses `scripts/download_models.py`. You can reuse the same helper
locally:

```bash
python scripts/download_models.py --models "qwen2-0.5b"
```

Provide multiple models with commas:

```bash
python scripts/download_models.py --models "qwen2-0.5b,phi-3-mini"
```

Use `--skip-existing` to avoid re-downloading files that already exist. You can
also pass `--token` or rely on `HUGGINGFACE_TOKEN`/`HF_TOKEN` environment
variables, and `--list` to print the catalogue without downloading anything.

### Troubleshooting

- **Missing secrets:** The preflight job will fail fast and note missing values
  in the run summary.
- **Hugging Face rate limits:** Use `--skip-existing` when rerunning builds to
  reduce unnecessary downloads.
- **Expo CLI errors:** Check the uploaded `eas-build-debug` artifact for logs if
  the build fails.

With these workflows you get reliable CI on every change and a predictable path
for manual releases without brittle git pushes from automation.
