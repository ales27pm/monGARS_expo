# ML Model Management - Runtime Download Implementation

## Overview

As of this update, ML models are **downloaded at runtime** by users, not bundled with the app. This provides significant benefits:

### ✅ Benefits

1. **Smaller App Size** - Base app is ~50MB instead of 400MB+
2. **User Choice** - Users select and download only the models they want
3. **Easy Updates** - Models can be updated without rebuilding the app
4. **No GitHub LFS Costs** - Avoids storage and bandwidth limits
5. **Faster CI/CD** - Builds complete in minutes, not hours

### 📱 User Experience

Users can:
- Browse available ML models in the app
- See model details (size, quality, recommendations)
- Download models with progress tracking
- Switch between models
- Delete models to free up storage
- See total storage used by models

## Implementation

### Files Created

1. **`src/services/modelDownloadService.ts`**
   - Service for downloading models from HuggingFace
   - Handles download progress, pause/resume, cancellation
   - Manages local file storage
   - Provides storage usage information

2. **`src/state/modelStore.ts`**
   - Zustand store for model state management
   - Persists active model and downloaded model list
   - Tracks download progress for each model

3. **`src/screens/ModelManagementScreen.tsx`**
   - Beautiful UI for browsing and managing models
   - Shows download progress with visual indicators
   - Allows model selection, download, and deletion
   - Displays storage statistics

### Available Models

Pre-configured models optimized for mobile (defined in `src/types/models.ts`):

| Model | Size | Description | Recommended |
|-------|------|-------------|-------------|
| Qwen2 0.5B | 326 MB | Fastest, great for older devices | ✅ |
| Llama 3.2 1B | 730 MB | Best balance of quality and speed | ✅ |
| SmolLM2 1.7B | 1.1 GB | Higher quality, needs more RAM | - |
| Phi-3 Mini | 2.3 GB | Highest quality, needs 6GB+ RAM | - |

### Usage

```typescript
import { useModelStore } from "./state/modelStore";
import { modelDownloadService } from "./services/modelDownloadService";

// In your component
const activeModel = useModelStore(s => s.activeModel);
const downloadModel = useModelStore(s => s.downloadModel);
const isModelDownloaded = useModelStore(s => s.isModelDownloaded);

// Download a model
await downloadModel(model, (progress) => {
  console.log(`${progress.progress.toFixed(1)}% downloaded`);
});

// Get local path to use with llama.rn
const modelPath = modelDownloadService.getModelPath(activeModel);
```

### Integration with Navigation

Add the ModelManagementScreen to your navigation:

```typescript
// In RootNavigator.tsx
import ModelManagementScreen from "../screens/ModelManagementScreen";

<Stack.Screen
  name="ModelManagement"
  component={ModelManagementScreen}
  options={{ title: "Model Library" }}
/>
```

## Workflow Changes

### Old Approach (Removed)
- ❌ Download models during GitHub Actions workflow
- ❌ Commit 400MB+ files to repository with Git LFS
- ❌ Pay for GitHub LFS storage and bandwidth
- ❌ Slow builds (30+ minutes to download models)
- ❌ Bundle models with app binary

### New Approach (Current)
- ✅ Build app without models (fast, ~5 minutes)
- ✅ Users download models on first launch or on-demand
- ✅ Models stored in app's document directory
- ✅ No GitHub storage costs
- ✅ Users control which models they want

### Updated Workflows

**`build-ios-simplified.yml`** - New streamlined build workflow
- No model downloading steps
- No Git LFS operations
- No model commits
- Fast, simple builds

**Legacy Workflows** - Kept for reference but deprecated:
- `build-for-vibecode.yml` - Has model download steps (deprecated)
- `deploy-macos-native.yml` - Has model download steps (deprecated)
- `download-models.yml` - Reusable model workflow (deprecated)
- `deploy-modular.yml` - Modular workflow (deprecated)

## Storage Considerations

### On-Device Storage
- Models stored in: `FileSystem.documentDirectory + 'models/'`
- Users can delete models anytime to free space
- App shows storage usage in Model Library screen

### GitHub Storage
- ✅ No longer needed - models not in repository
- Can remove Git LFS configuration if desired
- `.gitattributes` can be removed or kept for future use

## Migration Guide

If you have the old approach with models in the repository:

1. **Remove models from repository:**
   ```bash
   git rm -r assets/models/*.gguf
   git commit -m "Remove bundled models - now downloaded at runtime"
   git push
   ```

2. **Use the new simplified workflow:**
   - Go to Actions → "Build & Deploy iOS (Simplified)"
   - Run workflow without model selection

3. **Test model download in app:**
   - Open app
   - Navigate to Model Library
   - Download a model
   - Verify it works with your LLM service

## Troubleshooting

### Models won't download
- Check internet connection (required for first download)
- Verify HuggingFace URLs are accessible
- Check device storage space

### Models not found after download
- Ensure you're using `modelDownloadService.getModelPath(model)`
- Check file permissions in document directory
- Verify model completed download (check progress = 100%)

### Download cancelled unexpectedly
- Check app wasn't killed during download
- Verify stable internet connection
- Try download again (service handles partial downloads)

## Future Enhancements

Potential improvements:
- Resume incomplete downloads automatically
- Background downloads
- Download from alternative sources (CDN, P2P)
- Model compression/decompression
- Automatic model updates
- Model performance benchmarking
- Smart model recommendations based on device specs
