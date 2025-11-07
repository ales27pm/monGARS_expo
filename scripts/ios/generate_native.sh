#!/usr/bin/env bash
set -euo pipefail

export CI=true
export EXPO_NO_TELEMETRY=1
export EXPO_DO_NOT_TRACK=1
export RCT_NEW_ARCH_ENABLED=1

echo "[1/6] Installing JS deps…"
if [ -f yarn.lock ]; then
  corepack enable || true
  yarn install --frozen-lockfile
else
  npm ci
fi

echo "[2/6] Expo prebuild (ios)…"
npx expo prebuild --platform ios --no-install --clean || npx expo prebuild --platform ios --no-install

echo "[3/6] React Native codegen…"
npx react-native codegen || true

echo "[4/6] CocoaPods install (new arch)…"
( cd ios && pod repo update && RCT_NEW_ARCH_ENABLED=1 pod install --verbose )

echo "[5/6] Quick compile to materialise codegen…"
SCHEME=$(xcodebuild -workspace ios/*.xcworkspace -list -json | python3 - <<'PY'
import json,sys
j=json.load(sys.stdin)
d=j.get("workspace") or j.get("project") or {}
s=d.get("schemes") or []
print(s[0] if s else "")
PY
)
[ -n "$SCHEME" ] || { echo "No scheme detected"; exit 1; }
xcodebuild \
  -workspace ios/*.xcworkspace \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath ios/DerivedData \
  build | xcpretty

echo "[6/6] Prune heavy build artefacts…"
rm -rf ios/DerivedData/Build/Products ios/DerivedData/Build/Intermediates.noindex

echo "✅ Native iOS sources are generated. Commit ios/ (incl. Pods) to share with VibeCode."
