# How to Get Apple Code Signing Credentials

## 1. APPLE_CERTIFICATE

### On Your Mac (with Xcode installed):

**Step 1: Open Keychain Access**

```bash
open -a "Keychain Access"
```

**Step 2: Find Your Certificate**

- Look in "My Certificates" or "login" keychain
- Find certificate named:
  - "Apple Distribution: [Your Name]" (for App Store)
  - OR "Apple Development: [Your Name]" (for testing)

**Step 3: Export Certificate**

- Right-click on the certificate
- Select "Export [Certificate Name]..."
- Save as: `certificate.p12`
- **Set a password** (you'll need this for APPLE_CERTIFICATE_PASSWORD)
  - Example: `mypassword123`

**Step 4: Convert to Base64**

```bash
# Navigate to where you saved the certificate
cd ~/Downloads

# Convert to base64 (this copies to clipboard on Mac)
cat certificate.p12 | base64 | pbcopy

# Or save to file
cat certificate.p12 | base64 > certificate_base64.txt
```

**Step 5: Add to GitHub Secrets**

- Go to: `https://github.com/ales27pm/monGARS_expo/settings/secrets/actions`
- Click "New repository secret"
- Name: `APPLE_CERTIFICATE`
- Value: Paste the base64 string
- Click "Add secret"

---

## 2. APPLE_CERTIFICATE_PASSWORD

**What it is:** The password you set when exporting the certificate

**Value:** The password you used in Step 3 above (e.g., `mypassword123`)

**Add to GitHub Secrets:**

- Name: `APPLE_CERTIFICATE_PASSWORD`
- Value: Your password
- Click "Add secret"

---

## 3. APPLE_PROVISIONING_PROFILE

**What it is:** The provisioning profile for your app (base64 encoded)

### How to Get It:

**Option A: Download from Apple Developer Portal**

**Step 1: Go to Apple Developer**

- Visit: https://developer.apple.com/account/resources/profiles/list
- Sign in with your Apple ID

**Step 2: Find or Create Profile**

- Look for a profile matching your app's bundle ID
- Bundle ID is in your app.json: `com.vibecode.offllmappstorefixer-iz6sup`

**If no profile exists:**

- Click "+" to create new profile
- Choose:
  - **App Store**: For App Store distribution
  - **Ad Hoc**: For testing on specific devices
- Select your App ID
- Select your Distribution Certificate
- Download the profile (e.g., `AppStore_Profile.mobileprovision`)

**Step 3: Convert to Base64**

```bash
# Navigate to Downloads
cd ~/Downloads

# Convert to base64 (copies to clipboard on Mac)
cat AppStore_Profile.mobileprovision | base64 | pbcopy

# Or save to file
cat AppStore_Profile.mobileprovision | base64 > profile_base64.txt
```

**Step 4: Add to GitHub Secrets**

- Go to: `https://github.com/ales27pm/monGARS_expo/settings/secrets/actions`
- Click "New repository secret"
- Name: `APPLE_PROVISIONING_PROFILE`
- Value: Paste the base64 string
- Click "Add secret"

---

## Quick Reference: What You Need

| Secret Name                  | What It Is                    | Where to Get It                         |
| ---------------------------- | ----------------------------- | --------------------------------------- |
| `APPLE_CERTIFICATE`          | Distribution cert (base64)    | Keychain Access → Export → Base64       |
| `APPLE_CERTIFICATE_PASSWORD` | Cert export password          | Password you set during export          |
| `APPLE_PROVISIONING_PROFILE` | Provisioning profile (base64) | developer.apple.com → Download → Base64 |

---

## Alternative: Use EAS for Code Signing

If this seems too complex, you can:

1. Use EAS Build (which handles signing automatically)
2. Or just test with simulator builds (no signing needed!)

---

## Common Issues

### "I don't have a Mac"

- You need a Mac to export certificates from Keychain
- Alternative: Use EAS Build which handles this in the cloud
- Or: Build only for simulator (no cert needed)

### "I don't have an Apple Developer Account"

- You need a paid Apple Developer account ($99/year)
- Sign up at: https://developer.apple.com/programs/

### "Certificate is expired"

- Certificates expire after 1 year
- Generate a new one in Apple Developer Portal
- Download and export following the same steps

### "Wrong password"

- Make sure `APPLE_CERTIFICATE_PASSWORD` matches what you used when exporting
- Re-export the certificate with a new password if needed

---

## Testing Without Certificates

**You can skip all of this** and just run the workflow without these secrets!

The workflow will automatically:

- Detect no signing credentials
- Build for simulator only
- Create `App-Simulator.zip`
- Works perfectly for testing!

Only add certificates if you need:

- Physical device installation
- TestFlight distribution
- App Store submission
