# Local iOS Build Instructions

This guide provides step-by-step instructions for building the iOS app locally on macOS.

## Prerequisites

- macOS (required for iOS development)
- Xcode 16.2+ installed
- Command Line Tools
- Node.js 20+
- CocoaPods
- Bun (preferred) or npm/yarn

## Quick Build Steps

### 1. Install JavaScript Dependencies

From the repository root:

```bash
# Using bun (recommended)
bun install --frozen-lockfile

# OR using npm
npm ci

# OR using yarn
yarn install

# OR using pnpm
pnpm install
```

### 2. Install Xcode Command Line Tools

```bash
# Check if already installed
xcode-select -p >/dev/null 2>&1 || xcode-select --install
```

### 3. Install and Configure CocoaPods

Navigate to the iOS directory and set up CocoaPods:

```bash
cd ios

# If using Gemfile (Ruby dependencies)
if [ -f Gemfile ]; then
  gem install bundler --no-document
  bundle install
  bundle exec pod repo update
  bundle exec pod deintegrate
  bundle exec pod install --repo-update
else
  # Standard CocoaPods installation
  sudo gem install cocoapods --no-document
  pod repo update
  pod deintegrate
  pod install --repo-update
fi
```

### 4. Clean DerivedData (Optional but Recommended)

```bash
# Clean Xcode build cache
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

### 5. Expo Native Sync (If Build Fails)

If you encounter build issues, try regenerating native files:

```bash
cd ..  # Back to repo root
npx expo prebuild -p ios --clean
cd ios && pod install --repo-update
```

### 6. Build the App

#### Option A: Build via Xcode (Recommended for Development)

```bash
cd ..  # Back to repo root
open ios/*.xcworkspace  # Opens in Xcode
```

Then in Xcode:

1. Select your target device/simulator
2. Press Cmd+B to build or Cmd+R to build and run

#### Option B: Build via Command Line

```bash
cd ..  # Back to repo root

# Detect the scheme automatically
SCHEME=$(ls ios/*.xcodeproj | sed -n '1p' | xargs basename | sed 's/\.xcodeproj$//')

# Build for simulator (Debug)
xcodebuild -workspace ios/*.xcworkspace \
  -scheme "$SCHEME" \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  build

# Build for device (Release)
xcodebuild -workspace ios/*.xcworkspace \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  build
```

## Troubleshooting

### Common Issues

#### 1. "No scheme found" Error

**Solution**: Open `ios/*.xcworkspace` in Xcode and ensure the scheme is shared:

- Product → Scheme → Manage Schemes
- Check "Shared" for your app's scheme

#### 2. Pod Install Fails

**Solution**:

```bash
cd ios
pod repo update
pod install --repo-update --verbose
```

#### 3. "onGeometryChange not found" Error

**Solution**: You need Xcode 16.2+ with iOS 18 SDK

```bash
# Check Xcode version
xcodebuild -version

# Switch to Xcode 16.2 if installed
sudo xcode-select -s /Applications/Xcode_16.2.app
```

#### 4. Module 'React' not found

**Solution**: Clean and reinstall pods

```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
npx react-native clean
```

#### 5. Build Cache Issues

**Solution**: Clean everything and rebuild

```bash
# Clean Xcode cache
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Clean project
cd ios
xcodebuild clean
rm -rf build

# Reinstall pods
pod deintegrate
pod install --repo-update
```

## Alternative: Use GitHub Actions

If local builds are problematic, use the automated workflows:

### Option 1: Generate Native Files Workflow

Commits all iOS native files to repository:

```
1. Go to: GitHub Actions → "iOS — Generate Native Files & Commit"
2. Run with: push_mode=direct_push, build_configuration=Release
3. Wait ~20-30 minutes
4. Pull changes: git pull
```

### Option 2: EAS Cloud Build

Build in the cloud without local Xcode:

```
1. Go to: GitHub Actions → "Build & Deploy iOS (Simplified)"
2. Run with: platform=eas-cloud, profile=production
3. Wait ~15-20 minutes
4. Download .ipa from EAS Dashboard
```

## Build Configurations

### Debug Build (Development)

- Faster compilation
- Includes debugging symbols
- Larger binary size
- Best for: Local testing, debugging

### Release Build (Production)

- Optimized code
- Smaller binary size
- Slower compilation
- Best for: TestFlight, App Store, distribution

## After Successful Build

### If Building for Simulator

The app will automatically install and run on the selected simulator.

### If Building for Device

1. Archive the build: Product → Archive (in Xcode)
2. Use Organizer to distribute to TestFlight or App Store
3. Or use EAS Submit workflow for automated submission

## Environment Variables

Ensure these are set (in `.env` file or Xcode build settings):

- `EXPO_PUBLIC_MONGARS_OPENAI_API_KEY` - OpenAI API key
- `EXPO_PUBLIC_MONGARS_ANTHROPIC_API_KEY` - Anthropic API key
- `EXPO_PUBLIC_MONGARS_GROK_API_KEY` - Grok API key
- `EXPO_PUBLIC_MONGARS_PROJECT_ID` - Project identifier

## Performance Notes

### Build Times (Approximate)

- **First build**: 10-20 minutes (includes pod install, codegen)
- **Incremental builds**: 2-5 minutes (only changed files)
- **Clean build**: 8-15 minutes (recompiles everything)

### Disk Space Requirements

- **Source code**: ~500MB
- **node_modules**: ~1GB
- **ios/Pods**: ~500MB-1GB
- **DerivedData**: ~2-5GB (during build)
- **Total**: ~4-7GB minimum free space recommended

## Related Documentation

- [IOS_SETUP_STATUS.md](./IOS_SETUP_STATUS.md) - iOS native files setup
- [WORKFLOW_FIX_STATUS.md](./WORKFLOW_FIX_STATUS.md) - Workflow fixes
- [SETUP_SUMMARY.md](./SETUP_SUMMARY.md) - Complete overview
- [BUILD_FIX.md](./BUILD_FIX.md) - Xcode 16.2 requirements

---

**Note**: For VibeCode users, it's recommended to use the GitHub Actions workflows to generate and commit native files, enabling instant preview without local builds.
