# Building the App with Native Modules

This guide explains how to create a working iOS build with fully functional native modules.

## The Problem

**Vibecode's Limitation**: Vibecode preview uses Expo Go, which cannot run custom native modules. This means even though we have all the native files (Pods, iOS project), the `llama.rn` module won't work for actual AI inference.

**The Solution**: Build the app with EAS Build or Xcode to create an actual binary with compiled native modules.

---

## Option 1: EAS Build (Recommended ⭐)

**Best for**: Quick testing, no Xcode required, works from any computer

### Prerequisites

1. **Expo Account**: Sign up at [expo.dev](https://expo.dev)
2. **Expo CLI**: Install globally
   ```bash
   npm install -g eas-cli
   ```
3. **Login**:
   ```bash
   eas login
   ```

### Steps

1. **Run the GitHub Workflow**:
   - Go to: [GitHub Actions](https://github.com/ales27pm/monGARS_expo/actions)
   - Select: **"EAS Build with Native Modules"**
   - Click: **"Run workflow"**
   - Options:
     - **Profile**: `development` (for testing)
     - **Download models**: `yes`
     - **Model name**: `qwen2-0.5b` (smallest, fastest)
   - Click: **"Run workflow"** button

2. **Wait for Build** (~15-25 minutes):
   ```bash
   # Check build status
   eas build:list --platform ios --limit 5
   ```

3. **Download the Build**:
   ```bash
   # Download latest iOS build
   eas build:download --platform ios --latest
   ```

   This downloads a `.tar.gz` file containing the `.ipa`

4. **Install on Device**:

   **For Simulator**:
   ```bash
   # Extract and run
   eas build:run --platform ios --latest
   ```

   **For Real Device**:
   - Extract the `.ipa` from the downloaded archive
   - Open Xcode → Window → Devices and Simulators
   - Connect your iPhone
   - Drag the `.ipa` file onto your device

5. **Test the App**:
   - Open the app on your device
   - Go to **Models** tab → Tap "Load" on Qwen2
   - Go to **Chat** tab → Type a message
   - ✅ **It works!** Real on-device inference!

### Build Profiles Explained

- **`development`**: Includes dev tools, can be installed on any device registered in your Expo account
- **`preview`**: Production-like build for internal testing
- **`production`**: Optimized build ready for App Store submission

---

## Option 2: Local Xcode Build

**Best for**: Full control, debugging, iterative development

### Prerequisites

1. **macOS** with Xcode installed
2. **CocoaPods**: `sudo gem install cocoapods`
3. **Watchman**: `brew install watchman`

### Steps

1. **Generate iOS Project**:
   ```bash
   npx expo prebuild --platform ios --clean
   ```

2. **Install Dependencies**:
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Open in Xcode**:
   ```bash
   open ios/monGARSexpo.xcworkspace
   ```

   ⚠️ **Important**: Open the `.xcworkspace` file, NOT the `.xcodeproj`

4. **Configure Signing**:
   - Select the project in Xcode navigator
   - Go to "Signing & Capabilities"
   - Select your development team
   - Xcode will automatically manage provisioning

5. **Build and Run**:
   - Select your target device or simulator
   - Press **Cmd+R** or click the Play button
   - Xcode compiles all native modules including llama.rn

6. **Test**:
   - App launches on device/simulator
   - Navigate to Models → Load model
   - Go to Chat → Start chatting
   - ✅ Native inference works!

### Troubleshooting Xcode Build

**Pod Install Fails**:
```bash
cd ios
pod cache clean --all
pod deintegrate
pod install --repo-update
```

**Build Fails with Missing Headers**:
```bash
cd ios
xcodebuild clean
```
Then rebuild in Xcode

**Signing Issues**:
- Make sure your Apple ID is added in Xcode → Preferences → Accounts
- Use automatic signing for development builds

---

## Option 3: GitHub Workflow (Files Only)

**Use Case**: Generate native files for version control, but can't run in Vibecode

### Steps

1. **Run Workflow**:
   - Go to: [GitHub Actions](https://github.com/ales27pm/monGARS_expo/actions)
   - Select: **"Complete Native Setup for Vibecode"**
   - Click "Run workflow"
   - Wait ~10-15 minutes

2. **Pull Files**:
   ```bash
   git pull origin main
   ```

3. **Result**:
   - ✅ All iOS project files in repository
   - ✅ All Pods including llama.rn installed
   - ✅ Codegen outputs committed
   - ⚠️ **But**: Files can't run in Vibecode preview
   - ℹ️ **Use**: Good for CI/CD, version control, sharing with team

---

## Comparison

| Feature | EAS Build | Xcode | GitHub Workflow |
|---------|-----------|-------|-----------------|
| **Creates runnable binary** | ✅ | ✅ | ❌ |
| **Native modules work** | ✅ | ✅ | ❌ |
| **No macOS required** | ✅ | ❌ | N/A |
| **Install on device** | ✅ | ✅ | ❌ |
| **Real AI inference** | ✅ | ✅ | ❌ |
| **Vibecode compatible** | N/A | N/A | Files only |
| **Time required** | 15-25 min | 5-10 min | 10-15 min |
| **Cost** | Free tier available | Free | Free |

---

## What Each Approach Produces

### EAS Build
```
Output: monGARSexpo.ipa (installable iOS app)
Size: ~50-100 MB (depending on models)
Contains: Fully compiled native code including llama.rn
Install: Directly on device or simulator
Result: 100% functional app with on-device AI
```

### Xcode Build
```
Output: App bundle in DerivedData/
Size: Similar to EAS build
Contains: Compiled native modules
Install: Direct from Xcode to device
Result: 100% functional, can debug
```

### GitHub Workflow
```
Output: ios/ directory with Pods/ in git repo
Size: ~500 MB of source files
Contains: Uncompiled native module sources
Install: Can't install, just source files
Result: Files for version control only
```

---

## Recommended Workflow

**For Development**:
1. Use Xcode for iterative development
2. Fast compile times, full debugging
3. Test on simulator during development

**For Testing**:
1. Use EAS Build with `development` profile
2. Share builds with testers via Expo
3. No need for code signing management

**For Production**:
1. Use EAS Build with `production` profile
2. Submit to TestFlight
3. Then to App Store

**For Vibecode**:
1. Understand it's for UI/UX preview only
2. Native modules won't work (Expo Go limitation)
3. Use for rapid prototyping and design

---

## FAQ

**Q: Why doesn't the model work in Vibecode?**
A: Vibecode uses Expo Go, which only runs JavaScript. Native modules like llama.rn require compilation into a native binary.

**Q: Do I need a Mac?**
A: Not if you use EAS Build (Option 1). Only Xcode build requires macOS.

**Q: How long does EAS Build take?**
A: Typically 15-25 minutes depending on queue time and build complexity.

**Q: Can I test on a real iPhone?**
A: Yes! With both EAS Build (development profile) and Xcode. Register your device in your Apple Developer account.

**Q: What's the cost?**
A: EAS Build has a free tier (limited builds/month). Xcode is free. Vibecode is free.

**Q: Which model should I include?**
A: Start with `qwen2-0.5b` (smallest, ~300MB). Works great for testing.

**Q: Can I build for Android?**
A: Yes! Change workflow to use `--platform android`. Native setup is similar but uses Gradle instead of Pods.

---

## Next Steps

1. ✅ Choose your build method (EAS recommended)
2. ✅ Run the build
3. ✅ Install on device
4. ✅ Test on-device AI inference
5. 🎉 Share your working AI app!

**Need Help?** Check [Expo EAS Build docs](https://docs.expo.dev/build/introduction/)
