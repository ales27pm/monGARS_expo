# FAQ: Native iOS Module Compilation

## Question: Do I need macOS runners for native modules?

**Short Answer:** Yes, but EAS Build provides them automatically. ✅

**Detailed Answer:** Native iOS modules (llama.rn, MMKV, etc.) require macOS with Xcode to compile. However, you don't need to use GitHub Actions macOS runners because EAS Build handles this for you on their infrastructure.

---

## How It Works

### What Runs Where

| Task | Runs On | Why |
|------|---------|-----|
| Download models | GitHub Actions (ubuntu) | Cheap, fast for file downloads |
| Trigger build | Vibecode terminal | Just sends command to EAS |
| **Compile native modules** | **EAS Cloud (macOS)** | **Has Xcode, CocoaPods, etc.** |
| Code signing | EAS Cloud (macOS) | Managed by EAS |
| Create .ipa | EAS Cloud (macOS) | Final iOS binary |

### Complete Build Flow

```
1. GitHub Actions (ubuntu-latest) - $0.04
   ├─ Download model from HuggingFace
   ├─ Commit to repository
   └─ Push to GitHub
         ↓
2. Vibecode Terminal
   ├─ git pull (get models)
   ├─ eas build (send code to EAS)
   └─ Wait for EAS to complete
         ↓
3. EAS Build Cloud (macOS with Xcode) - Included in EAS pricing
   ├─ Clone your repository
   ├─ Install Node dependencies (bun install)
   ├─ Install CocoaPods dependencies
   ├─ ⭐ Compile native modules with Xcode ⭐
   │  └─ llama.rn (C++ with llama.cpp)
   │  └─ MMKV (C++ storage)
   │  └─ react-native-reanimated (C++ animations)
   │  └─ expo-camera (native camera APIs)
   │  └─ And all other native modules
   ├─ Sign with Apple certificates
   ├─ Archive and export .ipa
   └─ Upload to EAS servers
```

---

## Common Questions

### Q: Can I use ubuntu runners for iOS builds?

**A:** No, not for the actual build. Ubuntu can:
- ✅ Download files
- ✅ Run `eas build` command (which triggers EAS)
- ❌ Compile iOS native code (no Xcode)

That's why `eas build` uploads your code to EAS's macOS runners.

### Q: Why not use GitHub Actions macOS runners?

**A:** You could, but it's more expensive and complex:

| Approach | GitHub Cost | EAS Cost | Complexity | Code Signing |
|----------|------------|----------|------------|--------------|
| **EAS Build (current)** | $0.04 | $0-29/mo | Low | Automatic |
| GitHub macOS | $2.40 | $0 | High | Manual |

EAS Build is 60x cheaper on GitHub Actions and much simpler to set up.

### Q: Does EAS Build really compile native modules?

**A:** Yes! EAS Build:
- Runs on macOS machines with Xcode installed
- Executes `pod install` for CocoaPods dependencies
- Compiles all native code (C++, Swift, Objective-C)
- Links native modules with React Native
- Creates a fully native iOS binary

You can verify by checking the EAS build logs - you'll see Xcode compilation output.

### Q: What about custom native code?

**A:** EAS Build handles:
- ✅ NPM packages with native code
- ✅ Custom native modules in your project
- ✅ CocoaPods dependencies
- ✅ Expo Config Plugins
- ✅ Custom Xcode build settings

If you have custom native code in `ios/` folder, EAS Build will compile it.

### Q: Can I see the native compilation happening?

**A:** Yes! When you run `eas build`, you get a URL to view logs:

```
✔ Build started, it may take a few minutes to complete.
You can check the queue length at https://expo.dev/eas

🔗 https://expo.dev/accounts/yourname/projects/yourapp/builds/abc123
```

Click the link to see real-time logs showing:
- CocoaPods installation
- Xcode compilation
- Native module linking
- Code signing

### Q: What if I want more control?

**A:** Options:

1. **Stick with EAS** (recommended)
   - 99% of use cases covered
   - Custom Xcode settings via app.json
   - Config plugins for customization

2. **Use Expo Prebuild + GitHub macOS**
   - Full control
   - Much more complex
   - See [NATIVE_BUILD_COMPARISON.md](./NATIVE_BUILD_COMPARISON.md)

3. **Bare React Native**
   - Complete control
   - Manage Xcode project yourself
   - Much more maintenance

---

## Key Takeaways

✅ **Native modules ARE compiled on macOS** - Just on EAS's infrastructure

✅ **You don't need GitHub macOS runners** - EAS handles it

✅ **Ubuntu runners are sufficient** - For downloading models and triggering builds

✅ **Current setup is optimal** - Cheapest and simplest approach

✅ **Native compilation is automatic** - EAS handles Xcode, CocoaPods, etc.

---

## Verification

Want to verify native modules are being compiled? Check EAS build logs for:

```
[XCODE] Building target: MyApp
[XCODE] CompileC .../llama.rn/ios/...
[XCODE] CompileC .../react-native-mmkv/ios/...
[XCODE] Linking libRCTReanimated.a
[XCODE] Creating .app bundle
[XCODE] Code signing with Apple certificate
```

These logs prove native modules are being compiled with Xcode on macOS.

---

## Summary

| Statement | True/False |
|-----------|------------|
| Native modules need macOS to compile | ✅ True |
| EAS Build uses macOS runners | ✅ True |
| GitHub Actions ubuntu is enough for our workflow | ✅ True |
| We need GitHub Actions macOS runners | ❌ False |
| Native modules are properly compiled | ✅ True |
| Current setup is optimal | ✅ True |

**Your workflow is correct!** Native iOS modules are being compiled on macOS (EAS's macOS runners), and using ubuntu for model downloads is the optimal approach. 🎉

---

For more details, see:
- [WORKFLOW_GUIDE.md](./WORKFLOW_GUIDE.md) - Complete workflow with architecture
- [NATIVE_BUILD_COMPARISON.md](./NATIVE_BUILD_COMPARISON.md) - Detailed comparison
- [DEPLOYMENT.md](./DEPLOYMENT.md) - EAS Build documentation
