# Git LFS (Large File Storage) for ML Models

## ⚠️ Important Note About Large Models

ML model files (.gguf) are very large (300MB - 2GB each). GitHub has file size limits:

- **Without Git LFS**: 100MB per file limit
- **With Git LFS**: 2GB per file, but uses LFS storage quota

## Current Setup

This project is configured to **commit models directly** to the repository. This works if:
- ✅ Model files are under 100MB, OR
- ✅ You use Git LFS (recommended for production)

## Option 1: Use Git LFS (Recommended)

### Setup Git LFS

```bash
# Install Git LFS (one-time, on your system)
# macOS
brew install git-lfs

# Linux
sudo apt-get install git-lfs

# Initialize Git LFS in repo
git lfs install
```

### Track Model Files

```bash
# Track all .gguf files with LFS
git lfs track "*.gguf"
git lfs track "assets/models/*.gguf"

# This creates .gitattributes file
git add .gitattributes
git commit -m "Configure Git LFS for model files"
git push
```

### Verify LFS is Working

```bash
# Check LFS tracked files
git lfs ls-files

# Check LFS status
git lfs status

# See LFS storage usage
git lfs env
```

## Option 2: Keep Models Out of Git (Alternative)

If you don't want to commit large models to Git:

### Update .gitignore

```bash
# Add to .gitignore
echo "assets/models/*.gguf" >> .gitignore
git add .gitignore
git commit -m "Ignore large model files"
```

### Download Models Locally

```bash
# Use GitHub Actions to download to artifacts
# Or download directly in Vibecode:
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

## Option 3: Use GitHub Actions Artifacts (Current Default)

The `download-models-only.yml` workflow saves models as GitHub Actions artifacts:

**Pros:**
- ✅ No Git LFS needed
- ✅ No repository size increase
- ✅ Fast downloads in GitHub Actions

**Cons:**
- ❌ Artifacts expire after 7 days
- ❌ Need to re-download periodically
- ❌ Not available via `git pull`

**To use artifacts approach:**
1. Set `commit_to_repo: false` in workflow
2. Download artifact from Actions tab
3. Extract to `assets/models/`

## Comparison

| Approach | Repo Size | Git LFS Needed | Availability | Best For |
|----------|-----------|----------------|--------------|----------|
| **Commit with LFS** | Small | Yes | Always | Production |
| **Commit without LFS** | Large | No | Always | Small models (<100MB) |
| **Artifacts** | No change | No | 7 days | Testing |
| **Ignore in Git** | No change | No | Manual download | Development |

## Recommended Setup for Production

```bash
# 1. Install and setup Git LFS
git lfs install
git lfs track "*.gguf"

# 2. Commit the tracking config
git add .gitattributes
git commit -m "Track GGUF models with Git LFS"
git push

# 3. Run GitHub Action with commit enabled
# Go to Actions → Download ML Models (No Build)
# Set commit_to_repo: true
# Models will be committed via LFS

# 4. Pull in Vibecode
git pull origin main  # Downloads LFS files automatically

# 5. Build and deploy
eas build --platform ios --profile production
eas submit --platform ios --latest
```

## Checking Model Files

```bash
# See model file sizes
du -h assets/models/*.gguf

# Check if using LFS
git lfs ls-files

# If using LFS, files show as pointers in Git
# If not using LFS, files are stored directly
cat .gitattributes
```

## Troubleshooting

### "File exceeds GitHub's file size limit of 100MB"

```bash
# Solution: Use Git LFS
git lfs install
git lfs track "*.gguf"
git add .gitattributes
git lfs migrate import --include="*.gguf"
git push
```

### "LFS bandwidth quota exceeded"

```bash
# Solution: Use GitHub Actions artifacts instead
# Set commit_to_repo: false in workflow
# Download artifacts manually
```

### "Models not downloading with git pull"

```bash
# If using LFS, ensure it's installed
git lfs install
git lfs pull

# Check LFS is configured
cat .gitattributes
```

## Current Configuration

The project currently uses:
- ✅ Direct commit (in workflow: `commit_to_repo: true`)
- ⚠️ Git LFS not configured (add `.gitattributes` to enable)

**To enable Git LFS:**
```bash
git lfs install
git lfs track "*.gguf"
git add .gitattributes
git commit -m "Enable Git LFS for models"
git push
```

---

**Need help?** See [WORKFLOW_GUIDE.md](./WORKFLOW_GUIDE.md) for complete deployment workflow.
