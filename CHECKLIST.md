# Deployment Checklist

Copy this checklist for each deployment. Check off items as you complete them.

## Pre-Deployment Setup (One-Time)

- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login to Expo: `eas login`
- [ ] Verify login: `eas whoami`
- [ ] Configure EAS: `eas build:configure`
- [ ] Set GitHub secrets (if using workflows):
  - [ ] `EXPO_TOKEN` in GitHub repository settings
  - [ ] `APPLE_ID` (optional, for auto-submit)
  - [ ] `APPLE_APP_SPECIFIC_PASSWORD` (optional)
  - [ ] `APPLE_TEAM_ID` (optional)

## API Keys Setup (If Using Cloud LLMs)

- [ ] Go to Vibecode app ENV tab
- [ ] Add `EXPO_PUBLIC_MONGARS_OPENAI_API_KEY`
- [ ] Add `EXPO_PUBLIC_MONGARS_ANTHROPIC_API_KEY`
- [ ] Add `EXPO_PUBLIC_MONGARS_GROK_API_KEY`
- [ ] Add `EXPO_PUBLIC_MONGARS_PROJECT_ID`
- [ ] Restart Expo dev server to load new keys

## Deployment - Option A: Optimized Workflow (Recommended)

### Step 1: Download Models (5 min)

- [ ] Go to GitHub repository
- [ ] Click **Actions** tab
- [ ] Select **Download ML Models (No Build)** workflow
- [ ] Click **Run workflow**
- [ ] Select model (recommend: `qwen2-0.5b`)
- [ ] Set `commit_to_repo: true`
- [ ] Click **Run workflow**
- [ ] Wait for completion (green checkmark)

### Step 2: Pull to Vibecode (30 sec)

- [ ] Open terminal in Vibecode
- [ ] Run: `git pull origin main`
- [ ] Verify models: `ls -lh ./assets/models/`
- [ ] Should see .gguf files

### Step 3: Test Locally (Optional but Recommended)

- [ ] Open Vibecode app
- [ ] Test app functionality
- [ ] Check logs for errors
- [ ] Verify models load correctly

### Step 4: Build iOS App (25 min)

- [ ] In Vibecode terminal, run:
  ```bash
  eas build --platform ios --profile production --non-interactive
  ```
- [ ] Wait for build to start
- [ ] Copy build URL from output
- [ ] Save build URL for reference
- [ ] Monitor build status: `eas build:list --platform ios --limit 1`
- [ ] Wait for build to complete

### Step 5: Submit to App Store (5 min)

- [ ] After build completes, run:
  ```bash
  eas submit --platform ios --latest
  ```
- [ ] Or submit specific build:
  ```bash
  eas submit --platform ios --url BUILD_URL
  ```
- [ ] Follow prompts for App Store submission
- [ ] Verify submission in App Store Connect

### Step 6: Post-Deployment

- [ ] Test app on TestFlight
- [ ] Check for crashes in Xcode Organizer
- [ ] Submit for App Store review
- [ ] Monitor review status

**Total Time:** ~31 minutes
**Cost:** 6 GitHub Actions minutes + 25 EAS Build minutes

---

## Deployment - Option B: Full Automation

### Step 1: Run Full Workflow (35 min)

- [ ] Go to GitHub → Actions
- [ ] Select **Download ML Models and Build iOS App**
- [ ] Click **Run workflow**
- [ ] Select options:
  - [ ] Model: `qwen2-0.5b` or `llama-3.2-1b`
  - [ ] `build_ios: true`
  - [ ] Profile: `production`
- [ ] Click **Run workflow**
- [ ] Wait for completion (35 minutes)

### Step 2: Download Build

- [ ] Go to Expo dashboard
- [ ] Find your build
- [ ] Download .ipa file
- [ ] Or note build URL

### Step 3: Submit to App Store

- [ ] If auto-submit failed, run:
  ```bash
  eas submit --platform ios --url BUILD_URL
  ```
- [ ] Or submit via Transporter app

**Total Time:** ~35 minutes
**Cost:** 35 GitHub Actions minutes

---

## Deployment - Option C: Direct Download (No GitHub)

### Step 1: Download Model Directly (5-10 min)

- [ ] In Vibecode terminal:
  ```bash
  pip3 install huggingface-hub
  python3 -c "
  from huggingface_hub import hf_hub_download
  hf_hub_download(
      repo_id='Qwen/Qwen2-0.5B-Instruct-GGUF',
      filename='qwen2-0_5b-instruct-q4_k_m.gguf',
      local_dir='./assets/models',
      local_dir_use_symlinks=False
  )
  "
  ```
- [ ] Verify: `ls -lh ./assets/models/`

### Step 2-6: Same as Option A Steps 3-6

---

## Troubleshooting Checklist

### Build Fails

- [ ] Check `.easignore` exists and contains `node_modules/`
- [ ] Verify all dependencies install: `bun install`
- [ ] Check EAS build logs: `eas build:view BUILD_ID`
- [ ] Ensure no files exceed 100MB (or use Git LFS)

### Models Not Found

- [ ] Run: `git pull origin main`
- [ ] Check: `ls -lh ./assets/models/`
- [ ] If missing, re-run GitHub Action
- [ ] Or download directly with Python script

### Authentication Errors

- [ ] Re-login: `eas logout && eas login`
- [ ] Check: `eas whoami`
- [ ] Verify `EXPO_TOKEN` in GitHub secrets

### App Store Submission Fails

- [ ] Check Apple ID credentials
- [ ] Verify app is configured in App Store Connect
- [ ] Check bundle identifier matches
- [ ] Ensure certificates are valid

---

## Quick Reference Commands

```bash
# Status checks
eas whoami
eas build:list --platform ios --limit 5
git status

# Pull latest
git pull origin main

# Build
eas build --platform ios --profile production

# Submit
eas submit --platform ios --latest

# View logs
eas build:view BUILD_ID

# Cancel build
eas build:cancel BUILD_ID
```

---

## Model Selection Guide

- [ ] **qwen2-0.5b** (326 MB)
  - ✅ Fastest download
  - ✅ Lowest memory usage
  - ✅ Good for testing
  - ⚠️ Lower quality responses

- [ ] **llama-3.2-1b** (730 MB)
  - ✅ Best balance
  - ✅ Good quality
  - ✅ Reasonable size
  - ✅ Recommended for production

- [ ] **smollm2-1.7b** (1.1 GB)
  - ✅ Higher quality
  - ⚠️ Larger download
  - ⚠️ More memory needed

- [ ] **phi-3-mini** (2.3 GB)
  - ✅ Highest quality
  - ⚠️ Largest file
  - ⚠️ Slowest inference
  - ⚠️ May hit GitHub LFS limits

---

## Time Estimates

| Task                    | Estimated Time |
| ----------------------- | -------------- |
| GitHub Actions download | 5 min          |
| Git pull                | 30 sec         |
| Direct model download   | 5-10 min       |
| EAS build               | 25 min         |
| App Store submit        | 5 min          |
| TestFlight processing   | 10-30 min      |
| App Store review        | 1-3 days       |

---

## Important Notes

- ✅ `.easignore` reduces upload from 2.2 GB → <100 MB
- ✅ API keys set in Vibecode ENV tab (not in code)
- ✅ Models can be downloaded via GitHub or direct
- ✅ Git LFS recommended for models in production (see GIT_LFS_GUIDE.md)
- ✅ Always test locally before building
- ✅ Save build URLs for future reference
- ✅ Use preview builds for internal testing

---

## Resources

- Workflow guide: [WORKFLOW_GUIDE.md](./WORKFLOW_GUIDE.md)
- Quick commands: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- Deployment details: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Git LFS setup: [GIT_LFS_GUIDE.md](./GIT_LFS_GUIDE.md)
- Summary of changes: [SUMMARY.md](./SUMMARY.md)

---

## Completion

- [ ] Deployment successful
- [ ] App uploaded to App Store Connect
- [ ] TestFlight build available
- [ ] Submitted for review
- [ ] Build URL saved for reference
- [ ] Logs checked for errors
- [ ] Team notified

**Deployed by:** ******\_\_\_******
**Date:** ******\_\_\_******
**Build URL:** ******\_\_\_******
**Model used:** ******\_\_\_******
**Notes:** ******\_\_\_******

---

**Next deployment:** Copy this checklist and start again! 🚀
