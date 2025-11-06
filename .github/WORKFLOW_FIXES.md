# GitHub Actions Workflow Fixes

## Problems Fixed

### 1. Authentication Error
**Error:** `fatal: could not read Username for 'https://github.com': terminal prompts disabled`

**Root Cause:** The workflow was explicitly passing `token: ${{ secrets.GITHUB_TOKEN }}` which was being masked as `***`, causing authentication to fail.

**Solution:** Removed explicit token parameter. `actions/checkout@v4` automatically uses `GITHUB_TOKEN` with proper permissions when the job has `permissions: contents: write`.

### 2. Artifacts Upload Warning
**Error:** `No files were found with the provided path: ~/.expo/ *.log`

**Root Cause:** Invalid path pattern using `~` (home directory) and space-separated patterns.

**Solution:** Changed to relative paths with proper YAML multiline format:
```yaml
path: |
  **/*.log
  .expo/
if-no-files-found: warn
```

### 3. Large File Size Error (NEW)
**Error:** `File assets/models/qwen2-0_5b-instruct-q4_k_m.gguf is 379.38 MB; this exceeds GitHub's file size limit of 100.00 MB`

**Root Cause:** ML model files (.gguf) are too large for regular Git commits. GitHub has a 100MB file size limit.

**Solution:** Implemented Git LFS (Large File Storage) to handle large model files:
- Created `.gitattributes` to track `*.gguf` files with LFS
- Added LFS setup and tracking in all workflows
- Updated commit/push steps to use `git lfs push`

### 4. Monolithic Workflow Structure
**Problem:** Large, single-job workflows that are hard to debug and maintain.

**Solution:** Created modular workflow structure with separate, focused jobs.

## New Workflow Structure

### 1. Reusable Workflow: `download-models.yml`
- Focused solely on downloading ML models
- Can be called by other workflows
- Returns output about whether models were committed

### 2. Main Workflow: `deploy-modular.yml`
- Orchestrates the entire deployment
- Uses the reusable download-models workflow
- Separate jobs for:
  - Model downloads
  - iOS build
  - App Store submission (optional)
  - Summary generation

### 3. Updated Legacy Workflows
- Fixed authentication in `deploy-macos-native.yml`
- Fixed authentication in `build-for-vibecode.yml`
- Fixed artifact upload paths in both

## How to Use

### Option 1: Use New Modular Workflow (Recommended)
```bash
# Go to GitHub Actions tab
# Select "Deploy to iOS (Modular)" workflow
# Click "Run workflow"
# Choose options:
#   - Model: qwen2-0.5b, llama-3.2-1b, etc.
#   - Platform: eas-cloud or macos-local
#   - Submit to App Store: true/false
```

### Option 2: Use Legacy Workflows
The old workflows (`deploy-macos-native.yml` and `build-for-vibecode.yml`) have been fixed and will continue to work.

## Benefits of Modular Structure

1. **Better Error Isolation** - If model download fails, you know exactly where
2. **Easier Debugging** - Each job is focused and simple
3. **Reusability** - The download-models workflow can be used by multiple workflows
4. **Parallel Execution** - Jobs can run in parallel when dependencies allow
5. **Cleaner Logs** - Each job has its own log section
6. **Conditional Steps** - Easy to skip App Store submission or use different platforms

## Permissions

Each job now has minimal required permissions:
- `download-models`: `contents: write` (to commit models)
- `build-ios`: `contents: read` (read-only)
- `submit-to-app-store`: `contents: read` (read-only)

This follows the principle of least privilege for better security.

## Next Steps

1. Test the new `deploy-modular.yml` workflow
2. Once confirmed working, consider deprecating the old workflows
3. Add more reusable workflows as needed (e.g., `run-tests.yml`, `lint.yml`)

## Troubleshooting

If you still see authentication errors:
1. Check that the repository is not private, or
2. Ensure `GITHUB_TOKEN` has proper permissions in repository settings
3. For private repos, you may need a Personal Access Token (PAT)

### Git LFS Setup

**Important:** Git LFS is now required for this repository due to large ML model files.

**GitHub LFS Quotas:**
- Free accounts: 1 GB storage, 1 GB/month bandwidth
- Pro accounts: 50 GB storage, 100 GB/month bandwidth
- Large files are only downloaded when needed (not on every clone)

**Local Setup (if you need to work with models locally):**
```bash
# Install Git LFS (one-time setup)
# macOS
brew install git-lfs

# Ubuntu/Debian
sudo apt-get install git-lfs

# Windows
# Download from https://git-lfs.github.com/

# Initialize LFS in your repo
git lfs install

# Clone or pull the repository
git pull

# LFS files will be automatically downloaded
```

**Files Tracked by LFS:**
- `*.gguf` - ML model files (GGUF format)
- `*.bin` - Binary model files
- `*.h5` - Keras/TensorFlow models
- `*.pb` - Protocol buffer models
- `*.onnx` - ONNX models
- `*.safetensors` - SafeTensors format

**Checking LFS Status:**
```bash
# See which files are tracked by LFS
git lfs ls-files

# See LFS bandwidth usage
git lfs env
```
