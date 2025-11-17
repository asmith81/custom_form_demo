# Jobsite Form - Mobile Documentation System

A mobile-first Progressive Web App for jobsite documentation with voice-to-text input and optimized for bright sunlight and dim interior conditions.

## Features

- 📱 Mobile-first, responsive design
- 🎙️ Voice-to-text via keyboard dictation
- 📸 **Photo upload with automatic compression** (up to 10 photos)
- ☀️ Outdoor mode (high contrast for bright sunlight)
- 🌙 Indoor mode (optimized for dim lighting)
- 🧤 Large touch targets for glove-friendly operation
- 📴 PWA support for "Add to Home Screen"
- 🔄 Real-time form submission to Google Sheets via Apps Script
- ☁️ Photos automatically uploaded to Google Drive

## Setup

### 1. Google Sheets Backend

See the architecture docs - you need:
- Google Sheet with proper tabs (`job_sites`, `crew_members`, `form_submissions`, etc.)
- Apps Script deployed as Web App
- Web App URL

### 2. Configure the App

1. Copy the Apps Script Web App URL
2. Open `public/app.js`
3. Replace the `APPS_SCRIPT_URL` constant with your URL

### 3. Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

### 4. Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel
```

Follow prompts, then your app will be live!

## Usage

1. Open the app on your mobile device
2. Toggle Indoor/Outdoor mode as needed
3. Fill out form fields (type or use 🎤 voice input)
4. Submit to send data to Google Sheets

## Architecture

```
Mobile Form (Vercel)
    ↓ HTTPS POST
Apps Script Web App
    ↓ Direct Write
Google Sheets (normalized tables)
```

## Photo Upload

Photos are compressed client-side and uploaded to Google Drive automatically.

See **[PHOTO_UPLOAD_SETUP.md](./PHOTO_UPLOAD_SETUP.md)** for detailed setup instructions.

**Quick setup:**
1. Copy code from `apps-script-with-photos.js`
2. Paste into Apps Script `Code.gs`
3. Deploy new version
4. Test!

## Phase 3 (Future Ideas)

- Bulk voice-to-text with LLM parsing (Anthropic Claude)
- LLM-based photo analysis and data extraction
- Enhanced offline support with IndexedDB
- GPS tagging for photos

