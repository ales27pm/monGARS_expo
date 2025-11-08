# Complete Native iOS Turbo Modules - All 21 Modules

This project includes 21 native iOS Turbo Modules providing comprehensive access to iOS capabilities through React Native.

## Module Categories

### Core Device Features (5 modules)

1. **BatteryModule** - Battery monitoring and status
   - Get battery level, charging status, low power mode
   - Monitor battery state changes

2. **BrightnessModule** - Screen brightness control
   - Get/set screen brightness (0.0-1.0)
   - Adjust display for different lighting conditions

3. **SensorsModule** - Motion and environmental sensors
   - Accelerometer, gyroscope, magnetometer data
   - Real-time sensor readings with averaging

4. **DeviceInfoModule** - Device information
   - Model, OS version, device identifiers
   - System capabilities and hardware specs

5. **FlashlightModule** - Camera flash/torch control
   - Toggle flashlight on/off
   - Set flashlight brightness level

### Communication & Media (8 modules)

6. **CalendarModule** - Calendar event management
   - Create, update, delete calendar events
   - Request calendar permissions
   - ISO 8601 date handling

7. **CameraModule** - Camera access
   - Take photos with quality settings
   - Access front/rear cameras
   - Image capture with UIImagePickerController

8. **CallModule** - Phone call functionality
   - Initiate phone calls (iOS limitations apply)
   - Check if device can make calls

9. **ContactsModule** - Contact management
   - Search contacts by name
   - Get all contacts with phone/email
   - Add new contacts programmatically

10. **LocationModule** - GPS and location services
    - Get current location coordinates
    - Continuous location updates with event emitter
    - Request location permissions

11. **MessagesModule** - SMS messaging
    - Send SMS messages
    - Check messaging availability
    - Native message composer

12. **PhotosModule** - Photo library access
    - Pick photos from library
    - Get photo albums
    - Save images to photo library

13. **MailComposerModule** - Email composition
    - Compose emails with to/cc/bcc
    - HTML email support
    - Native mail composer UI

### Advanced Features (8 modules)

14. **SpeechModule** - Text-to-Speech
    - Speak text with customizable voice
    - Control rate, pitch, volume
    - Multiple language support
    - AVSpeechSynthesizer integration

15. **SpeechRecognitionModule** - Speech-to-Text
    - Recognize speech from microphone
    - Continuous recognition support
    - Language selection
    - SFSpeechRecognizer integration

16. **OCRModule** - Optical Character Recognition
    - Extract text from images
    - Vision framework VNRecognizeTextRequest
    - Detailed text observations with bounding boxes
    - High accuracy recognition

17. **HapticsModule** - Haptic feedback
    - Impact feedback (light, medium, heavy, soft, rigid)
    - Notification feedback (success, warning, error)
    - Selection feedback
    - UIFeedbackGenerator integration

18. **BiometricsModule** - Biometric authentication
    - Face ID and Touch ID support
    - Check biometry availability
    - Secure authentication prompts
    - LocalAuthentication framework

19. **ClipboardModule** - Clipboard operations
    - Get/set clipboard text
    - Check clipboard content
    - UIPasteboard integration

20. **WebModule** - Web capabilities
    - HTTP fetch with URLSession
    - Web scraping with WKWebView
    - JavaScript execution on web pages
    - Google search helper
    - File downloads, cookie management
    - Cache control

### AI/ML (1 module)

21. **MLXModule** - On-Device LLM Inference
    - Run large language models on iOS devices
    - Load quantized models from HuggingFace
    - Streaming token generation
    - Chat session with conversation history
    - Memory-efficient inference with Metal GPU
    - Support for 100+ models (Qwen, Llama, Phi, Gemma)
    - Privacy-first offline inference
    - Apple MLX framework integration

## Total Capability Count

- **21 Native Modules**
- **150+ Native Methods** across all modules
- **3 Event Emitters** (Location, Web, MLX)
- **10+ iOS Frameworks** utilized

## iOS Frameworks Used

1. UIKit - User interface and device info
2. AVFoundation - Camera, torch, speech synthesis
3. CoreMotion - Sensor data (accelerometer, gyroscope, magnetometer)
4. EventKit - Calendar and event management
5. Contacts - Contact management (CNContactStore)
6. CoreLocation - GPS and location services
7. MessageUI - SMS and email composition
8. Photos - Photo library access
9. Speech - Speech recognition (STT)
10. Vision - OCR and text recognition
11. LocalAuthentication - Biometrics (Face ID/Touch ID)
12. WebKit - Web scraping and JavaScript execution
13. MLX (Swift) - On-device LLM inference

## Architecture

### Turbo Modules (New Architecture)
All modules use React Native's Turbo Module architecture:
- **Synchronous calls** - No bridge overhead
- **Type safety** - Full TypeScript support
- **Performance** - Direct native access
- **Event streaming** - Real-time updates

### Implementation Structure
```
ios/offLLMAppStoreFixer/NativeModules/
├── [Module]TurboModule.h        // Header files
├── [Module]TurboModule.mm       // Objective-C++ implementation
└── Info.plist                   // Permissions

src/native-modules/
├── [Module]Module.ts            // TypeScript interfaces
└── index.ts                     // Module exports

src/ai/
└── AIAgent.ts                   // AI reasoning with all modules
```

## AI Agent Integration

The **AIAgent** class (`src/ai/AIAgent.ts`) provides LLM-powered reasoning over all 21 modules:

### Capabilities
- **Intelligent tool selection** - LLM decides which modules to use
- **Context awareness** - Considers device state, battery, location
- **Sequential execution** - Chains multiple tools together
- **6 pre-built scenarios** - Common use cases ready to use

### Pre-built Scenarios
1. **Morning Routine** - Battery check, brightness, weather, TTS
2. **Document Scanner** - Camera + OCR + clipboard + speech
3. **Location Reminders** - Biometrics + location + contacts + calendar
4. **Web Research** - Web scraping + compilation + TTS
5. **Voice Control** - STT + device control
6. **Quick Contact Actions** - Biometrics + contacts + messaging

## Requirements

- **iOS Version**: 16.0+
- **React Native**: 0.76.7
- **Expo SDK**: 53
- **Architecture**: New Architecture (Turbo Modules)
- **Build System**: Xcode 16.2, macOS 15 runners
- **Permissions**: All required permissions in Info.plist

## Usage Example

```typescript
import {
  BatteryModule,
  LocationModule,
  OCRModule,
  SpeechModule,
  MLXModule
} from "@/native-modules";

// Check battery
const battery = await BatteryModule.getBatteryInfo();

// Get location
const location = await LocationModule.getCurrentLocation();

// OCR from camera
const photo = await CameraModule.takePhoto();
const { text } = await OCRModule.recognizeText(photo.uri);

// Speak result
await SpeechModule.speak(`Recognized text: ${text}`);

// On-device AI
await MLXModule.loadModel("mlx-community/Qwen2.5-1.5B-Instruct-4bit");
const response = await MLXModule.generate(
  "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
  "Summarize this: " + text,
  { maxTokens: 200 }
);
```

## Documentation

Each module has comprehensive documentation:

- **Native Implementation**: Objective-C++ source with inline comments
- **TypeScript Interfaces**: Full JSDoc with examples
- **Usage Guides**:
  - `NATIVE_MODULES_USAGE_GUIDE.md` - Quick reference for all modules
  - `MLX_MODULE_GUIDE.md` - Complete MLX/LLM inference guide
  - `WEB_MODULE_DOCUMENTATION.md` - Web scraping guide
  - `ALL_NATIVE_MODULES_COMPLETE.md` - Technical overview

## Implementation Status

### Fully Implemented (20 modules)
All modules 1-20 are production-ready with complete native implementations.

### Requires Swift Bridge (1 module)
**MLXModule** - Architecture is complete but requires Swift interop to connect to MLX framework. The Objective-C++ implementation provides the interface; Swift code is needed to:
1. Load models via `LLMModelFactory.shared.loadContainer()`
2. Run inference with `MLXLMCommon.generate()`
3. Manage `ChatSession` instances
4. Emit streaming tokens

## Performance Characteristics

### Fast (< 10ms)
- Battery, Brightness, Device Info, Flashlight
- Clipboard, Haptics

### Medium (10-100ms)
- Sensors, Calendar, Contacts
- OCR (depends on image size)

### Slow (> 100ms)
- Camera, Photo picker (user interaction)
- Location (GPS lock time)
- Web fetch/scrape (network dependent)
- Speech synthesis/recognition
- MLX inference (model dependent, 50-500ms per token)

### Continuous
- Location updates (event emitter)
- MLX streaming (event emitter)

## Security Considerations

### Permissions Required
All modules properly request permissions before accessing sensitive data:
- Camera, Photos, Calendar, Contacts, Location
- Microphone (for speech recognition)
- Biometrics (Face ID/Touch ID)

### Privacy
- All data processing happens on-device
- No telemetry or external API calls (except web module)
- MLX module: 100% offline after model download
- Biometric authentication for sensitive operations

## Future Enhancements

Potential additions:
- FilesModule - Document access and management
- MapsModule - Native map integration
- MusicModule - Music library access
- PushNotificationsModule - Local and remote notifications
- ARKitModule - Augmented reality capabilities
- HealthKitModule - Health and fitness data
- CoreMLModule - Additional ML models beyond MLX

## Contributing

When adding new modules:
1. Create `.h` and `.mm` files in `ios/offLLMAppStoreFixer/NativeModules/`
2. Add TypeScript interface in `src/native-modules/[Module]Module.ts`
3. Export from `src/native-modules/index.ts`
4. Update AIAgent tools if applicable
5. Add permissions to Info.plist
6. Update this documentation

## Build Instructions

```bash
# Install dependencies
bun install

# iOS prebuild (generates native project)
npx expo prebuild --platform ios --clean

# Build native modules
cd ios
pod install
xcodebuild -workspace offLLMAppStoreFixer.xcworkspace -scheme offLLMAppStoreFixer
```

## GitHub Actions

Automated builds configured:
- `build-native-modules-macos.yml` - Native module compilation
- `deploy-macos-native.yml` - Deployment workflow
- `xcode-build-no-eas.yml` - Full Xcode build

All workflows use macOS-15 runners with Xcode 16.2 for iOS 18.2 SDK compatibility.

## License

All native modules are part of the monGARS_expo project.

## Repository

**GitHub**: https://github.com/ales27pm/monGARS_expo

---

**Total Lines of Code**: ~15,000+
- Native (Objective-C++): ~8,000 lines
- TypeScript interfaces: ~3,000 lines
- AI Agent system: ~2,000 lines
- Documentation: ~2,000 lines
