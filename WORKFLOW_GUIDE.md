# Vibecode Optimized Workflow Guide

This guide shows you how to use GitHub Actions to download ML models and then build/submit from Vibecode.

## Why This Approach?

**Benefits:**
- ✅ Faster: No EAS build in GitHub (saves 20-30 minutes)
- ✅ Cheaper: No EAS build minutes used in GitHub Actions
- ✅ More control: Build and submit directly from Vibecode
- ✅ Smaller uploads: Models downloaded on GitHub, not uploaded
- ✅ Same result: Final .ipa file for App Store submission

**Note:** Native iOS modules (llama.rn, MMKV, etc.) are compiled on **EAS's macOS runners**, not GitHub Actions. The GitHub Actions runner (ubuntu) only downloads models and commits them to your repo. The actual iOS build with Xcode happens when you run `eas build` from Vibecode, which triggers EAS's cloud infrastructure.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  GitHub Actions (ubuntu-latest) - CHEAP                 │
│  ├─ Download models from HuggingFace (5 min)           │
│  ├─ Commit to repository                                │
│  └─ Total cost: ~$0.04 per run                         │
└─────────────────────────────────────────────────────────┘
                         ↓ git push
┌─────────────────────────────────────────────────────────┐
│  Vibecode (Your Terminal)                               │
│  ├─ git pull (get models)                               │
│  ├─ eas build (trigger EAS)                             │
│  └─ eas submit (submit to App Store)                    │
└─────────────────────────────────────────────────────────┘
                         ↓ eas build
┌─────────────────────────────────────────────────────────┐
│  EAS Build Cloud (macOS with Xcode) - HANDLES NATIVE   │
│  ├─ Receive code from Vibecode                          │
│  ├─ Install dependencies (bun install)                  │
│  ├─ Install CocoaPods (pod install)                     │
│  ├─ Compile native modules (llama.rn, MMKV, etc.)      │
│  ├─ Build iOS app with Xcode (25 min)                  │
│  ├─ Sign with Apple certificates                        │
│  └─ Upload .ipa to EAS servers                         │
└─────────────────────────────────────────────────────────┘
```

This architecture ensures native modules are compiled properly on macOS while keeping GitHub Actions costs low.

## Complete Workflow

### Step 1: Download Models via GitHub Actions

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **Download ML Models (No Build)** workflow
4. Click **Run workflow**
5. Choose options:
   - Model: `qwen2-0.5b` (fastest) or `llama-3.2-1b` (best quality)
   - Commit to repo: ✅ **YES** (checked)
6. Click **Run workflow**
7. Wait 2-5 minutes for download to complete

### Step 2: Pull Updated Repository in Vibecode

In Vibecode terminal:

```bash
# Pull the models from GitHub
git pull origin main

# Verify models are downloaded
ls -lh ./assets/models/

# You should see .gguf files (300MB-2GB each)
```

### Step 3: Build iOS App from Vibecode

```bash
# Build production iOS app with EAS
eas build --platform ios --profile production --non-interactive

# Wait for build to complete (20-30 minutes)
# You'll get a build URL - save this
```

**Important:** This triggers EAS Build cloud service, which:
- Uses macOS runners with Xcode installed
- Compiles all native modules (llama.rn, MMKV, etc.)
- Handles code signing automatically
- Creates the final .ipa file

The `eas build` command just uploads your code to EAS - the actual iOS compilation happens on EAS's macOS infrastructure, not your local machine.

### Step 4: Submit to App Store from Vibecode

```bash
# Submit the latest build to App Store
eas submit --platform ios --latest --non-interactive

# Or submit a specific build URL
eas submit --platform ios --url YOUR_BUILD_URL
```

## Required Secrets (Set in GitHub)

For the workflow to work, add these in **Settings → Secrets → Actions**:

- `EXPO_TOKEN` - Your Expo access token (get from `eas whoami`)

For App Store submission (optional, can do manually):
- `APPLE_ID` - Your Apple ID email
- `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password from appleid.apple.com
- `APPLE_TEAM_ID` - Your team ID from developer.apple.com

## Alternative: Skip GitHub Actions Entirely

If you have fast internet in Vibecode, you can download models directly:

```bash
# Install Python dependencies
pip3 install huggingface-hub

# Download a model
python3 -c "
from huggingface_hub import hf_hub_download
hf_hub_download(
    repo_id='Qwen/Qwen2-0.5B-Instruct-GGUF',
    filename='qwen2-0_5b-instruct-q4_k_m.gguf',
    local_dir='./assets/models',
    local_dir_use_symlinks=False
)
"

# Then build and submit as normal
eas build --platform ios --profile production
eas submit --platform ios --latest
```

## Comparison: Old vs New Workflow

### Old Workflow (build-and-deploy.yml)
```
GitHub Actions:
1. Download models (5 min)
2. Build iOS with EAS (25 min)
3. Submit to App Store (5 min)
Total: 35 minutes in GitHub Actions
```

### New Workflow (download-models-only.yml)
```
GitHub Actions:
1. Download models (5 min)
2. Commit to repo (1 min)
Total: 6 minutes in GitHub Actions

Vibecode:
3. Pull repo (30 sec)
4. Build iOS with EAS (25 min)
5. Submit to App Store (5 min)
Total: 31 minutes (but you control timing)
```

## Troubleshooting

**"Models not found after git pull"**
```bash
# Check if models were committed
git log --stat | grep models

# Force pull
git fetch origin main
git reset --hard origin/main
```

**"EAS build failed - archive too large"**
```bash
# The .easignore file should exclude node_modules
# Verify it exists
cat .easignore

# If missing, it should contain:
# node_modules/
# .expo/
# *.log
```

**"Need to download different model"**
```bash
# Run the GitHub Action again with different model
# Or download manually with Python command above
```

## Cost Comparison

**GitHub Actions Minutes Used:**
- Old workflow: ~35 minutes per build
- New workflow: ~6 minutes per build
- **Savings: 83% fewer GitHub Actions minutes**

**EAS Build Minutes:**
- Same in both workflows (25 minutes)
- You pay for this either way
- But with new workflow, you control when it runs

## Which Workflow Should You Use?

**Use new workflow (download-models-only.yml) if:**
- ✅ You want more control over build timing
- ✅ You want to test the app before building
- ✅ You want to save GitHub Actions minutes
- ✅ You need to make changes after downloading models

**Use old workflow (build-and-deploy.yml) if:**
- ✅ You want fully automated pipeline
- ✅ You don't need to test before building
- ✅ You're okay with longer GitHub Actions runs
- ✅ You want "one-click" deployment

## Tips

1. **Start with small model**: Use `qwen2-0.5b` (326MB) for testing
2. **Use production profile**: Only production builds can be submitted to App Store
3. **Save build URLs**: Keep track of successful builds for future reference
4. **Test locally first**: Make sure app works in Vibecode before building
5. **Check .easignore**: Ensure it excludes node_modules to avoid upload errors

---

**Need help?** Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed EAS Build and App Store submission instructions.
