#!/usr/bin/env python3
"""Utility to select the most likely application scheme from xcodebuild output."""

from __future__ import annotations

import argparse
import json
import sys
from typing import Iterable, Sequence

EXACT_EXCLUDES = {"Yoga", "fmt"}
PREFIX_EXCLUDES: Sequence[str] = (
    "Pods-",
    "boost",
    "React",
    "RN",
    "Expo",
    "EX",
    "RCT",
    "glog",
    "hermes",
    "libavif",
    "libdav1d",
    "libwebp",
    "lottie",
    "SDWebImage",
    "SocketRocket",
    "fast_float",
    "FBLazyVector",
    "Galeria",
    "ComputableLayout",
    "ContextMenu",
    "DGSwiftUtilities",
    "DoubleConversion",
    "EASClient",
    "llama-rn",
)
CONTAINS_EXCLUDES: Sequence[str] = (
    "react-native",
    "ReactAppDependency",
    "ReactCodegen",
    "ReactCommon",
)


def _choose_scheme(schemes: Sequence[str], candidate: str) -> str:
    if candidate and candidate in schemes:
        return candidate

    filtered: list[str] = []
    for scheme in schemes:
        if scheme in EXACT_EXCLUDES:
            continue
        if any(scheme.startswith(prefix) for prefix in PREFIX_EXCLUDES):
            continue
        if any(token in scheme for token in CONTAINS_EXCLUDES):
            continue
        filtered.append(scheme)

    return filtered[0] if filtered else ""


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Choose a buildable Xcode scheme")
    parser.add_argument(
        "--candidate",
        default="",
        help="Preferred scheme name to select when present",
    )
    args = parser.parse_args(argv)

    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive guard
        print(f"Failed to parse xcodebuild output: {exc}", file=sys.stderr)
        return 1

    container = data.get("workspace") or data.get("project") or {}
    schemes = list(container.get("schemes") or [])

    if schemes:
        print("Available schemes: {}".format(", ".join(schemes)), file=sys.stderr)
    else:
        print("Available schemes: (none)", file=sys.stderr)

    selection = _choose_scheme(schemes, args.candidate)
    if not selection:
        return 1

    print(selection)
    return 0


if __name__ == "__main__":
    sys.exit(main())
