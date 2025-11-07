# App Store Connect API Key Setup

To publish to the App Store non-interactively through Vibecode, you need to set up an App Store Connect API Key.

## Steps to Create API Key:

### 1. Go to App Store Connect
Visit: https://appstoreconnect.apple.com/access/integrations/api

### 2. Create New Key
- Click the **+** button or "Generate API Key"
- **Name**: `Vibecode EAS Submit`
- **Access**: Select **App Manager** role
- Click **Generate**

### 3. Download the Key
- Download the `.p8` file (e.g., `AuthKey_ABC123DEFG.p8`)
- **Important**: You can only download this once! Save it securely.
- Note the **Key ID** (e.g., `ABC123DEFG`)
- Note the **Issuer ID** (UUID format, shown at the top of the page)

### 4. Create the JSON File

Create a file named `asc-api-key.json` in this directory with:

```json
{
  "keyId": "ABC123DEFG",
  "issuerId": "12345678-1234-1234-1234-123456789012",
  "keyP8": "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----"
}
```

**How to get the keyP8 value:**
```bash
cat AuthKey_ABC123DEFG.p8
```
Copy the entire contents including the BEGIN/END lines, and replace newlines with `\n`.

### 5. Secure the File

**IMPORTANT**: This file contains sensitive credentials!

Add to `.gitignore` (already configured):
```
eas-credentials/asc-api-key.json
```

### 6. Test the Setup

After creating the file, use Vibecode's "Publish to App Store" feature again. It should now proceed without interactive prompts.

## Troubleshooting

**"API Key not found"**:
- Verify the file path is correct: `./eas-credentials/asc-api-key.json`
- Check JSON syntax is valid

**"Invalid API Key"**:
- Verify keyId, issuerId, and keyP8 are correct
- Ensure keyP8 includes the full key with BEGIN/END markers

**"Insufficient permissions"**:
- API Key needs **App Manager** role minimum
- For first submission, you may need **Admin** role

## Alternative: Use Expo's Managed Credentials

If you prefer not to manage API keys, you can let EAS handle everything:

In `eas.json`, change submit section to:
```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "AUTO"
    }
  }
}
```

Then EAS will prompt for Apple ID credentials once and store them securely.
