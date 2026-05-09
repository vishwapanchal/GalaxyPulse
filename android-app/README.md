# 📱 GalaxyPulse Monitor - Native Android App

Native Android application for OnePlus/OxygenOS devices that monitors AI feature usage and collects comprehensive system information (28+ fields).

## 🚀 Quick Links

- **Main Documentation**: See [../README.md](../README.md) for complete setup guide
- **Troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed help

## ✨ Features

- ✅ Collects **28 fields** of system information (vs 2 with ADB)
- ✅ Detects **OxygenOS version** automatically
- ✅ Monitors **10+ AI apps** automatically
- ✅ Runs **24/7 on device** (no PC needed)
- ✅ Smart anti-interrupt rules (won't bother at night, high stress, low battery)
- ✅ Material Design 3 UI

## 🔨 Build APK (3 Commands)

**Fastest way (no Android Studio needed):**

```cmd
# 1. Install Java (if needed)
choco install openjdk17 -y

# 2. Build APK
cd android-app
gradlew.bat assembleDebug

# 3. Install on phone
adb install app\build\outputs\apk\debug\app-debug.apk
```

**With Android Studio:**
1. Open project in Android Studio
2. Build → Build Bundle(s) / APK(s) → Build APK(s)
3. APK location: `app/build/outputs/apk/debug/app-debug.apk`

See [main README](../README.md#android-app-setup) for detailed instructions.

## 📲 Installation

1. **Enable Developer Options**: Settings → About Phone → Tap "Build Number" 7 times
2. **Enable USB Debugging**: Settings → System → Developer Options → USB Debugging
3. **Install APK**: `adb install app/build/outputs/apk/debug/app-debug.apk`

Or transfer APK to phone and install manually.

## ⚙️ Configuration

1. **Grant Usage Access** (Required!)
   - In app, tap "Grant Usage Access"
   - Find "GalaxyPulse Monitor" → Toggle ON

2. **Disable Battery Optimization**
   - Tap "Disable Battery Optimization"
   - Select "All apps" → "GalaxyPulse Monitor" → "Don't optimize"

3. **Configure Backend**
   - Backend URL: `http://YOUR_PC_IP:8000` (find with `ipconfig`)
   - Telegram Chat ID: Your chat ID from setup

4. **Start Monitoring**
   - Toggle "Enable Monitoring" ON

See [main README](../README.md#configure-app) for detailed setup.

## 🧪 Testing

1. **View System Info**: Tap "View System Info" → See 28 fields of JSON data
2. **Trigger Feedback**: Use Google Lens → Wait 1 minute → Check Telegram

See [main README](../README.md#test-the-app) for detailed testing.

## 🔧 OnePlus/OxygenOS Settings

OxygenOS is aggressive with battery optimization:

1. **Battery Optimization**: Settings → Battery → Battery Optimization → "Don't optimize"
2. **Auto-Start**: Settings → Apps → App Management → GalaxyPulse Monitor → "Auto-start" ON
3. **Background**: Settings → Apps → App Management → GalaxyPulse Monitor → Battery usage → "Don't optimize"

## 🔒 Privacy

All data stays on your device and is only sent to **your own backend**. No third-party services involved.

## 🐛 Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for comprehensive troubleshooting guide (600+ lines).

**Common issues:**
- **Monitoring not working**: Check Usage Access permission
- **App keeps stopping**: Disable battery optimization
- **No Telegram message**: Verify backend URL and chat ID

## 📝 Project Structure

```
android-app/
├── app/src/main/java/com/galaxypulse/monitor/
│   ├── GalaxyPulseApp.kt          # Application class
│   ├── MainActivity.kt             # Main UI
│   ├── SplashActivity.kt          # Splash screen
│   ├── data/SystemInfo.kt         # Data models
│   ├── service/MonitorService.kt  # Background service
│   └── utils/SystemInfoCollector.kt # System info collection
├── app/src/main/res/              # Resources (layouts, drawables, etc.)
├── build.gradle                   # Project config
└── README.md                      # This file
```

## 📚 Documentation

- **Main README**: [../README.md](../README.md) - Complete project documentation
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Detailed problem solving

## 📄 License

Part of the GalaxyPulse project for PRISM OpenClaw Hackathon.
