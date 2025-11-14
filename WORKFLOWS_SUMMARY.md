# ✅ Workflow Summary

The GitHub Actions configuration has been rebuilt to prioritise reliability and
clarity.

## 🚦 Active Workflows

### 1. Continuous Integration (`ci.yml`)

- Triggered on pushes to `main` and all pull requests.
- Restores Bun and dependency caches before installing dependencies.
- Runs linting, TypeScript checks, and Jest tests sequentially while teeing
  output to log files that are uploaded if anything fails.
- Always publishes a consolidated summary before marking the job as failed when
  any gate reports a hard error, so contributors can read the results even on
  red runs.
- Requires no secrets, cancels superseded runs automatically, and writes a
  detailed summary covering each gate.

### 2. Manual EAS Build (`manual-eas-build.yml`)

- Triggered manually from the Actions tab.
- Performs a preflight check for required secrets (including optional
  `HUGGINGFACE_TOKEN`) and stops early if anything is missing.
- Restores Bun and Hugging Face caches, then optionally downloads models into
  `assets/models/` using the shared helper with `--skip-existing`.
- Runs `eas build --wait` for iOS or Android and can submit iOS builds to App
  Store Connect when Apple credentials are configured.
- Uploads logs as artifacts to simplify debugging and notes Hugging Face token
  usage in the run summary.

## 🧰 Shared Utilities

- `scripts/download_models.py` centralises all Hugging Face downloads and can be
  reused locally with `python scripts/download_models.py --models qwen2-0.5b`.
  Use `--list`, `--skip-existing`, and `--token`/`HUGGINGFACE_TOKEN` to fine-tune
  behaviour.

## 🗑️ Removed Workflows

The previous collection of 15+ workflows has been retired. They attempted to
commit large model files back to the repository and routinely failed due to
GitHub's 100 MB file limit or missing secrets. The new setup keeps model files
within the runner and avoids brittle git pushes.

## 📋 Next Steps for Contributors

1. Ensure the `EXPO_TOKEN` secret is configured (and Apple credentials if you
   plan to enable automatic submissions).
2. Watch the CI workflow on pull requests to keep the main branch green.
3. Use the Manual EAS Build workflow whenever you need a fresh release build.
