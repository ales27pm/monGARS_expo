# Build iOS with Xcode (No EAS Required)

This guide explains how to build your iOS app using **pure Xcode on GitHub Actions** without EAS. This is **100% free** within GitHub's free tier limits.

## 🎯 Overview

**Why use this?**
- ✅ **Completely free** - No EAS subscription needed
- ✅ **Full control** - Direct Xcode build
- ✅ **Native modules** - llama.rn compiles perfectly
- ✅ **GitHub Actions** - Uses free macOS runners

**Important:** This workflow builds the app, but you'll need to handle code signing separately.

---

## 🚀 Quick Start

### Option 1: Build Without Signing (Simulator Only)

**No setup required!** Just run the workflow:

1. Go to **Actions** → **Build iOS with Xcode (No EAS)**
2. Click **Run workflow**
3. Select:
   - **Model**: Choose which AI model to include
   - **Configuration**: Release or Debug
4. Wait ~30-45 minutes
5. Download the **App-Simulator.zip** from artifacts

**What you get:**
- An `.app` bundle that runs in iOS Simulator
- Can't be installed on physical devices
- Great for testing and development

### Option 2: Build With Signing (App Store Ready)

**Requires Apple Developer Account** ($99/year)

This creates a properly signed IPA that can be:
- Installed on physical devices
- Submitted to TestFlight
- Published to App Store

---

## 🔑 Setup Code Signing (Option 2)

To create a signed IPA, you need to add signing credentials to GitHub Secrets.

### Step 1: Export Your Certificate

On your Mac with Xcode installed:

```bash
# 1. Open Keychain Access
open -a "Keychain Access"

# 2. Find your "Apple Distribution" certificate
# 3. Right-click → Export → Save as certificate.p12
# 4. Set a password (e.g., "actions")

# 5. Convert to base64
cat certificate.p12 | base64 | pbcopy
# Now the base64 is in your clipboard
```

### Step 2: Export Your Provisioning Profile

```bash
# 1. Go to: https://developer.apple.com/account/resources/profiles/list
# 2. Download your App Store provisioning profile
# 3. Convert to base64

cat YourProfile.mobileprovision | base64 | pbcopy
# Now the base64 is in your clipboard
```

### Step 3: Add GitHub Secrets

Go to your repository on GitHub:
- **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these three secrets:

| Secret Name | Value |
|-------------|-------|
| `APPLE_CERTIFICATE` | Base64 of certificate.p12 |
| `APPLE_CERTIFICATE_PASSWORD` | Password you set (e.g., "actions") |
| `APPLE_PROVISIONING_PROFILE` | Base64 of .mobileprovision |

---

## 📱 Running the Workflow

### Via GitHub Web UI

1. Go to your repository on GitHub
2. Click **Actions** tab
3. Select **Build iOS with Xcode (No EAS)** workflow
4. Click **Run workflow** button
5. Configure:
   - **model_name**: Which AI model to include
   - **scheme**: Usually auto-detected (leave default)
   - **configuration**: Release (for production) or Debug (for testing)
6. Click **Run workflow**

### Via GitHub CLI

```bash
# Install GitHub CLI if needed
brew install gh

# Trigger the workflow
gh workflow run "xcode-build-no-eas.yml" \
  --field model_name=qwen2-0.5b \
  --field configuration=Release
```

---

## 📥 Getting Your Build

### After workflow completes:

1. Go to the workflow run page
2. Scroll to **Artifacts** section
3. Download:
   - **ios-app-Release.zip** (if signed) - Contains IPA for devices
   - **ios-app-Release.zip** (if unsigned) - Contains App-Simulator.zip

### Install on Physical Device (Signed Build)

**Option A: Via Xcode**
```bash
# Unzip the artifact
unzip ios-app-Release.zip

# Connect your iPhone
# Open Xcode → Window → Devices and Simulators
# Drag the .ipa file onto your device
```

**Option B: Via Transporter (App Store)**
```bash
# Download Transporter app from Mac App Store
# Open Transporter
# Drag the .ipa file
# Deliver to App Store Connect
```

### Install in Simulator (Unsigned Build)

```bash
# Unzip the artifact
unzip ios-app-Release.zip
unzip App-Simulator.zip

# Boot a simulator
xcrun simctl boot "iPhone 15 Pro"

# Install the app
xcrun simctl install booted YourApp.app

# Open simulator
open -a Simulator
```

---

## 🆚 Comparison with EAS

| Feature | Xcode Build (This) | EAS Build |
|---------|-------------------|-----------|
| **Cost** | Free (GitHub Actions) | $29-$99/month |
| **Build Time** | ~30-45 min | ~20-35 min |
| **Native Modules** | ✅ Full support | ✅ Full support |
| **Code Signing** | Manual setup | Managed |
| **Automation** | GitHub Actions | EAS + GitHub |
| **Limits** | 2000 min/month (free) | Build count per plan |

---

## 🔧 Workflow Configuration

### Available Models

- `qwen2-0.5b` - Smallest, fastest (326 MB)
- `llama-3.2-1b` - Balanced (730 MB)
- `smollm2-1.7b` - High quality (1.1 GB)
- `phi-3-mini` - Best quality (2.3 GB)
- `all` - Download all models
- `none` - Skip model download

### Build Configurations

- **Release**: Optimized, smaller binary, for production
- **Debug**: Debug symbols, larger binary, for development

---

## 🐛 Troubleshooting

### "No scheme found"

The workflow auto-detects your Xcode scheme. If it fails:

1. Check your scheme name:
   ```bash
   cd ios
   xcodebuild -list -workspace *.xcworkspace
   ```

2. Update workflow input:
   - Set **scheme** parameter to your actual scheme name

### "Code signing failed"

**For unsigned builds:** This is expected, the simulator build will still work.

**For signed builds:**
1. Verify all three GitHub secrets are set correctly
2. Ensure certificate is "Apple Distribution" (not Development)
3. Check provisioning profile matches your bundle identifier
4. Certificate and profile must not be expired

### "Build timed out"

GitHub Actions has 6-hour limit. If build exceeds:
1. Choose smaller model (or `none`)
2. Use `Debug` configuration (faster)
3. Reduce dependencies if possible

### "Disk space full"

GitHub runners have ~14GB free space. If you hit limits:
1. Don't download multiple large models
2. Use `qwen2-0.5b` instead of `all`
3. Clean up in workflow if needed

---

## 📊 Build Times & Costs

### Expected Build Times (macOS-14 runner)

- Model download: ~3-15 min (depends on model size)
- Dependencies: ~5-8 min
- Xcode build: ~15-25 min
- **Total**: ~30-45 min

### GitHub Actions Free Tier

- **2000 minutes/month** for free accounts
- macOS runners use **10x multiplier** (1 minute = 10 minutes)
- **Effective**: ~200 macOS minutes/month
- **Builds/month**: ~4-6 builds within free tier

### To Maximize Free Tier

1. Only run workflow when ready to test/deploy
2. Use smaller models during development
3. Consider using `none` for model if already committed
4. Debug locally with Xcode when possible

---

## 🔐 Security Notes

### GitHub Secrets Best Practices

- ✅ Never commit certificates to repository
- ✅ Use separate certificates for CI/CD
- ✅ Rotate certificates periodically
- ✅ Limit secret access to necessary workflows
- ✅ Use environment protection rules for production

### Certificate Management

```bash
# Create a dedicated certificate for GitHub Actions
# Don't use your personal development certificate

# In Apple Developer Portal:
# 1. Create new "Apple Distribution" certificate
# 2. Name it "GitHub Actions CI/CD"
# 3. Download and export for workflow use
```

---

## 📚 Additional Resources

- [GitHub Actions Pricing](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)
- [Xcode Build Settings Reference](https://developer.apple.com/documentation/xcode/build-settings-reference)
- [Apple Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

## ✅ Next Steps

**Without Code Signing:**
1. Run workflow with `model_name=qwen2-0.5b`
2. Download simulator build artifact
3. Test in iOS Simulator

**With Code Signing:**
1. Export certificate and provisioning profile
2. Add to GitHub Secrets
3. Run workflow with `configuration=Release`
4. Download signed IPA
5. Install on device or submit to App Store

---

**Questions or issues?** Check the workflow logs in GitHub Actions for detailed error messages.
