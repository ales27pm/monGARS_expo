# Native iOS Build on GitHub Actions (Alternative Approach)

**Note:** This is NOT recommended for most projects. EAS Build is simpler and more reliable.

## Why You Might Want This

- Avoid EAS Build costs
- Full control over build environment
- Custom build scripts
- Private build infrastructure

## Why You Probably Don't Want This

- Much more complex setup
- Requires Apple certificates and provisioning profiles in GitHub
- Need to manage code signing manually
- Requires macOS runner (10x more expensive than Linux)
- More maintenance burden

## If You Really Want to Build Natively

### Requirements

1. **GitHub Actions macOS runner** (`runs-on: macos-latest`)
2. **Apple Developer certificates** stored as GitHub secrets
3. **Provisioning profiles** stored as GitHub secrets
4. **Code signing configuration** in the workflow
5. **Xcode project** (generated with `npx expo prebuild`)

### Example Workflow (Advanced)

```yaml
name: Native iOS Build (Without EAS)

on:
  workflow_dispatch:

jobs:
  build-ios-native:
    name: Build iOS Natively on macOS Runner
    runs-on: macos-latest  # ⚠️ 10x more expensive than ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Setup Ruby (for CocoaPods)
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.0'

      - name: Install dependencies
        run: |
          npm install -g bun
          bun install --frozen-lockfile

      - name: Install CocoaPods dependencies
        run: |
          cd ios
          pod install

      - name: Import Code Signing Certificates
        uses: apple-actions/import-codesign-certs@v2
        with:
          p12-file-base64: ${{ secrets.APPLE_CERT_P12 }}
          p12-password: ${{ secrets.APPLE_CERT_PASSWORD }}

      - name: Install Provisioning Profile
        run: |
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          echo "${{ secrets.PROVISIONING_PROFILE }}" | base64 --decode > ~/Library/MobileDevice/Provisioning\ Profiles/profile.mobileprovision

      - name: Build iOS App
        run: |
          xcodebuild \
            -workspace ios/YourApp.xcworkspace \
            -scheme YourApp \
            -configuration Release \
            -archivePath ios/build/YourApp.xcarchive \
            archive

      - name: Export IPA
        run: |
          xcodebuild \
            -exportArchive \
            -archivePath ios/build/YourApp.xcarchive \
            -exportPath ios/build \
            -exportOptionsPlist ios/ExportOptions.plist

      - name: Upload IPA
        uses: actions/upload-artifact@v4
        with:
          name: ios-app
          path: ios/build/*.ipa
```

## Cost Comparison

| Runner Type | Cost per Minute | Typical Build Time | Cost per Build |
|-------------|----------------|-------------------|----------------|
| ubuntu-latest (EAS) | $0.008 | 5 min (trigger only) | $0.04 |
| macos-latest (native) | $0.08 | 30 min (full build) | $2.40 |
| **EAS Build** | N/A | 25 min | $0.00 (with free tier) or included in $29/mo |

## Complexity Comparison

| Aspect | EAS Build | Native GitHub Build |
|--------|-----------|-------------------|
| Setup | Easy (1 command) | Complex (50+ lines) |
| Code signing | Automatic | Manual |
| Certificate management | Handled by EAS | You manage |
| iOS updates | Automatic | You update Xcode |
| Troubleshooting | Good docs | Complex |
| Maintenance | Low | High |

## Current Approach vs Native Build

### Current (EAS Build) ✅ Recommended

```yaml
# GitHub Actions (ubuntu-latest)
- Download models (5 min)
- Run: eas build (triggers EAS)

# EAS Cloud (macOS with Xcode)
- Compiles native modules
- Builds iOS app (25 min)
- Stores .ipa
```

**Pros:**
- Simple setup
- Automatic code signing
- Managed infrastructure
- Free tier available
- Ubuntu runner is cheap

**Cons:**
- Requires EAS account
- Less control over build environment

### Native Build (macOS Runner) ❌ Not Recommended

```yaml
# GitHub Actions (macos-latest)
- Download models
- Install CocoaPods
- Setup certificates
- Build with Xcode (30 min)
- Export IPA
```

**Pros:**
- Full control
- No EAS dependency
- Private infrastructure

**Cons:**
- 60x more expensive ($2.40 vs $0.04 per build)
- Complex setup
- Manual certificate management
- Requires Xcode knowledge
- More maintenance

## Recommendation

**Stick with EAS Build** because:

1. **Native modules ARE compiled on macOS** - Just on EAS's macOS runners
2. **Much simpler** - No certificate management
3. **More cost effective** - Ubuntu runner for orchestration
4. **Well supported** - Built specifically for Expo/React Native
5. **Automatic updates** - EAS keeps Xcode versions current

## When to Consider Native Build

Only if you:
- Have very specific build requirements
- Need to avoid EAS entirely
- Have existing Xcode build infrastructure
- Need custom build scripts that EAS doesn't support
- Have compliance requirements for build infrastructure

## Bottom Line

Your current workflow is correct. The native iOS modules (llama.rn, MMKV, etc.) **are** being compiled on macOS runners - they're just EAS's macOS runners, not GitHub's. This is the recommended approach for Expo apps.

---

**Current architecture is optimal for your use case.** ✅
