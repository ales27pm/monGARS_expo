# Native iOS Modules - Quick Reference Guide

## 🚀 Complete List of 19 Implemented Modules

### Core Device Features

#### BatteryModule
```typescript
const info = await BatteryModule.getBatteryInfo();
// { level: 85.5, state: 2 } // 0=unknown, 1=unplugged, 2=charging, 3=full
```

#### BrightnessModule
```typescript
await BrightnessModule.setBrightness(0.5); // 0.0 to 1.0
```

#### SensorsModule
```typescript
const data = await SensorsModule.getSensorData("accelerometer", 1000); // ms
// { x: 0.123, y: -0.456, z: 9.81 }

// Also: "gyroscope", "magnetometer"
```

#### DeviceInfoModule
```typescript
const info = await DeviceInfoModule.getDeviceInfo();
// {
//   model: "iPhone14,2",
//   systemName: "iOS",
//   systemVersion: "17.0",
//   name: "John's iPhone",
//   identifierForVendor: "ABC-123",
//   isLowPowerMode: false
// }
```

#### FlashlightModule
```typescript
await FlashlightModule.setTorchMode(true);  // On
await FlashlightModule.setTorchMode(false); // Off
```

---

### Communication & Calendar

#### CalendarModule
```typescript
await CalendarModule.createEvent(
  "Team Meeting",
  "2025-11-08T14:00:00Z", // ISO 8601 start
  "2025-11-08T15:00:00Z", // ISO 8601 end (optional)
  3600,                    // duration in seconds (optional)
  "Conference Room A",     // location (optional)
  "Discuss Q4 goals"       // notes (optional)
);
```

#### CameraModule
```typescript
const result = await CameraModule.takePhoto(0.8); // quality 0.0-1.0
// { url: "file:///..." }
```

#### CallModule
```typescript
const calls = await CallModule.getRecentCalls(10);
// Returns [] - iOS doesn't allow access to call history
```

#### ContactsModule
```typescript
// Find contacts
const contacts = await ContactsModule.findContacts("John");
// [{
//   id: "ABC123",
//   name: "John Doe",
//   phones: ["+1234567890"],
//   emails: ["john@example.com"]
// }]

// Add contact
await ContactsModule.addContact(
  "John",      // given name
  "Doe",       // family name
  "+1234567890", // phone
  "john@example.com" // email
);
```

#### LocationModule
```typescript
// Get current location once
const location = await LocationModule.getCurrentLocation();
// {
//   latitude: 37.7749,
//   longitude: -122.4194,
//   altitude: 10.5,
//   accuracy: 5.0,
//   speed: 0.0,
//   heading: 90.0,
//   timestamp: 1699401234000
// }

// Watch position (continuous updates)
import { NativeEventEmitter, NativeModules } from 'react-native';
const eventEmitter = new NativeEventEmitter(NativeModules.LocationTurboModule);

LocationModule.watchPosition(10); // distance filter in meters

const subscription = eventEmitter.addListener('locationUpdate', (location) => {
  console.log(location);
});

// Stop watching
LocationModule.clearWatch();
subscription.remove();
```

#### MessagesModule
```typescript
// Check if SMS is available
const { canSend } = await MessagesModule.canSendText();

// Send SMS
await MessagesModule.sendMessage("+1234567890", "Hello!");
```

#### PhotosModule
```typescript
// Pick a photo
const result = await PhotosModule.pickPhoto();
// { url: "file:///...", width: 1920, height: 1080 }

// Get albums
const albums = await PhotosModule.getAlbums();
// [{ title: "Camera Roll", count: 1234, id: "..." }]
```

#### MailComposerModule
```typescript
// Check if mail is available
const { canSend } = await MailComposerModule.canSendMail();

// Compose email
await MailComposerModule.composeEmail({
  to: ["recipient@example.com"],
  cc: ["cc@example.com"],
  bcc: ["bcc@example.com"],
  subject: "Hello",
  body: "Email body text",
  isHTML: false
});
```

---

### Advanced Features

#### SpeechModule (Text-to-Speech)
```typescript
// Speak text
await SpeechModule.speak("Hello, world!", {
  language: "en-US",
  rate: 0.5,      // 0.0 to 1.0
  pitch: 1.0,     // 0.5 to 2.0
  volume: 1.0     // 0.0 to 1.0
});

// Control playback
await SpeechModule.pause();
await SpeechModule.resume();
await SpeechModule.stop();

// Check status
const { speaking } = await SpeechModule.isSpeaking();

// Get available voices
const voices = await SpeechModule.getAvailableVoices();
// [{
//   identifier: "com.apple.ttsbundle.Samantha-compact",
//   name: "Samantha",
//   language: "en-US",
//   quality: 1
// }]
```

#### SpeechRecognitionModule (Speech-to-Text)
```typescript
// Check if available
const { available } = await SpeechRecognitionModule.isAvailable();

// Request permission
const { status } = await SpeechRecognitionModule.requestPermission();
// status: "authorized" | "denied" | "restricted" | "notDetermined"

// Start recognition
const result = await SpeechRecognitionModule.startRecognition({});
// { text: "hello world", isFinal: true }

// Stop recognition
await SpeechRecognitionModule.stopRecognition();
```

#### OCRModule (Optical Character Recognition)
```typescript
const results = await OCRModule.recognizeText("/path/to/image.jpg");
// [{
//   text: "Hello World",
//   confidence: 0.95,
//   boundingBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 }
// }]
```

#### HapticsModule
```typescript
// Impact feedback
await HapticsModule.impact("light");    // "light" | "medium" | "heavy" | "rigid" | "soft"

// Notification feedback
await HapticsModule.notification("success"); // "success" | "warning" | "error"

// Selection feedback
await HapticsModule.selection();
```

#### BiometricsModule
```typescript
// Check availability
const info = await BiometricsModule.isAvailable();
// {
//   available: true,
//   biometryType: "FaceID", // or "TouchID" or "none"
//   error: null
// }

// Authenticate
try {
  await BiometricsModule.authenticate("Unlock app");
  // Success!
} catch (error) {
  // Error codes: USER_CANCEL, NOT_AVAILABLE, LOCKOUT, etc.
}
```

#### ClipboardModule
```typescript
// Get clipboard text
const text = await ClipboardModule.getString();

// Set clipboard text
await ClipboardModule.setString("Hello, clipboard!");

// Check if has string
const { hasString } = await ClipboardModule.hasString();

// Clear clipboard
await ClipboardModule.clear();
```

---

## Import Pattern

```typescript
// Import specific modules
import {
  BatteryModule,
  LocationModule,
  SpeechModule,
  BiometricsModule,
  // ... etc
} from "@/native-modules";

// Or import all
import * as NativeModules from "@/native-modules";
```

---

## Error Handling

All modules use promise-based APIs with standard error handling:

```typescript
try {
  const result = await ModuleName.method(params);
  // Success
} catch (error) {
  console.error(error.code);    // Error code
  console.error(error.message); // Error message
}
```

---

## Event Emitters

Modules with continuous updates (LocationModule) use Native Event Emitters:

```typescript
import { NativeEventEmitter, NativeModules } from 'react-native';

const eventEmitter = new NativeEventEmitter(NativeModules.ModuleName);

const subscription = eventEmitter.addListener('eventName', (data) => {
  // Handle event
});

// Cleanup
subscription.remove();
```

---

## Permission Requirements

Modules automatically request permissions when needed, but you can check status:

- **Calendar**: Requests on first `createEvent` call
- **Contacts**: Requests on first access
- **Location**: Requests on first location request
- **Camera**: Requests when taking photo
- **Photos**: Requests when accessing library
- **Microphone**: Required for speech recognition
- **Speech Recognition**: Separate permission request method
- **Biometrics**: Uses device biometrics settings

---

## Best Practices

1. **Check availability** before using features:
   ```typescript
   const { available } = await Module.isAvailable();
   if (!available) return;
   ```

2. **Handle errors gracefully**:
   ```typescript
   try {
     await Module.method();
   } catch (error) {
     // Show user-friendly message
   }
   ```

3. **Cleanup event listeners**:
   ```typescript
   useEffect(() => {
     const subscription = eventEmitter.addListener(...);
     return () => subscription.remove();
   }, []);
   ```

4. **Request permissions early**:
   ```typescript
   // Request permission before critical operation
   const { status } = await Module.requestPermission();
   ```

---

## Performance Tips

- Use `watchPosition` instead of polling `getCurrentLocation`
- Set appropriate distance filters for location updates
- Stop services when not needed (location, speech recognition)
- Prepare haptic generators for lower latency
- Use appropriate sensor sampling durations

---

## All 19 Modules Ready!

Every module is implemented, documented, and ready for compilation on GitHub Actions with macOS-15 runners and Xcode 16.2!
