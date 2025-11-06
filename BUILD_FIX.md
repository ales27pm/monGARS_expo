# iOS Build Fix - onGeometryChange Error

## Problem

The build fails with:
```
value of type 'some View' has no member 'onGeometryChange'
```

This happens because:
1. `expo-modules-core` uses the SwiftUI `.onGeometryChange` API
2. This API is only available in iOS 18.0+ (requires Xcode 16+)
3. The code incorrectly marks it as available in iOS 16.0+
4. When building with Xcode 15.4 (iOS 17 SDK), the API doesn't exist

## Solution Applied

### 1. Updated EAS Build Configuration

**File: `eas.json`**

Changed all iOS build profiles to use Xcode 16.2:
```json
"image": "macos-sequoia-15.2-xcode-16.2"
```

This ensures **cloud builds** use the correct Xcode version.

### 2. Created Automatic Fix Script

**File: `scripts/fix-expo-modules.js`**

This script automatically patches `expo-modules-core` after install:
- Changes iOS availability from 16.0 → 18.0
- Adds proper fallback behavior
- Runs automatically via `postinstall` script

### 3. Added Xcode Version File

**File: `.xcode-version`**

Specifies Xcode 16.2 for local builds (if xcversion is installed).

## How to Use

### Option A: EAS Cloud Build (Recommended)

**This is the easiest and most reliable option.**

```bash
# Build on EAS servers (uses correct Xcode automatically)
eas build --platform ios --profile production
```

✅ **This will work** - EAS uses Xcode 16.2 as configured in eas.json

### Option B: Local Build (Advanced)

If you must build locally with `--local` flag:

**Requirements:**
- macOS with Xcode 16.2+ installed
- Xcode selected via `xcode-select`

**Steps:**

1. **Install Xcode 16.2 or later**
   - Download from [Apple Developer](https://developer.apple.com/download/)

2. **Select the correct Xcode**
   ```bash
   sudo xcode-select -s /Applications/Xcode_16.2.app
   ```

3. **Verify Xcode version**
   ```bash
   xcodebuild -version
   # Should show: Xcode 16.2 or later
   ```

4. **Install dependencies** (applies the fix automatically)
   ```bash
   bun install
   ```

5. **Build**
   ```bash
   eas build --platform ios --profile production --local
   ```

### Option C: GitHub Actions (Automated)

Our workflows automatically:
- Use the correct Xcode version
- Apply the expo-modules-core fix
- Build and optionally submit to App Store

Simply run the workflow and it handles everything.

## Verification

After running `bun install`, verify the fix was applied:

```bash
grep "iOS 18.0" node_modules/expo-modules-core/ios/Core/Views/SwiftUI/AutoSizingStack.swift
```

✅ If you see `iOS 18.0`, the fix is applied correctly.

## Why This Happened

1. **React Native 0.79.2** requires iOS 18 features
2. **expo-modules-core 2.3.13** has incorrect availability annotations
3. **Xcode 15.4** doesn't have iOS 18 APIs
4. **Solution**: Use Xcode 16.2+ which includes iOS 18 SDK

## Troubleshooting

**Build still fails with Xcode 15.4**

→ You're using `--local` build with wrong Xcode selected
→ Either:
   - Use cloud build (remove `--local` flag)
   - Install and select Xcode 16.2+

**"AutoSizingStack not patched" during postinstall**

→ The script couldn't find the file
→ Run: `bun install --force` to reinstall dependencies

**Build works but app crashes on iOS 17**

→ This is expected - the app requires iOS 18+
→ Update `ios.deploymentTarget` in app.json if needed

## Related Files

- `eas.json` - Build configuration (Xcode 16.2)
- `scripts/fix-expo-modules.js` - Auto-patch script
- `.xcode-version` - Xcode version hint
- `package.json` - Postinstall hook
- `node_modules/expo-modules-core/ios/Core/Views/SwiftUI/AutoSizingStack.swift` - Patched file

## Summary

✅ **Cloud builds**: Work automatically with no changes needed
✅ **Local builds**: Require Xcode 16.2+ installed and selected
✅ **GitHub Actions**: Work automatically with correct runner
✅ **Patch**: Applied automatically on `bun install`

**Recommendation**: Use EAS cloud builds to avoid local Xcode version issues.
