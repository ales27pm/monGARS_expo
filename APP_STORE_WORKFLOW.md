# App Store Connect Upload Workflow

This repository includes a GitHub Actions workflow that automatically builds your app and uploads it to App Store Connect.

## Setup Instructions

### 1. Create an Expo Account
If you do not have one already, create an account at [expo.dev](https://expo.dev).

### 2. Get Your Expo Access Token
1. Go to [https://expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens)
2. Click "Create token"
3. Give it a name (e.g., "GitHub Actions")
4. Copy the token - you'll need it for GitHub Secrets

### 3. Get Apple Developer Information
You'll need the following from your Apple Developer account:

- **Apple ID**: Your Apple ID email (e.g., developer@example.com)
- **ASC App ID**: Your App Store Connect App ID (found in App Store Connect > App Information)
- **Apple Team ID**: Your Apple Developer Team ID (found at [developer.apple.com/account](https://developer.apple.com/account))
- **App-Specific Password**: Generate one at [appleid.apple.com](https://appleid.apple.com) under Security > App-Specific Passwords

### 4. Configure GitHub Secrets
Go to your GitHub repository settings and add these secrets (Settings > Secrets and variables > Actions):

1. **EXPO_TOKEN**: Your Expo access token from step 2
2. **EXPO_APPLE_APP_SPECIFIC_PASSWORD**: Your Apple app-specific password
3. **APPLE_ID**: Your Apple ID email
4. **ASC_APP_ID**: Your App Store Connect App ID
5. **APPLE_TEAM_ID**: Your Apple Team ID

### 5. Update eas.json (if needed)
The `eas.json` file is already configured to use environment variables for Apple credentials. The workflow will automatically use the GitHub Secrets you set up.

### 6. Trigger the Workflow
The workflow runs automatically when:
- You push to the `main` branch
- You manually trigger it from the Actions tab in GitHub

To manually trigger:
1. Go to your repository on GitHub
2. Click the "Actions" tab
3. Select "Build and Upload to App Store Connect"
4. Click "Run workflow"

## Workflow Overview

The workflow performs these steps:
1. Checks out your code
2. Sets up Bun and Node.js
3. Installs Expo and EAS CLI
4. Installs dependencies
5. Builds your iOS app using EAS
6. Submits the build to App Store Connect

## Important Notes

- **First Build**: The first build may take 15-30 minutes
- **Build Number**: The build number auto-increments with each build
- **TestFlight**: After upload, your build will be processed by Apple (can take 10-30 minutes) before appearing in TestFlight
- **Review**: You still need to manually submit your app for App Store review in App Store Connect

## Troubleshooting

- **Build fails**: Check the Actions logs in GitHub for detailed error messages
- **Submission fails**: Ensure all Apple credentials are correct and your Apple Developer account is in good standing
- **Missing permissions**: Ensure your Expo token has the necessary permissions

## Manual Build (Alternative)

If you prefer to build locally:
```bash
# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest
```

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
