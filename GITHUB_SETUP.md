# Manual GitHub Setup Instructions

Since the GITHUB_TOKEN environment variable is not available in the Vibecode environment, here are manual instructions to create the repository and push your code.

---

## Option 1: Using the Setup Script (Recommended)

### Step 1: Get Your GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it: `monGARS_expo`
4. Select scopes: **✓ repo** (all sub-options)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again)

### Step 2: Run the Setup Script

```bash
# Set your token (replace with your actual token)
export GITHUB_TOKEN='ghp_YourActualTokenHere'

# Run the setup script
cd /home/user/workspace
./setup-github.sh
```

The script will:
- ✅ Create the `monGARS_expo` repository on GitHub
- ✅ Add it as a remote named `github`
- ✅ Commit all changes
- ✅ Push the complete codebase
- ✅ Create an initial release (v1.0.0)

---

## Option 2: Manual Steps

### Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `monGARS_expo`
3. Description: `Privacy-First On-Device ML App - 100% Offline AI with Semantic Memory and RAG`
4. Make it **Public** (or Private if you prefer)
5. **Do NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

### Step 2: Add GitHub Remote

```bash
cd /home/user/workspace

# Add GitHub as a remote (replace YOUR_USERNAME with your GitHub username)
git remote add github https://github.com/YOUR_USERNAME/monGARS_expo.git
```

### Step 3: Commit All Changes

```bash
# Check status
git status

# If there are uncommitted changes, add and commit them
git add -A
git commit -m "Complete privacy-first on-device ML app

Features:
- On-device LLM inference with llama.rn
- Semantic vector memory with MMKV
- RAG (Retrieval-Augmented Generation)
- Text chunking and context management
- Privacy-first UI with offline indicators
- GitHub Actions for model downloads and EAS Build
- Complete deployment pipeline to iOS App Store"
```

### Step 4: Push to GitHub

```bash
# Push to GitHub
git push -u github main

# If you get an error about divergent branches, use:
git push -u github main --force
```

---

## Option 3: Using GitHub CLI

If you have GitHub CLI installed:

```bash
# Login to GitHub
gh auth login

# Create repository
gh repo create monGARS_expo --public --description "Privacy-First On-Device ML App - 100% Offline AI with Semantic Memory and RAG" --source=. --remote=github --push
```

---

## After Pushing to GitHub

### 1. Set Up GitHub Actions Secrets

Go to your repository on GitHub:
`https://github.com/YOUR_USERNAME/monGARS_expo/settings/secrets/actions`

Add these secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `EXPO_TOKEN` | Expo authentication token | Run `npx eas login` then copy from `~/.expo/state.json` |
| `APPLE_ID` | Your Apple ID email | Your Apple Developer account email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password | Generate at https://appleid.apple.com/account/manage |
| `APPLE_TEAM_ID` | Apple Developer Team ID | Found in Apple Developer account settings |
| `ASC_APP_ID` | App Store Connect App ID | Create app in App Store Connect first |

### 2. Run GitHub Actions Workflow

1. Go to the "Actions" tab in your repository
2. Click "Download ML Models and Build iOS App"
3. Click "Run workflow"
4. Select options:
   - Model: `llama-3.2-1b` (recommended)
   - Build iOS app: `true`
   - Profile: `production`
5. Click "Run workflow"

The workflow will:
- Download the selected model from HuggingFace
- Bundle it with the app
- Build the iOS binary with EAS Build
- Optionally submit to App Store

### 3. Monitor the Build

- Check the Actions tab for workflow progress
- Check EAS Build dashboard: https://expo.dev
- Build typically takes 15-30 minutes

### 4. Submit to App Store

After build completes:

```bash
eas submit --platform ios --latest
```

Or let the GitHub Actions workflow handle it automatically if you selected production profile.

---

## Troubleshooting

### "Authentication failed"

- Make sure your GitHub token has `repo` scope
- Token should start with `ghp_` for classic tokens or `github_pat_` for fine-grained tokens

### "Repository already exists"

- Either use a different name or delete the existing repository
- Or clone the existing repo and push to it as a new remote

### "Permission denied"

- Make sure you own the repository or have write access
- Check that your token hasn't expired

### "Everything up-to-date"

- This means all changes are already pushed
- Verify at: `https://github.com/YOUR_USERNAME/monGARS_expo`

---

## Repository Contents

After pushing, your repository will contain:

### Core Application
- `App.tsx` - Entry point
- `src/screens/OnDeviceMLDemo.tsx` - Main app screen
- `src/components/PrivacyUI.tsx` - Privacy-focused UI components
- `src/utils/on-device-llm.ts` - llama.rn integration
- `src/utils/vector-store.ts` - Vector database
- `src/utils/semantic-memory.ts` - RAG system
- `src/utils/text-chunking.ts` - Document processing
- `src/utils/context-management.ts` - Token management
- `src/utils/vector-math.ts` - Vector operations

### CI/CD & Configuration
- `.github/workflows/build-and-deploy.yml` - GitHub Actions workflow
- `eas.json` - EAS Build configuration
- `app.json` - Expo configuration
- `package.json` - Dependencies

### Documentation
- `README.md` - Complete feature overview
- `DEPLOYMENT.md` - Deployment guide
- `VIBECODE_REQUIRED_PACKAGES.md` - Package requirements for Vibecode
- `GITHUB_SETUP.md` - This file

---

## Need Help?

If you encounter issues:

1. Check the documentation in the repository
2. Review the GitHub Actions logs
3. Check EAS Build logs at https://expo.dev
4. Ensure all secrets are correctly set

---

**Your privacy-first, on-device ML app is ready to be shared with the world! 🚀**
