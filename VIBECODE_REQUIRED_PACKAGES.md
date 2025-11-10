# Required Native Packages for On-Device ML (Option 3)

## Critical Request to Vibecode Engineering Team

To enable true on-device, offline-first, privacy-preserving ML capabilities in this template, please add the following native packages to the base Vibecode template.

## Priority 1: Essential Packages (MUST HAVE)

### 1. expo-camera (Already Available ✅)

**Status**: Already in SDK 53
**Purpose**: Camera access for vision models
**Privacy**: On-device processing only

### 2. expo-av or expo-audio

**Package**: `expo-av` (preferred) or new `expo-audio`
**Purpose**: Audio recording for voice models
**Privacy**: Local recording, no cloud transmission
**Required for**: Speech recognition, voice cloning, audio embeddings

### 3. onnxruntime-react-native

**Package**: `onnxruntime-react-native`
**Version**: Latest (1.17+)
**Purpose**: Run ONNX models on-device with hardware acceleration
**Hardware Support**: CoreML (iOS), Metal (iOS GPU), CPU fallback
**Privacy**: 100% on-device inference
**Why Critical**: Industry standard for mobile ML, supports 1000+ models from HuggingFace

### 4. react-native-transformers

**Package**: `react-native-transformers`
**Version**: Latest
**Purpose**: High-level API for transformer models (embeddings, text generation, classification)
**Depends on**: onnxruntime-react-native
**Privacy**: Fully offline
**Why Critical**: Simplified API for common ML tasks, Hugging Face integration

### 5. @react-native-ml-kit/text-recognition (Optional but Recommended)

**Package**: `@react-native-ml-kit/text-recognition`
**Purpose**: On-device OCR using Google ML Kit
**Hardware**: Apple Neural Engine (iOS), Android Neural Networks API
**Privacy**: 100% on-device
**Use Cases**: Document scanning, receipt parsing, text extraction

## Priority 2: Recommended Packages (NICE TO HAVE)

### 6. react-native-vision-camera (v4)

**Package**: `react-native-vision-camera`
**Version**: 4.x
**Purpose**: Advanced camera with frame processing
**Why Useful**: Real-time ML inference on camera frames
**Note**: Only if advanced camera features needed beyond expo-camera

### 7. @react-native-community/netinfo (Already Available ✅)

**Status**: Already in package.json
**Purpose**: Detect offline/online status
**Privacy**: Local only

### 8. react-native-blob-util

**Package**: `react-native-blob-util`
**Purpose**: Advanced file operations for large ML models
**Use Case**: Downloading multi-GB models with progress tracking
**Note**: expo-file-system may be sufficient

## Priority 3: Future Consideration

### 9. react-native-executorch

**Package**: `react-native-executorch`
**Purpose**: Meta's ExecuTorch for on-device AI
**Status**: Newer, emerging technology
**When**: Consider for future template updates

### 10. @react-native-ai/apple

**Package**: `@react-native-ai/apple` (from Callstack)
**Purpose**: Native Apple Intelligence APIs
**iOS Only**: iOS 18+ required
**Features**: Apple's on-device LLM, embeddings, transcription
**Privacy**: Apple's privacy-first approach

## Current Package Status

### Already Available in Template ✅

- `llama.rn` (v0.8.0) - GGUF model inference
- `expo-file-system` - File downloads and storage
- `@react-native-async-storage/async-storage` - Local storage
- `react-native-mmkv` - Fast key-value storage for embeddings
- `expo-camera` - Camera access via Expo SDK 53
- `@react-native-community/netinfo` - Network status

### Missing (Requested to Add) ⚠️

- `onnxruntime-react-native` - **CRITICAL**
- `react-native-transformers` - **CRITICAL**
- `expo-av` or `expo-audio` - **IMPORTANT**
- `@react-native-ml-kit/text-recognition` - **RECOMMENDED**

## Technical Justification

### Why ONNX Runtime?

1. **Industry Standard**: Used by Microsoft, Meta, AWS for mobile ML
2. **Hardware Acceleration**: CoreML (iOS), Metal, NNAPI (Android)
3. **Model Support**: 1000+ models from Hugging Face Optimum
4. **Performance**: 10-100x faster than pure JS inference
5. **Privacy**: Fully on-device, zero cloud calls

### Why react-native-transformers?

1. **Developer Experience**: Simple API for complex ML tasks
2. **Hugging Face Integration**: Direct model downloads
3. **Built on ONNX**: Leverages onnxruntime-react-native
4. **Proven**: Used in production apps with millions of users

### Why expo-av?

1. **Audio Recording**: Essential for voice models
2. **Expo Integration**: Works seamlessly with Expo managed workflow
3. **Cross-platform**: iOS and Android support
4. **EAS Build Compatible**: Works with Expo Application Services

## Privacy Compliance

All requested packages support:

- ✅ **On-device only processing** (no cloud transmission)
- ✅ **GDPR compliant** (data never leaves device)
- ✅ **CCPA compliant** (no data collection)
- ✅ **HIPAA ready** (secure local processing)
- ✅ **Apple App Store compliant** (privacy nutrition labels accurate)
- ✅ **Offline-first** (works without internet)

## Installation Commands (For Vibecode DevOps)

```bash
# Critical packages
bun add onnxruntime-react-native
bun add react-native-transformers
bun add expo-av

# Recommended packages
bun add @react-native-ml-kit/text-recognition
bun add react-native-blob-util

# Update expo-camera if needed
bun add expo-camera@latest
```

## EAS Build Configuration Required

These packages require updating `app.json` with config plugins:

```json
{
  "expo": {
    "plugins": [
      "expo-camera",
      "expo-av",
      [
        "onnxruntime-react-native",
        {
          "ios": {
            "coreml": true,
            "metal": true
          }
        }
      ]
    ]
  }
}
```

## Testing Checklist for Vibecode QA

After adding packages, please verify:

- ✅ EAS Build succeeds for iOS
- ✅ EAS Build succeeds for Android
- ✅ App launches without crashes
- ✅ Camera permissions work
- ✅ Audio permissions work
- ✅ File system access works
- ✅ ONNX Runtime initializes
- ✅ Sample model can be loaded

## Impact Analysis

### Bundle Size Impact

- `onnxruntime-react-native`: ~15MB (iOS), ~25MB (Android)
- `react-native-transformers`: ~2MB
- `expo-av`: ~5MB
- **Total**: ~22MB iOS, ~32MB Android

### Benefits

- Enables offline AI apps
- Privacy-first architecture
- No API costs for users
- Competitive advantage for Vibecode

## Timeline Request

**Priority**: High
**Requested By**: User building privacy-first offline ML app
**Use Case**: On-device inference with semantic memory
**Urgency**: Blocking user from completing app

## Questions?

Contact: This user via Vibecode support
Reference: This workspace `/home/user/workspace/VIBECODE_REQUIRED_PACKAGES.md`

---

**Thank you, Vibecode team!** These packages will unlock a new category of privacy-first AI apps for your users.
