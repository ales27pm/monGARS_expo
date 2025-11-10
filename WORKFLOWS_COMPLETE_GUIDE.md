# Complete GitHub Workflows Guide

This project has **TWO workflows** for deploying your iOS app:

## 🎯 Choose Your Workflow

### Workflow 1: Build for MonGARS Deployment (Recommended)

**File:** _Create `.github/workflows/build-for-mongars.yml`_

**What it does:**

1. Downloads ML models from HuggingFace
2. Commits models to your repository
3. Builds iOS app with EAS Build (on EAS's macOS servers)
4. You pull and submit from the MonGARS deployment pipeline

**Best for:**

- ✅ Most cost-effective (uses cheap ubuntu runner + EAS)
- ✅ Most control (you submit when ready)
- ✅ Testing before submission
- ✅ Multiple submissions of same build

**Cost:** ~$0.04 GitHub Actions + EAS Build pricing

---

### Workflow 2: Full Automated macOS Deployment

**File:** `.github/workflows/deploy-macos-native.yml`

**What it does:**

1. Downloads ML models from HuggingFace
2. Commits models to your repository
3. Builds iOS app with EAS Build (using macOS GitHub runner)
4. Optionally submits directly to App Store
5. Everything happens on GitHub's macOS runner

**Best for:**

- ✅ Fully automated CI/CD
- ✅ No manual steps required
- ✅ Direct App Store submission
- ✅ Build on Apple Silicon (M1)

**Cost:** ~$2.40 GitHub Actions (macOS runner) + EAS Build pricing

---

## 📋 Workflow 1: Build for MonGARS Deployment

### Setup Requirements

#### GitHub Secrets (Required)

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Add these secrets:

- `EXPO_TOKEN` - Your Expo access token

#### How to Get EXPO_TOKEN

```bash
# Login to EAS
eas login

# Get your token
cat ~/.expo/state.json | jq -r '.auth.sessionSecret'
```

### How to Use

1. **Go to GitHub Actions**

   ```
   https://github.com/YOUR_USERNAME/YOUR_REPO/actions
   ```

2. **Select "Build & Prepare for Vibecode Deployment"**

3. **Click "Run workflow"**

4. **Choose options:**
   - **Model:** Select which model to include
     - `qwen2-0.5b` - 326 MB, fastest (recommended for testing)
     - `llama-3.2-1b` - 730 MB, best balance (recommended for production)
     - `smollm2-1.7b` - 1.1 GB, higher quality
     - `phi-3-mini` - 2.3 GB, highest quality
     - `all` - All models (large!)

   - **Profile:** Build profile
     - `production` - For App Store submission
     - `preview` - For internal testing

5. **Click "Run workflow"**

6. **Wait for completion** (~30-35 minutes)
   - Model download: 5 min
   - EAS Build: 25-30 min

### After Workflow Completes

**In Vibecode terminal:**

```bash
# Step 1: Pull the repository (includes models and build)
git pull origin main

# Step 2: Submit to App Store
eas submit --platform ios --latest

# Or submit a specific build:
eas submit --platform ios --id BUILD_ID
```

### What Gets Committed

- ✅ ML model files in `assets/models/`
- ✅ Any code changes (if made during workflow)
- ✅ Build configuration

### Timeline

```
┌─────────────────────────────────┐
│ GitHub Actions (ubuntu)         │
│ • Download models: 5 min        │
│ • Commit to repo: 1 min         │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│ EAS Build Cloud (macOS)         │
│ • Install deps: 3 min           │
│ • Compile native: 22 min        │
│ • Sign & export: 5 min          │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│ Vibecode (Your Terminal)        │
│ • git pull: 30 sec              │
│ • eas submit: 5 min             │
└─────────────────────────────────┘

Total: ~35 minutes
```

---

## 📋 Workflow 2: Full Automated macOS Deployment

### Setup Requirements

#### GitHub Secrets (Required)

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Add these secrets:

- `EXPO_TOKEN` - Your Expo access token
- `APPLE_ID` - Your Apple ID email (required for App Store submission)
- `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password from appleid.apple.com

#### Optional Secrets

- `APPLE_TEAM_ID` - Your Apple Developer Team ID
- `ASC_APP_ID` - App Store Connect App ID

#### How to Get These Values

**EXPO_TOKEN:**

```bash
eas login
cat ~/.expo/state.json | jq -r '.auth.sessionSecret'
```

**APPLE_APP_SPECIFIC_PASSWORD:**

1. Go to https://appleid.apple.com
2. Sign in
3. Security → App-Specific Passwords
4. Generate password
5. Copy and save as GitHub secret

### How to Use

1. **Go to GitHub Actions**

   ```
   https://github.com/YOUR_USERNAME/YOUR_REPO/actions
   ```

2. **Select "Full Automated iOS Deployment (macOS Native)"**

3. **Click "Run workflow"**

4. **Choose options:**
   - **Model:** Select which model to include (same options as Workflow 1)

   - **Submit to App Store:**
     - ✅ `true` - Automatically submit after build
     - ❌ `false` - Just build, submit manually later

5. **Click "Run workflow"**

6. **Wait for completion** (~30-40 minutes)
   - Model download: 5 min
   - EAS Build on macOS runner: 25-30 min
   - App Store submission: 5 min (if enabled)

### After Workflow Completes

If **Submit to App Store = false:**

```bash
# In Vibecode, submit manually:
git pull origin main
eas submit --platform ios --latest
```

If **Submit to App Store = true:**

- ✅ Already submitted!
- Check App Store Connect: https://appstoreconnect.apple.com
- Monitor review status

### What Gets Committed

- ✅ ML model files in `assets/models/`
- ✅ Any code changes (if made during workflow)
- ✅ Build configuration

### Timeline

```
┌─────────────────────────────────────────┐
│ GitHub Actions (macOS-14 runner)       │
│ • Download models: 5 min                │
│ • Commit to repo: 1 min                 │
│ • Install deps: 3 min                   │
│ • EAS Build (local): 25 min             │
│ • Submit to App Store: 5 min (optional) │
└─────────────────────────────────────────┘

Total: ~35-40 minutes (all automated)
```

---

## 📊 Comparison

| Feature                 | Workflow 1 (Vibecode)    | Workflow 2 (macOS Native)    |
| ----------------------- | ------------------------ | ---------------------------- |
| **GitHub Runner**       | ubuntu-latest            | macos-14 (Apple Silicon)     |
| **Where iOS builds**    | EAS Cloud (macOS)        | GitHub Actions (macOS) + EAS |
| **GitHub Actions cost** | ~$0.04                   | ~$2.40                       |
| **Manual steps**        | Yes (submit in Vibecode) | No (optional)                |
| **Control**             | High                     | Medium                       |
| **Automation**          | Semi-automated           | Fully automated              |
| **Best for**            | Testing, flexibility     | Production CI/CD             |
| **Native modules**      | ✅ Compiled on macOS     | ✅ Compiled on macOS         |
| **Model commit**        | ✅ Yes                   | ✅ Yes                       |
| **App Store submit**    | Manual                   | Automatic (optional)         |

---

## 🎯 Which Should You Use?

### Use Workflow 1 (Build for Vibecode) if:

- ✅ You want to test the build before submitting
- ✅ You want to minimize GitHub Actions costs
- ✅ You need to make last-minute changes
- ✅ You want control over submission timing
- ✅ **Recommended for most use cases**

### Use Workflow 2 (Full Automated) if:

- ✅ You want completely hands-off deployment
- ✅ You have a mature CI/CD pipeline
- ✅ You don't need to test before submission
- ✅ Cost isn't a primary concern
- ✅ You want direct App Store submission

---

## 🔧 Troubleshooting

### "EXPO_TOKEN not found"

- Add `EXPO_TOKEN` to GitHub secrets
- Get token: `eas login && cat ~/.expo/state.json`

### "Build failed"

- Check build logs in GitHub Actions
- Verify EAS account is active
- Check `.easignore` excludes `node_modules`

### "App Store submission failed"

- Verify `APPLE_ID` and `APPLE_APP_SPECIFIC_PASSWORD` are correct
- Check app is configured in App Store Connect
- Ensure bundle identifier matches

### "Models too large"

- Use `qwen2-0.5b` (smallest, 326 MB)
- Don't use `all` models option
- Consider Git LFS (see GIT_LFS_GUIDE.md)

### "macOS runner timeout"

- macOS runners are slower to provision
- Use Workflow 1 (ubuntu) for faster starts
- Consider upgrading GitHub Actions plan

---

## 📝 Examples

### Example 1: Quick Test Build

**Use: Workflow 1**

```
Model: qwen2-0.5b
Profile: preview
```

Then in Vibecode:

```bash
git pull origin main
eas submit --platform ios --latest
```

### Example 2: Production Release

**Use: Workflow 1 or 2**

```
Model: llama-3.2-1b
Profile/Submit: production/true
```

### Example 3: Multiple Models

**Use: Workflow 1**

```
Model: all
Profile: production
```

**Warning:** This creates a large app (~4 GB)

---

## 🚀 Quick Start Commands

### Workflow 1 After Completion:

```bash
# Pull and submit
git pull origin main
eas submit --platform ios --latest

# Or specific build
eas submit --platform ios --id BUILD_ID
```

### Check Build Status:

```bash
# List recent builds
eas build:list --platform ios --limit 5

# View specific build
eas build:view BUILD_ID

# Check submission status
eas submission:list --platform ios
```

---

## 📚 Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [GitHub Actions macOS Runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#supported-runners-and-hardware-resources)
- [App Store Connect](https://appstoreconnect.apple.com)

---

## ✅ Summary

You now have TWO powerful workflows:

1. **Build for Vibecode** - Cost-effective, flexible, recommended for most cases
2. **Full Automated macOS** - Fully automated, great for mature CI/CD

Both workflows:

- ✅ Download and commit ML models
- ✅ Build iOS app with proper native module compilation
- ✅ Handle code signing automatically
- ✅ Create production-ready .ipa files
- ✅ Support all model options

Choose based on your needs and preferences! 🎉
