# Android App Development Guide

This guide explains how to convert your Next.js frontend into a native Android application using **Capacitor**.

## 1. Is it possible?
**Yes.** Since your application is built with React/Next.js, we can wrap it in a native container called Capacitor. This allows your web app to run as a native Android app while still communicating with your Cloud Backend.

---

## 2. Prerequisites
Before you begin, ensure you have the following installed on your machine:
- **Node.js & npm**: (Already installed)
- **Android Studio**: To compile and build the Android APK.
- **Android SDK & Build Tools**: Installed via Android Studio.
- **Java SDK (JDK)**: Recommended version 17 or higher.

---

## 3. Preparing the Project

### A. Next.js Configuration
To run on Android, Next.js must generate a **Static Export** (no server-side code). 
Update `frontend/next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',          // Enables static export
  images: {
    unoptimized: true,       // Required for static export
  },
  // ... other configs
};

export default nextConfig;
```

### B. Handle API URL
Ensure your `NEXT_PUBLIC_API_URL` is pointing to your **Cloud Server** (e.g., `https://api.mariopos.com/api`). Android apps cannot easily talk to `localhost`.

---

## 4. Setting up Capacitor

In your `frontend` directory, run the following commands:

### 1. Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 2. Initialize Capacitor
```bash
# Initialize with your App Name and Package ID
npx cap init "Mario Juicy" com.mario.pos
```

### 3. Build your Web App
```bash
npm run build
```
*Note: This will create an `out` folder containing your static site.*

### 4. Create the Android Project
```bash
npx cap add android
```
*Note: This creates an `android` folder in your project.*

---

## 5. Building and Running

### A. Syncing Changes
Every time you make changes to your React code, you need to sync it to the Android project:
```bash
npm run build
npx cap sync
```

### B. Open in Android Studio
To compile the APK or run on a device:
```bash
npx cap open android
```
1. Android Studio will open the project.
2. Wait for Gradle to finish indexing.
3. Connect your Android device or select an Emulator.
4. Click the **Run** button (Green Arrow).

---

## 6. Key Considerations for Android

| Feature | Requirement |
| :--- | :--- |
| **CORS** | Your Cloud Backend must permit requests from "nothing" or `http://localhost` (Capacitor's internal origin). |
| **Permissions** | If you need camera or printing access, you must add permissions to `AndroidManifest.xml`. |
| **SSL** | Remote API calls **must** be over `https://`. |
| **Back Button** | You may need to use the `App` plugin from Capacitor to handle the hardware back button. |

---

## 7. Useful Capacitor Plugins
To make your app feel truly native, consider adding:
- `@capacitor/app`: To handle app lifecycle and back buttons.
- `@capacitor/keyboard`: To manage keyboard visibility.
- `@capacitor-community/bluetooth-le`: If you plan to use Bluetooth thermal printers.
