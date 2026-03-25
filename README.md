# Baby Tracker

A personal baby tracking app to log daily feeds, diaper changes, growth parameters, daily tasks, vaccinations, and capture photos/videos — all synced to Google Drive.

Built with React Native (Expo) and works as a PWA on any iPhone or Android without needing an App Store listing or Apple Developer account.

## Features

### Core Tracking
- **Feed Tracking** — Log expressed milk (mL) and breastfeeding/latching sessions (with start/end time and duration)
- **Diaper Tracking** — Log urine, potty, or both with timestamp, notes, and optional photo upload to Google Drive
- **Growth Tracking** — Record weight (kg), height (cm), head circumference (cm) over time with history view
- **Baby Profile** — Set name, date of birth, gender, blood group

### Daily Tasks
- **Recurring tasks** — Create daily tasks like Vitamin D drops, tummy time, iron supplement, massage, bath time
- **Quick-add suggestions** — Pre-built suggestions for common baby care tasks
- **Daily check-off** — Tap to mark tasks as done, with timestamp
- **Progress tracking** — Visual progress bar showing daily completion
- **Date navigation** — View past days' task completion history

### Vaccination Tracker
- **Full Indian (IAP) schedule** — 34 vaccines from birth to 6 years
- **Categories** — Birth, 6 Weeks, 10 Weeks, 14 Weeks, 6 Months, 9 Months, 12 Months, 15 Months, 16-18 Months, 4-6 Years
- **Status indicators** — Color-coded: green (given), yellow (due now), red (overdue), grey (upcoming)
- **Detailed records** — Date given, batch number, doctor/hospital name, notes
- **Auto-detection** — Calculates due/overdue status based on baby's date of birth

### Google Drive Integration
- **Cloud database** — All data (feeds, diapers, growth, tasks, vaccinations, profile) synced to a `BabyTracker` folder on Google Drive
- **Two-way sync** — Downloads cloud data, merges by ID, uploads combined result
- **Auto-sync** — Data automatically pushes to Drive 5 seconds after any change
- **Photo & Video Upload** — Capture or select photos/videos and upload directly to Google Drive
- **Multi-device** — Both parents can use the app on separate phones, syncing via the same Google Drive

### PWA
- **Installable** — Add to iPhone/Android home screen for a native app experience
- **Offline support** — Works offline via service worker caching
- **No app store needed** — No Apple Developer account or Google Play listing required

## Navigation

The app has 5 bottom tabs:

| Tab | Description |
|-----|-------------|
| **Home** | Dashboard with daily feed/diaper summary, sync status, quick-add buttons |
| **Feeds** | Log and view expressed milk and latching sessions |
| **Diapers** | Log urine/potty with optional photo upload |
| **Tasks** | Daily recurring tasks with check-off |
| **More** | Growth tracker, Vaccinations, Photos & Videos, Baby Profile |

## Setup

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
git clone https://github.com/ajhavery/baby-tracker.git
cd baby-tracker
npm install
```

### Run (Development)

```bash
# Web (PWA)
npm run web

# iOS Simulator (requires Xcode)
npm run ios

# Android Emulator (requires Android Studio)
npm run android
```

### Build for Production (Web/PWA)

```bash
npm run build:web
```

This creates a `dist/` folder with static files ready to deploy.

## Google Drive Setup

To enable Google Drive sync and photo uploads:

### 1. Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top and select **New Project**
3. Name it "Baby Tracker" and click **Create**

### 2. Enable APIs

1. Go to **APIs & Services > Library**
2. Search and enable **Google Drive API**
3. Search and enable **Google People API**

### 3. Configure OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Choose **External** and click **Create**
3. Fill in:
   - App name: `Baby Tracker`
   - User support email: your email
   - Developer contact email: your email
4. Click **Save and Continue**
5. On the Scopes page, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/userinfo.profile`
6. Click **Save and Continue**
7. On the Test Users page, click **Add Users** and add your Google email (and your wife's email)
8. Click **Save and Continue**

### 4. Create OAuth Credentials

1. Go to **APIs & Services > Credentials**
2. Click **+ CREATE CREDENTIALS > OAuth client ID**
3. Application type: **Web application**
4. Name: `Baby Tracker Expo`
5. Under **Authorized redirect URIs**, click **+ ADD URI** and add your Expo redirect URI. To find it:
   - Run `npm run web` and check the console for a log line starting with `Redirect URI`
   - Typically looks like: `https://auth.expo.io/@your-username/baby-tracker`
6. Click **CREATE**
7. Copy the **Client ID** (looks like `123456789-abcdef.apps.googleusercontent.com`)

### 5. Add Client ID to the App

Edit `src/services/googleDrive.ts` and replace the placeholder:

```typescript
const GOOGLE_CLIENT_ID_WEB = 'your-client-id-here.apps.googleusercontent.com';
```

## Deploy (Free)

### Option 1: Netlify (Easiest)

```bash
npm run build:web
npx netlify-cli deploy --dir=dist --prod
```

Or drag & drop the `dist/` folder at [app.netlify.com/drop](https://app.netlify.com/drop).

### Option 2: Vercel

```bash
npm run build:web
npx vercel dist/
```

### Option 3: Cloudflare Pages

1. Connect your GitHub repo at [pages.cloudflare.com](https://pages.cloudflare.com)
2. Set build command: `npm run build:web`
3. Set output directory: `dist`

### Option 4: GitHub Pages

Push the contents of `dist/` to a `gh-pages` branch.

## Install on iPhone (No Apple Developer Account Needed)

Since this is a PWA, you and your wife can install it on your iPhones for free:

1. Deploy the app to any of the free hosting options above
2. Open the deployed URL in **Safari** (must be Safari, not Chrome)
3. Tap the **Share button** (square with upward arrow)
4. Scroll down and tap **"Add to Home Screen"**
5. Tap **Add**

The app will appear on your home screen with its own icon, open fullscreen without any browser UI, and work offline.

Both of you can install it from the same URL and share data via Google Drive sync.

## Project Structure

```
src/
  types/              # TypeScript interfaces (feeds, diapers, growth, tasks, vaccinations)
  storage/            # AsyncStorage persistence layer with merge-by-ID sync
  services/
    googleDrive.ts    # Google OAuth + Drive API (upload, download, list, delete)
    syncService.ts    # Two-way data sync (download → merge → upload)
    autoSync.ts       # Debounced auto-sync after data changes (5s delay)
  screens/
    HomeScreen.tsx    # Dashboard with daily summary + sync status
    FeedsScreen.tsx   # Feed logging (expressed milk + latching)
    DiapersScreen.tsx # Diaper logging with photo upload to Drive
    TasksScreen.tsx   # Daily recurring tasks with check-off + progress
    MoreScreen.tsx    # Menu linking to Growth, Vaccinations, Media, Profile
    GrowthScreen.tsx  # Growth measurements history
    VaccinationScreen.tsx # IAP vaccination schedule + records
    MediaScreen.tsx   # Photo/video gallery with Drive upload
    ProfileScreen.tsx # Baby profile management
  utils/
    helpers.ts        # Date/time formatting, age calculation, ID generation
    platform.ts       # Platform-specific constants (header padding)
public/
  index.html          # PWA shell with meta tags + service worker registration
  manifest.json       # Web app manifest (name, icons, theme)
  sw.js               # Service worker for offline caching
```

## Tech Stack

- **React Native** (Expo SDK 55)
- **TypeScript**
- **React Navigation** (bottom tabs + stack navigator)
- **AsyncStorage** (local cache, with in-memory fallback for Expo Go)
- **Google Drive REST API v3** (primary cloud database + media storage)
- **expo-image-picker** (camera + gallery access)
- **expo-auth-session** (Google OAuth 2.0)
- **react-native-web** (PWA support)
- **Service Worker** (offline caching)
