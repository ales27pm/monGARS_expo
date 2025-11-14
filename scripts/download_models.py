#!/usr/bin/env python3
"""Download LLAMA-compatible models for local builds and workflows."""

from __future__ import annotations

import argparse
import sys
import os
from pathlib import Path
from textwrap import indent

try:
    from huggingface_hub import hf_hub_download
except ImportError as exc:  # pragma: no cover - validated at runtime in CI
    raise SystemExit(
        "huggingface-hub must be installed before running this script"
    ) from exc

MODELS = {
    "qwen2-0.5b": {
        "repo_id": "Qwen/Qwen2-0.5B-Instruct-GGUF",
        "filename": "qwen2-0_5b-instruct-q4_k_m.gguf",
    },
    "llama-3.2-1b": {
        "repo_id": "ggml-org/Llama-3.2-1B-Instruct-GGUF",
        "filename": "Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    },
    "smollm2-1.7b": {
        "repo_id": "HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF",
        "filename": "smollm2-1.7b-instruct-q4_k_m.gguf",
    },
    "phi-3-mini": {
        "repo_id": "microsoft/Phi-3-mini-4k-instruct-gguf",
        "filename": "Phi-3-mini-4k-instruct-q4.gguf",
    },
}


ENV_TOKENS = ("HUGGINGFACE_TOKEN", "HF_TOKEN")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download GGUF models")
    parser.add_argument(
        "--directory",
        type=Path,
        default=Path("assets/models"),
        help="Destination directory for downloaded models",
    )
    parser.add_argument(
        "--models",
        type=str,
        required=False,
        help="Comma separated model identifiers or the literal 'all'",
    )
    parser.add_argument(
        "--skip-existing",
        action="store_true",
        default=False,
        help="Skip downloads when the destination file already exists",
    )
    parser.add_argument(
        "--token",
        type=str,
        default=None,
        help="Optional Hugging Face token. Defaults to HUGGINGFACE_TOKEN or HF_TOKEN environment variables if present.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        default=False,
        help="List available model identifiers and exit",
    )
    return parser.parse_args(argv)


def normalise_requested_models(value: str) -> list[str]:
    requested = [item.strip().lower() for item in value.split(",") if item.strip()]
    if not requested:
        raise ValueError("no model identifiers provided")
    if "all" in requested:
        return sorted(MODELS.keys())

    unknown = [name for name in requested if name not in MODELS]
    if unknown:
        raise ValueError(f"unknown model identifiers: {', '.join(sorted(set(unknown)))}")

    normalised: list[str] = []
    for item in requested:
        if item not in normalised:
            normalised.append(item)
    return normalised


def describe_file(path: Path) -> str:
    size_mb = path.stat().st_size / (1024 * 1024)
    return f"{path.name} ({size_mb:.2f} MB)"


def download_models(
    destination: Path,
    identifiers: list[str],
    skip_existing: bool,
    token: str | None,
) -> None:
    destination.mkdir(parents=True, exist_ok=True)

    downloaded_files: list[Path] = []

    for identifier in identifiers:
        model_info = MODELS[identifier]
        repo_id = model_info["repo_id"]
        filename = model_info["filename"]
        target = destination / filename

        if skip_existing and target.exists():
            print(f"⚠️  Skipping {describe_file(target)} (already exists)")
            continue

        print(f"⬇️  Downloading {identifier} from {repo_id} → {target}")
        downloaded_path = Path(
            hf_hub_download(
                repo_id=repo_id,
                filename=filename,
                local_dir=str(destination),
                local_dir_use_symlinks=False,
                token=token,
            )
        )
        print(f"✅ Downloaded {describe_file(downloaded_path)}")
        downloaded_files.append(downloaded_path)

    if downloaded_files:
        total_size = sum(path.stat().st_size for path in downloaded_files) / (1024 * 1024)
        joined = "\n".join(
            f"• {describe_file(path)}" for path in downloaded_files
        )
        print(
            "📦 Retrieved "
            f"{len(downloaded_files)} file(s) totalling {total_size:.2f} MB:\n"
            f"{indent(joined, '  ')}"
        )
    else:
        print("ℹ️  No downloads required — all requested files are present.")


def resolve_token(explicit: str | None) -> str | None:
    if explicit:
        return explicit

    for env_var in ENV_TOKENS:
        value = os.getenv(env_var)
        if value:
            print(f"🔐 Using token from ${env_var}")
            return value

    return None


def main(argv: list[str]) -> int:
    args = parse_args(argv)

    if args.list:
        print("Available models:")
        for key in sorted(MODELS.keys()):
            info = MODELS[key]
            print(f"- {key}: {info['repo_id']} → {info['filename']}")
        return 0

    if not args.models:
        print("❌ --models is required unless --list is provided", file=sys.stderr)
        return 1

    try:
        identifiers = normalise_requested_models(args.models)
    except ValueError as error:
        print(f"❌ {error}", file=sys.stderr)
        return 1

    try:
        download_models(
            args.directory,
            identifiers,
            args.skip_existing,
            resolve_token(args.token),
        )
    except KeyboardInterrupt:  # pragma: no cover - respected by CLI callers
        print("🛑 Download cancelled by user", file=sys.stderr)
        return 130
    except Exception as error:  # pragma: no cover - propagated to CI log
        print(f"❌ Failed to download models: {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
