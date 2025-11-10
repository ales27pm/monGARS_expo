# Quick Start: Enable Native On-Device AI

## ✅ What You Need To Do

### Step 1: Run GitHub Workflow

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **"Complete Native Setup for Vibecode"** workflow
4. Click **"Run workflow"** button
5. Configure:
   - **Download models**: `yes`
   - **Model name**: `qwen2-0.5b` (recommended) or choose another
6. Click **"Run workflow"**
7. Wait 10-15 minutes for completion

### Step 2: Pull Native Files

```bash
cd /home/user/workspace
git pull origin main
```

### Step 3: Test the App

1. App will reload automatically in Vibecode
2. Go to **Models** tab
3. Tap **"Load"** on Qwen2 0.5B Instruct
4. Go to **Chat** tab
5. Type a message and send
6. 🎉 Real on-device AI chat works!

## 📦 What Gets Generated

The workflow creates and commits:

- `ios/` - Complete iOS project
- `ios/Pods/` - All CocoaPods including llama.rn
- `ios/Podfile.lock` - Dependency versions
- `assets/models/` - AI model files (if downloaded)

## 🔧 Troubleshooting

**If workflow fails:**

- Check GitHub Actions logs for errors
- Ensure EXPO_TOKEN secret is set in repo settings
- Make sure you have write permissions to the repo

**If "Module Not Available" error:**

- Verify you ran `git pull origin main` after workflow
- Check that `ios/Pods/` directory exists
- Re-run the workflow if needed

**If model not loading:**

- Check that model was downloaded (in assets/models/)
- Verify model file exists and is not corrupted
- Try downloading model via the app interface

## 🎯 Expected Result

After following these steps, you'll have:

- ✅ Full iOS native project with all pods
- ✅ llama.rn compiled and ready
- ✅ AI model downloaded and accessible
- ✅ Real on-device inference working
- ✅ 100% offline AI chat functionality

## 📚 Files Modified

The workflow will create/modify:

- `ios/` directory (new)
- `assets/models/` (new, if models downloaded)
- `.gitignore` (temporarily modified during workflow)

**Note**: The workflow handles everything automatically. You just need to run it and pull!
