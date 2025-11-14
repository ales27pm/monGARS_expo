#!/bin/bash
# GitHub Repository Creation and Push Script
# This script creates a new GitHub repository and pushes the complete codebase

set -euo pipefail  # Exit on error, undefined vars, and fail pipelines
IFS=$'\n\t'

DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

resolve_current_branch() {
    local branch
    branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || \
        git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

    if [[ -z "$branch" || "$branch" == "HEAD" ]]; then
        echo ""
        return
    fi

    echo "$branch"
}

CURRENT_BRANCH="$(resolve_current_branch)"

if [[ -z "$CURRENT_BRANCH" ]]; then
    echo "⚠ Could not determine the active branch. Falling back to '${DEFAULT_BRANCH}'."
    CURRENT_BRANCH="$DEFAULT_BRANCH"
fi

REPO_NAME="monGARS_expo"
REPO_DESCRIPTION="Privacy-First On-Device ML App - 100% Offline AI with Semantic Memory and RAG"

echo "================================================"
echo "GitHub Repository Setup for ${REPO_NAME}"
echo "================================================"
echo ""

# Step 1: Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo "ERROR: GITHUB_TOKEN environment variable is not set!"
    echo ""
    echo "Please set your GitHub token:"
    echo "  export GITHUB_TOKEN='your_github_personal_access_token'"
    echo ""
    echo "To create a token:"
    echo "  1. Go to https://github.com/settings/tokens"
    echo "  2. Click 'Generate new token' (classic)"
    echo "  3. Give it a name: 'monGARS_expo'"
    echo "  4. Select scopes: 'repo' (all)"
    echo "  5. Generate token and copy it"
    echo ""
    exit 1
fi

# Step 2: Get GitHub username
echo "→ Getting GitHub user info..."
USER_INFO=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" https://api.github.com/user)
GITHUB_USER=$(echo $USER_INFO | grep -o '"login": *"[^"]*"' | cut -d'"' -f4)

if [ -z "$GITHUB_USER" ]; then
    echo "ERROR: Failed to authenticate with GitHub token"
    echo "Response: $USER_INFO"
    exit 1
fi

echo "✓ Authenticated as: ${GITHUB_USER}"
echo ""

# Step 3: Create GitHub repository
echo "→ Creating GitHub repository: ${REPO_NAME}..."
CREATE_RESPONSE=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/user/repos \
    -d '{
        "name": "'"${REPO_NAME}"'",
        "description": "'"${REPO_DESCRIPTION}"'",
        "private": false,
        "has_issues": true,
        "has_projects": true,
        "has_wiki": false,
        "auto_init": false
    }')

# Check if repo was created
if echo "$CREATE_RESPONSE" | grep -q '"id"'; then
    REPO_URL=$(echo $CREATE_RESPONSE | grep -o '"html_url": *"[^"]*"' | cut -d'"' -f4)
    echo "✓ Repository created: ${REPO_URL}"
else
    # Check if repo already exists
    if echo "$CREATE_RESPONSE" | grep -q "already exists"; then
        echo "⚠ Repository already exists"
        REPO_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}"
        echo "  Using existing repo: ${REPO_URL}"
    else
        echo "ERROR: Failed to create repository"
        echo "Response: $CREATE_RESPONSE"
        exit 1
    fi
fi
echo ""

# Step 4: Add GitHub remote
echo "→ Configuring git remote for branch '${CURRENT_BRANCH}'..."
REMOTE_URL="https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
if git remote get-url github >/dev/null 2>&1; then
    echo "  Updating existing 'github' remote URL..."
    git remote set-url github "$REMOTE_URL"
else
    echo "  Adding 'github' remote..."
    git remote add github "$REMOTE_URL"
fi
echo "✓ Remote ready"
echo ""

# Step 5: Commit any pending changes
echo "→ Checking for uncommitted changes..."
CHANGES="$(git status --porcelain)"
if [[ -n "$CHANGES" ]]; then
    echo "  Committing changes..."
    git add -A
    git commit -m "Complete privacy-first on-device ML app with semantic memory and RAG

Features:
- On-device LLM inference with llama.rn
- Semantic vector memory with MMKV
- RAG (Retrieval-Augmented Generation)
- Text chunking and context management
- Privacy-first UI with offline indicators
- GitHub Actions for model downloads and EAS Build
- Complete deployment pipeline to iOS App Store

Tech Stack:
- Expo SDK 53 + React Native 0.76.7
- llama.rn for GGUF models
- MMKV for vector storage
- EAS Build for iOS deployment

Privacy:
- 100% on-device processing
- Zero cloud API calls
- GDPR/CCPA compliant
- Works fully offline"
    echo "✓ Changes committed"
else
    echo "  No uncommitted changes"
fi
echo ""

# Step 6: Push to GitHub
echo "→ Pushing to GitHub (branch: ${CURRENT_BRANCH})..."
git push -u github "$CURRENT_BRANCH" --force-with-lease
echo "✓ Code pushed successfully!"
echo ""

# Step 7: Create initial release
echo "→ Creating initial release..."
RELEASE_RESPONSE=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github.v3+json" \
    https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}/releases \
    -d '{
        "tag_name": "v1.0.0",
        "name": "v1.0.0 - Privacy-First On-Device ML",
        "body": "## 🎉 Initial Release\n\n**Privacy-First On-Device ML App** with complete offline capabilities.\n\n### Features\n- ✅ On-device LLM inference with llama.rn\n- ✅ Semantic vector memory with MMKV\n- ✅ RAG system for context-aware responses\n- ✅ Text chunking and context management\n- ✅ Privacy-focused UI\n- ✅ GitHub Actions CI/CD\n- ✅ EAS Build for iOS\n\n### Getting Started\nSee [DEPLOYMENT.md](./DEPLOYMENT.md) for complete instructions.\n\n### Privacy\n- 100% on-device processing\n- Zero cloud API calls\n- Your data never leaves your device",
        "draft": false,
        "prerelease": false
    }')

if echo "$RELEASE_RESPONSE" | grep -q '"id"'; then
    RELEASE_URL=$(echo $RELEASE_RESPONSE | grep -o '"html_url": *"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "✓ Release created: ${RELEASE_URL}"
else
    echo "⚠ Could not create release (may already exist)"
fi
echo ""

# Step 8: Success summary
echo "================================================"
echo "✅ SUCCESS!"
echo "================================================"
echo ""
echo "Repository: ${REPO_URL}"
echo ""
echo "Next Steps:"
echo "  1. Visit your repository: ${REPO_URL}"
echo "  2. Set up GitHub Actions secrets (see DEPLOYMENT.md)"
echo "  3. Run the 'Download ML Models and Build iOS App' workflow"
echo "  4. Submit to App Store when build completes"
echo ""
echo "Secrets to add in GitHub:"
echo "  - EXPO_TOKEN"
echo "  - APPLE_ID"
echo "  - APPLE_APP_SPECIFIC_PASSWORD"
echo "  - APPLE_TEAM_ID"
echo "  - ASC_APP_ID"
echo ""
echo "Documentation:"
echo "  - README.md - Complete feature overview"
echo "  - DEPLOYMENT.md - Deployment guide"
echo "  - VIBECODE_REQUIRED_PACKAGES.md - Package requests"
echo ""
echo "================================================"
