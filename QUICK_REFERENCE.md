# Quick Reference: Build & Deploy from Vibecode

## 🚀 Fastest Path to App Store

### Prerequisites (One-time Setup)
```bash
# Install EAS CLI if needed
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure
```

### Main Workflow

#### 1️⃣ Download Models (GitHub Actions)
- Go to GitHub → Actions → **Download ML Models (No Build)**
- Click **Run workflow**
- Select model (recommend: `qwen2-0.5b`)
- Wait 5 minutes

#### 2️⃣ Pull to Vibecode
```bash
git pull origin main
```

#### 3️⃣ Build iOS App
```bash
eas build --platform ios --profile production --non-interactive
```
*Takes ~25 minutes*

#### 4️⃣ Submit to App Store
```bash
eas submit --platform ios --latest
```
*Takes ~5 minutes*

---

## 📱 Complete Commands Reference

### Check Status
```bash
# Check if logged in
eas whoami

# Check build status
eas build:list --platform ios --limit 5

# Check project config
eas config
```

### Build Commands
```bash
# Production build (for App Store)
eas build --platform ios --profile production

# Preview build (internal testing)
eas build --platform ios --profile preview

# Development build (with dev client)
eas build --platform ios --profile development

# Build without waiting
eas build --platform ios --profile production --no-wait

# Build with auto-submit
eas build --platform ios --profile production --auto-submit
```

### Submit Commands
```bash
# Submit latest build
eas submit --platform ios --latest

# Submit specific build by ID
eas submit --platform ios --id BUILD_ID

# Submit specific build by URL
eas submit --platform ios --url BUILD_URL

# Submit without interaction
eas submit --platform ios --latest --non-interactive
```

### View Builds
```bash
# List recent builds
eas build:list --platform ios

# View build details
eas build:view BUILD_ID

# Cancel a build
eas build:cancel BUILD_ID

# Open build in browser
eas build:view BUILD_ID --web
```

---

## 🔧 Troubleshooting

### "Archive too large" Error
```bash
# Verify .easignore exists and excludes node_modules
cat .easignore

# Should contain:
# node_modules/
# .expo/
# *.log
```

### "Models not found"
```bash
# Check if models exist
ls -lh ./assets/models/

# If missing, run GitHub Action or download directly
git pull origin main
```

### "Authentication failed"
```bash
# Re-login to Expo
eas logout
eas login

# Verify credentials
eas whoami
```

### "Build failed"
```bash
# View build logs
eas build:view BUILD_ID

# Check for common issues:
# - Missing environment variables
# - Code signing issues
# - Large archive size
# - Dependency conflicts
```

---

## 📊 Typical Timeline

| Step | Time | Where |
|------|------|-------|
| Download models (GitHub) | 5 min | GitHub Actions |
| Pull to Vibecode | 30 sec | Vibecode |
| EAS Build | 25 min | EAS Cloud |
| Submit to App Store | 5 min | Vibecode |
| **Total** | **~35 min** | |

---

## 💡 Pro Tips

1. **Use `--no-wait` flag** if you want to start build and do other work
   ```bash
   eas build --platform ios --profile production --no-wait
   # Continue working, check status later
   eas build:list
   ```

2. **Download small model first** for faster testing
   ```bash
   # qwen2-0.5b = 326MB (fast)
   # llama-3.2-1b = 730MB (better quality)
   ```

3. **Test locally before building**
   ```bash
   # Run in Vibecode app first
   # Make sure everything works
   # Then build for App Store
   ```

4. **Keep build URLs** for future reference
   ```bash
   # Save successful build URLs
   # Can resubmit without rebuilding:
   eas submit --platform ios --url BUILD_URL
   ```

5. **Use preview builds** for internal testing
   ```bash
   # Faster, no App Store review needed
   eas build --platform ios --profile preview
   # Share with TestFlight
   ```

---

## 🎯 Quick Commands Cheat Sheet

```bash
# Full deployment (one command at a time)
git pull origin main
eas build --platform ios --profile production
eas submit --platform ios --latest

# View status
eas build:list --platform ios --limit 5

# Emergency: cancel current build
eas build:cancel

# Resubmit existing build
eas submit --platform ios --url YOUR_BUILD_URL
```

---

## 📞 Need Help?

- Full guide: [WORKFLOW_GUIDE.md](./WORKFLOW_GUIDE.md)
- Deployment details: [DEPLOYMENT.md](./DEPLOYMENT.md)
- EAS Build docs: https://docs.expo.dev/build/introduction/
- EAS Submit docs: https://docs.expo.dev/submit/introduction/
