# DOT HUNTER

A mobile-first focus and reflex game built with React + Capacitor for Android.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run in browser for testing
npm start

# 3. Build for production
npm run build

# 4. Initialize Capacitor and add Android
npx cap init "Dot Hunter" "com.dothunter.app" --web-dir build
npx cap add android

# 5. Copy build to Android project
npx cap copy android
npx cap sync android

# 6. Open in Android Studio
npx cap open android
```

## Building the AAB for Play Console

Once Android Studio opens:

1. Wait for Gradle sync to complete
2. Go to **Build > Generate Signed Bundle / APK**
3. Select **Android App Bundle**
4. Create a new keystore or use an existing one:
   - Keystore path: choose a safe location (back this up — you need it for every update)
   - Set passwords and alias
5. Select **release** build variant
6. Click **Finish**
7. The signed `.aab` file will be in `android/app/release/`

## Uploading to Play Console

1. Go to https://play.google.com/console
2. Create a new app called "Dot Hunter"
3. Go to **Testing > Internal testing** (recommended first)
4. Click **Create new release**
5. Upload the `.aab` file from step 7 above
6. Add release notes (e.g., "Initial release v1.0.0")
7. **Review and roll out** to internal testers
8. Add tester email addresses under **Testers** tab
9. Testers will receive a link to install via Play Store

## Moving to Production

After internal testing:

1. Go to **Testing > Closed testing** or **Production**
2. Create a new release, upload the same or updated `.aab`
3. Complete the store listing:
   - App name: Dot Hunter
   - Short description: "Tap fast. Stay focused. How far can you go?"
   - Full description: see PLAYSTORE_LISTING.md
   - Screenshots (take from emulator or device)
   - Feature graphic (1024x500)
   - App icon (512x512)
4. Complete content rating questionnaire
5. Set pricing: Free
6. Submit for review

## Project Structure

```
dot-hunter/
├── public/
│   └── index.html           # Mobile-optimized HTML shell
├── src/
│   ├── index.js              # React entry point
│   └── App.jsx               # Complete game (single file)
├── package.json              # Dependencies & scripts
├── capacitor.config.ts       # Android build config
├── PLAYSTORE_LISTING.md      # Ready-to-paste store copy
└── README.md
```

## Game Modes

- **Classic Focus** — Single dot, pure speed
- **Color Filter** — Tap green, ignore decoy colors
- **Dual Hunt** — Pick 2 target colors, find them in mixed clusters

## Technical Notes

- All data persisted via localStorage (works natively in Capacitor WebView)
- Audio via Web Audio API (no external sound files)
- Fonts loaded from Google Fonts (requires internet on first load, cached after)
- No external API calls, no analytics, no tracking
- Safe area insets handled for notched devices
- Pull-to-refresh disabled, overscroll contained
- Touch highlight disabled for native feel

## Privacy

All game data stays on device. No data collection of any kind.

## License

MIT
