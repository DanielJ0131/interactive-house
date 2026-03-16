# 📱 Interactive House Mobile

A React Native application built with **Expo**, **TypeScript**, and **NativeWind** (Tailwind CSS). This project is optimized for high-performance mobile UI development that works for both Android and iOS.

---

## Getting Started

Follow these steps to set up the development environment on your local machine.

### 1. Prerequisites
Ensure you have **Node.js** (LTS version recommended) and **npm** installed. To preview the app on a physical device, download the **Expo Go** app from the App Store or Google Play Store.

### 2. Installation
Navigate to the project root folder and install the necessary dependencies:

```bash
# Install all libraries listed in package.json
npm install
```

### 3. Running the App
```bash
# Start the development server
npx expo start -c
```

## Key Dependencies
* Expo - Framework for universal React applications.
* React Native - Component library for native mobile UI.
* NativeWind - Tailwind CSS styling for React Native components.
* TypeScript - Static typing for more reliable, scalable code.

## Project Structure
```text
app
├── (auth)               # Authentication flow
│   ├── _layout.tsx      # Auth stack & transitions
│   ├── login.tsx        # User Sign-in
│   └── signup.tsx       # Account Creation
├── (tabs)               # Main App (Authenticated)
│   ├── _layout.tsx      # Tab bar config & icons
│   ├── ai.tsx           # AI Assistant Interface
│   ├── device_hub.tsx   # Actuator & Sensor categories
│   ├── [device].tsx     # Dynamic hardware specs (D2, A0, etc.)
│   ├── home.tsx         # Primary Device Dashboard
│   └── speech.tsx       # Voice Command Processing
├── _layout.tsx          # Root Entry & Theme Provider
├── index.tsx            # Welcome / Landing Screen
├── modal.tsx            # System Status & Connection Toggle
├── +html.tsx            # Web Root Template
└── +not-found.tsx       # 404 Error Screen
```

## Firestore Rules Deploy

This project includes Firestore security rules in [firestore.rules](firestore.rules) and Firebase config in [firebase.json](firebase.json).

```bash
# Login once (if needed)
npx firebase login

# Deploy only Firestore rules to your Firebase project
npx firebase deploy --only firestore:rules --project <your-firebase-project-id>
```