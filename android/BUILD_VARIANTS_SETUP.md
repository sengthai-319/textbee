# Android Build Variants Setup (Dev vs Prod)

This document explains how to use the dev and prod build variants for the CrossHubSMS Android app. For a first setup, follow [docs/SETUP.md](../docs/SETUP.md#android-phones) instead.

## Overview

The app now supports two build variants:
- **Dev**: For development and testing
- **Prod**: For production releases

## Key Differences

| Feature | Dev | Prod |
|---------|-----|------|
| Package Name | `com.vernu.sms.dev` | `com.vernu.sms` |
| App Name | "CrossHubSMS (Dev)" | "CrossHubSMS" |
| API Base URL | `-PapiBaseUrl` (both) | `-PapiBaseUrl` (both) |
| Firebase Config | `app/src/dev/google-services.json` | `app/src/prod/google-services.json` |
| Version Suffix | `-dev` appended | No suffix |

## Setup Instructions

### 1. Firebase Configuration

#### For Production:
- The current `google-services.json` has been moved to `app/src/prod/google-services.json`
- No changes needed if you're already using the production Firebase project

#### For Development:
- Create a new Firebase project for development
- Download the `google-services.json` for your dev project
- **Important**: Make sure the package name in Firebase is set to `com.vernu.sms.dev`
- Replace the template file at `app/src/dev/google-services.json` with your actual dev configuration

### 2. API Configuration

Both variants use your own server. Pass its address as a Gradle property, or set it in `gradle.properties`:
```bash
./gradlew assembleProdRelease \
  -PapiBaseUrl=http://Your-iMac.local:3001/api/v1/ \
  -PdashboardUrl=http://Your-iMac.local:3000
```
- `apiBaseUrl` is the API the app talks to. The trailing slash is required, and the default is `http://10.0.2.2:3001/api/v1/` (the host machine from an emulator).
- `dashboardUrl` is where the app's "open dashboard" links go (default `http://10.0.2.2:3000`).
- Plain `http://` is allowed only when `apiBaseUrl` is `http://`.

## Building the App

### Using Android Studio:
1. Open the "Build Variants" panel (View → Tool Windows → Build Variants)
2. Select the desired variant:
   - `devDebug` - Development build for debugging
   - `devRelease` - Development release build
   - `prodDebug` - Production build for debugging
   - `prodRelease` - Production release build

### Using Command Line:
```bash
# Build dev debug
./gradlew assembleDevDebug

# Build dev release
./gradlew assembleDevRelease

# Build prod debug
./gradlew assembleProdDebug

# Build prod release
./gradlew assembleProdRelease
```

## Installation

Both variants can be installed simultaneously on the same device since they have different package names:
- Dev app will show as "CrossHubSMS (Dev)"
- Prod app will show as "CrossHubSMS"

## Environment Detection

You can detect which environment the app is running in using:
```java
if (BuildConfig.ENVIRONMENT.equals("development")) {
    // Development-specific code
} else {
    // Production code
}
```

## Important Notes

1. **Different Package Names**: Dev and prod apps are completely separate and can coexist
2. **Separate Data**: Each variant maintains its own app data and preferences
3. **Firebase Projects**: Use separate Firebase projects for dev and prod
4. **API Endpoints**: Ensure your backend has corresponding dev/prod endpoints
5. **Testing**: Always test the prod build before releasing

## Troubleshooting

### Build Errors:
- Ensure both `google-services.json` files are properly configured
- Check that package names match between Firebase console and app configuration
- Verify API URLs are accessible

### Firebase Issues:
- Confirm the package name in Firebase matches the variant (`com.vernu.sms.dev` for dev)
- Ensure SHA-1 fingerprints are added to Firebase if using authentication 