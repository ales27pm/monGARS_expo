# Xcode Simulator Build Fix - CRITICAL

## ✅ Issue Fixed and Pushed

### The Problem:
```
error: module map file '.../Debug-iphonesimulator/Expo/Expo.modulemap' not found
error: no such module 'Expo'
** ARCHIVE FAILED **
```

### Root Cause:
The workflow was using `xcodebuild archive` for simulator builds, which is **incorrect**. The `archive` command:
- Is designed for creating distributable apps (device builds)
- Doesn't work properly with simulator SDK
- Causes module map file errors
- Cannot build simulator targets without code signing

### The Solution:

**For Simulator Builds (no signing):**
```bash
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "${{ inputs.configuration }}" \
  -sdk iphonesimulator \
  -derivedDataPath "./build/DerivedData" \
  build  # ← Changed from 'archive' to 'build'
```

**For Device Builds (with signing):**
```bash
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "${{ inputs.configuration }}" \
  -sdk iphoneos \
  -archivePath "./build/App.xcarchive" \
  archive  # ← 'archive' is correct for device builds
```

### What Changed:

**1. Build Command**
- Simulator: Uses `build` command (not `archive`)
- Device: Uses `archive` command (correct)

**2. App Location**
- Simulator: App is in `build/DerivedData/Build/Products/*-iphonesimulator/*.app`
- Device: App is in `build/App.xcarchive/Products/Applications/*.app`

**3. Workflow Logic**
```yaml
if [ -n "$APPLE_CERTIFICATE" ]; then
  # Device build with signing
  xcodebuild ... archive
else
  # Simulator build without signing
  xcodebuild ... build  # ← Fixed!
fi
```

## 🚀 Ready to Test

The fix has been pushed to GitHub. Run the workflow again:

1. **Go to:** https://github.com/ales27pm/monGARS_expo/actions/workflows/xcode-build-no-eas.yml
2. **Click:** "Run workflow"
3. **Configure:**
   - **model_name**: `none` (fast test)
   - **scheme**: Leave empty (auto-detect)
   - **configuration**: `Debug`
4. **Expected result:** ✅ Build succeeds, creates simulator .app

### Expected Build Flow:

```
📋 List available schemes
  ✅ Shows all schemes

🔍 Detect scheme name
  ✅ Auto-detects: MonGARS

🏗️ Build with Xcode
  ⚠️ Building without code signing (simulator only)
  xcodebuild ... -sdk iphonesimulator build
  ✅ Simulator build completed successfully

📦 Create simulator build
  ✅ Found app at: build/DerivedData/.../MonGARS.app
  ✅ Simulator build created: App-Simulator.zip

📤 Upload IPA artifact
  ✅ Artifact uploaded
```

### What You'll Get:

After ~20-30 minutes:
- **App-Simulator.zip** containing `MonGARS.app`
- Can be installed in iOS Simulator
- Includes all native modules (llama.rn compiled!)

### How to Test the App:

```bash
# Download artifact from GitHub Actions
unzip App-Simulator.zip

# Boot simulator
xcrun simctl boot "iPhone 15 Pro"

# Install app
xcrun simctl install booted MonGARS.app

# Launch simulator
open -a Simulator
```

## 📊 Why This Matters

This is a **fundamental Xcode concept**:

| Command | Purpose | Requires Signing | SDK |
|---------|---------|------------------|-----|
| `build` | Compile & build | No | Any (simulator/device) |
| `archive` | Create distributable | Yes | Device only |

**Key Rule:** Simulator builds must use `build`, not `archive`.

## 🎯 Commit Details

**Commit:** `1ad7e2eb9`
**Title:** "Fix simulator build: use 'build' instead of 'archive'"

**Changes:**
- Use `build` command for simulator targets
- Use `archive` command only for device targets
- Update app path finder for DerivedData structure
- Remove incorrect archive parameters for simulator

## ✅ Status

- [x] Root cause identified (archive vs build)
- [x] Fix implemented
- [x] Committed and pushed
- [ ] Workflow test (pending user action)

---

**This should resolve the module map errors and allow successful simulator builds!**
