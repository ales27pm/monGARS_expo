# Quick Reference: Free Xcode Build

## 🎯 What This Gives You

A **completely free** way to build your iOS app with native modules (llama.rn) without needing an EAS subscription.

## 🚀 How to Use

### 1. Go to GitHub Actions
Visit: https://github.com/ales27pm/monGARS_expo/actions

### 2. Select Workflow
Click on **"Build iOS with Xcode (No EAS)"**

### 3. Run Workflow
- Click **"Run workflow"** button
- Select:
  - **model_name**: `qwen2-0.5b` (or other model)
  - **configuration**: `Release`
  - **scheme**: Leave default
- Click **"Run workflow"**

### 4. Wait for Build
Build takes ~30-45 minutes

### 5. Download Build
- Go to the workflow run
- Scroll to **Artifacts** section
- Download **ios-app-Release.zip**

## 📥 What You Get

### Without Code Signing (Default)
- **App-Simulator.zip** - For iOS Simulator only
- Can't install on physical devices
- Great for testing

### With Code Signing (Optional)
- **YourApp.ipa** - Install on devices
- Submit to App Store
- Requires setup (see XCODE_BUILD_GUIDE.md)

## 💰 Cost Breakdown

| Item | Cost |
|------|------|
| GitHub Actions (2000 min/month) | **FREE** |
| macOS runners (10x multiplier) | Uses ~300-450 min per build |
| Models storage in repo | **FREE** |
| **Total per build** | **$0** |

**Builds per month on free tier: ~4-6**

## 🆚 vs EAS Build

| Feature | Xcode (Free) | EAS Build |
|---------|-------------|-----------|
| Cost | $0 | $29-$99/mo |
| Build time | 30-45 min | 20-35 min |
| Code signing | Manual | Managed |
| Setup effort | Medium | Easy |
| Native modules | ✅ Works | ✅ Works |

## 📚 Full Documentation

- **[XCODE_BUILD_GUIDE.md](./XCODE_BUILD_GUIDE.md)** - Complete guide with code signing setup
- **[README.md](./README.md)** - All build options compared

## 🔧 Quick Troubleshooting

**"No scheme found"**
- The workflow auto-detects your scheme
- If it fails, check ios/*.xcworkspace

**"Build taking too long"**
- First build takes longer (~45 min)
- Subsequent builds are faster (~30 min)

**"Can't install on device"**
- Unsigned builds are simulator-only
- Need code signing for device install
- See XCODE_BUILD_GUIDE.md section "Setup Code Signing"

## ✅ Recommended Workflow

1. **Development**: Build locally with Xcode
2. **Testing**: Use free GitHub Actions workflow
3. **Production**: Either continue with free builds or upgrade to EAS for convenience

---

**Your app is ready to build for free! 🎉**
