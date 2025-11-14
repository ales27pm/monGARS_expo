# ✅ Workflows Fixed - Final Summary

## What Changed

- Removed the sprawling set of failing workflows that attempted to commit large
  model binaries.
- Added a dependable CI workflow that restores caches, enforces linting,
  type-checking, and tests on every push and pull request, and publishes
  downloadable logs when failures occur.
- Introduced a manual EAS build workflow with explicit secret validation (now
  including Hugging Face tokens), optional model downloads with caching,
  artifact uploads, and optional App Store submission.
- Centralised Hugging Face downloads in `scripts/download_models.py` so both CI
  and local developers share the same logic.

## Current Workflow Line-up

| Workflow               | Purpose                                                               | Trigger                       |
| ---------------------- | --------------------------------------------------------------------- | ----------------------------- |
| `ci.yml`               | Lint, type-check, and test via Bun with caching and log artifacts     | Push to `main`, pull requests |
| `manual-eas-build.yml` | Manual EAS build for iOS/Android with caching and optional submission | Manual (`workflow_dispatch`)  |

## Running the Manual Build

1. Set the `EXPO_TOKEN` repository secret. Add `APPLE_ID` and
   `APPLE_APP_SPECIFIC_PASSWORD` if you want automatic submission.
2. Open **Actions → Manual EAS Build → Run workflow**.
3. Select the platform, build profile, optional release channel, and models to
   download (or `none`). Configure `HUGGINGFACE_TOKEN` if you need
   authenticated downloads.
4. Watch the build. Logs are uploaded automatically on failure.
5. If `submit_to_store` was enabled for iOS and Apple credentials were provided,
   the workflow submits the latest build via `eas submit`.

## Local Helper

Download models locally with the same helper used by the workflow:

```bash
python scripts/download_models.py --models "qwen2-0.5b"
```

Add `--skip-existing` to avoid fetching files you already have. Use `--list` to
see supported identifiers or pass a Hugging Face token with `--token` (or via
`HUGGINGFACE_TOKEN`) when private models are required.
