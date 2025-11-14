# Complete GitHub Workflows Guide

The workflow catalogue has been simplified to two supported pipelines: a
continuous integration check and a manual release builder. This guide covers the
full lifecycle.

## 1. Continuous Integration (`ci.yml`)

### Trigger

- Automatic on every push to `main` and on all pull requests.

### What it does

1. Checks out the repository (with depth 0 for richer metadata).
2. Installs Node 20 and Bun, restoring Bun and dependency caches.
3. Runs `bun install --frozen-lockfile`.
4. Executes linting, type-checking, and Jest tests serially while teeing output
   to log files that are uploaded on failure.
5. Publishes a run summary showing the pass/fail state of each gate.

### Troubleshooting

- **Lint/type errors:** fix the issues locally and push a new commit. The
  workflow summary links to downloaded logs if you need more context.
- **Jest failures:** run `bun run test -- --watch` locally to replicate or grab
  the `ci-logs` artifact for the exact CI output.

## 2. Manual EAS Build (`manual-eas-build.yml`)

### Trigger

- Launch from the GitHub Actions tab using “Run workflow”.

### Inputs

| Name              | Description                                       | Default      |
| ----------------- | ------------------------------------------------- | ------------ |
| `platform`        | Target platform (`ios` or `android`)              | `ios`        |
| `profile`         | EAS build profile                                 | `production` |
| `release_channel` | Optional release channel for OTA updates          | _blank_      |
| `models`          | Comma separated model identifiers or `all`/`none` | `none`       |
| `submit_to_store` | Submit the resulting iOS build via `eas submit`   | `false`      |

### Required secrets

- `EXPO_TOKEN` — required for all builds.
- `APPLE_ID` and `APPLE_APP_SPECIFIC_PASSWORD` — only needed when `submit_to_store`
  is `true`.
- `HUGGINGFACE_TOKEN` — optional, enables authenticated model downloads and is
  noted in the run summary if present.

### Execution steps

1. **Preflight check** — validates secrets and stops early with a summary if
   anything is missing, also noting whether a Hugging Face token is configured.
2. **Install tooling** — Node 20, Bun (with restored cache), and optional Python
   tooling plus cached Hugging Face models when applicable.
3. **Model download (optional)** — runs `python scripts/download_models.py` to
   fetch GGUF files into `assets/models/`. Files remain on the runner and are not
   committed to git. The helper now honours `HUGGINGFACE_TOKEN`/`HF_TOKEN` env
   variables automatically.
4. **Expo authentication** — configures `expo/expo-github-action` with the
   supplied token.
5. **EAS build** — executes `eas build --wait` with the requested platform and
   profile.
6. **Submission (optional)** — runs `eas submit --platform ios --latest` when
   enabled and credentials are present.
7. **Summary** — records a concise report in the run summary, including whether
   submission occurred and if a Hugging Face token was present.

### Failure recovery

- Inspect the `eas-build-debug` artifact for logs.
- Re-run the workflow with `models` set to `--skip-existing` locally if repeated
  downloads cause rate limits, or configure `HUGGINGFACE_TOKEN` for higher API
  limits.

## Local model downloads

Use the shared helper to download models outside CI:

```bash
python scripts/download_models.py --models "qwen2-0.5b"
```

To download multiple models or skip existing files:

```bash
python scripts/download_models.py --models "qwen2-0.5b,phi-3-mini" --skip-existing
```

Run `python scripts/download_models.py --list` to inspect available identifiers
or pass `--token $HUGGINGFACE_TOKEN` when authenticated access is required.

## Migration Notes

- All previous workflows that attempted to commit large binaries have been
  removed. Model assets should now live outside the repository and only be
  downloaded when needed.
- If you still require a bespoke workflow, copy the pattern from
  `manual-eas-build.yml` to ensure preflight validation and local-only assets.
