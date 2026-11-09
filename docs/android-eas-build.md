# Jynlo Android: cloud builds without GitHub Actions

GitHub is source control only. Automatic GitHub Actions jobs have been
paused after the November 2026 Actions budget was exhausted. Existing
manual workflows remain available if Actions is restored.

## Build an internal diagnostic APK with Expo EAS

1. Log into the Jynlo Expo account at https://expo.dev
2. Link this application to the existing EAS project using `eas init`,
   `eas build:configure -p android`, and record its project ID.
   Preserve Android package `com.jynlo.app`.
3. Run `npm install`, `npm run test:all`, `npm run typecheck`,
   and `npm run check:release`.
4. Run `npx eas-cli build --platform android --profile diagnostic`.
5. Download the APK from the Expo dashboard. Install and test its launch
   before sharing; collect Android logcat if it crashes.

The diagnostic profile sets `JYNLO_ANDROID_DIAGNOSTIC_NO_R8=1`,
enabling a dedicated Expo config plugin that disables R8 and resource
shrinking only for that diagnostic APK. This tests a possible cause
related to the missing LiveKit JNI shim; it does NOT prove the crash fixed.

## Signing safety

The prior signed APK used a GitHub Actions signing keystore.
EAS needs to be configured with the existing signing credentials if
updates and Google OAuth must remain compatible. Do not create a new
keystore without first comparing SHA-1 certificates for `com.jynlo.app`.
Never commit keystores, passwords, EXPO_TOKEN, or credentials.json.
Expo project authorization must be performed by an Expo account owner.
