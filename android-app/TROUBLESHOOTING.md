# 🔧 Troubleshooting Guide

## 🏗️ Build Issues

### ❌ "SDK not found" or "Android SDK location not found"

**Solution 1: Auto-detect in Android Studio**
1. Open Android Studio
2. File → Project Structure → SDK Location
3. Click "Edit" next to Android SDK location
4. Let Android Studio download SDK automatically

**Solution 2: Manual setup**
1. Download Android SDK from: https://developer.android.com/studio
2. Create `local.properties` file in project root:
   ```properties
   sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
   ```

### ❌ "Gradle sync failed"

**Solution 1: Invalidate caches**
1. File → Invalidate Caches / Restart
2. Select "Invalidate and Restart"
3. Wait for restart and re-sync

**Solution 2: Clean and rebuild**
1. Build → Clean Project
2. Wait for completion
3. Build → Rebuild Project

**Solution 3: Check internet connection**
- Gradle needs to download dependencies
- Check firewall/proxy settings
- Try mobile hotspot if corporate network blocks

### ❌ "Could not resolve dependencies"

**Solution:**
1. Check internet connection
2. File → Settings → Build, Execution, Deployment → Gradle
3. Uncheck "Offline work"
4. Click "Sync Now"

### ❌ "Unsupported class file major version"

**Cause**: Wrong Java version

**Solution:**
1. File → Project Structure → SDK Location
2. Set Gradle JDK to Java 17 or higher
3. If not available, download from: https://adoptium.net/

### ❌ "Build failed with Kotlin compilation error"

**Solution:**
1. Check Kotlin plugin is installed:
   - File → Settings → Plugins → Search "Kotlin"
2. Update Kotlin plugin to latest version
3. Sync Gradle again

---

## 📲 Installation Issues

### ❌ "adb: command not found" or "adb is not recognized"

**Solution 1: Add to PATH (Windows)**
```cmd
setx PATH "%PATH%;C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools"
```
Then restart Command Prompt

**Solution 2: Use full path**
```cmd
C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe install app-debug.apk
```

**Solution 3: Install ADB standalone**
Download from: https://developer.android.com/studio/releases/platform-tools

### ❌ "adb: no devices/emulators found"

**Check 1: USB Debugging enabled?**
- Settings → System → Developer Options → USB Debugging → ON

**Check 2: USB cable connected?**
- Try different USB port
- Try different USB cable (some are charge-only)

**Check 3: Device authorized?**
- Disconnect and reconnect USB
- On phone, tap "Allow USB debugging" when prompted
- Check "Always allow from this computer"

**Check 4: ADB server running?**
```cmd
adb kill-server
adb start-server
adb devices
```

### ❌ "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

**Cause**: Previous version installed with different signature

**Solution:**
```cmd
adb uninstall com.galaxypulse.monitor
adb install app-debug.apk
```

### ❌ "Installation blocked" or "Install from Unknown Sources"

**Solution (Android 8+):**
1. When prompted, tap "Settings"
2. Toggle "Allow from this source" ON
3. Go back and try install again

**Solution (Manual):**
1. Settings → Apps → Special App Access → Install Unknown Apps
2. Find your file manager or browser
3. Toggle "Allow from this source" ON

---

## ⚙️ App Configuration Issues

### ❌ "Usage Access: Not Granted" won't change

**Solution 1: Manual grant**
1. Settings → Apps → Special App Access → Usage Access
2. Find "GalaxyPulse Monitor"
3. Toggle ON
4. Go back to app

**Solution 2: Restart app**
1. Force stop app
2. Open again
3. Try granting permission again

**Solution 3: OnePlus specific**
1. Settings → Privacy → Permission Manager → Usage Access
2. Find "GalaxyPulse Monitor"
3. Toggle ON

### ❌ "Backend not reachable" or connection errors

**Check 1: Backend running?**
```cmd
# On PC, test backend:
curl http://localhost:8000/api/health
# Should return: {"service":"GalaxyPulse API","version":"1.0.0"}
```

**Check 2: Same WiFi network?**
- Phone and PC must be on same WiFi
- Not mobile data on phone
- Not different WiFi networks

**Check 3: Correct IP address?**
```cmd
# On PC, get IP:
ipconfig
# Look for IPv4 Address under WiFi adapter
# Example: 192.168.1.100
```

**Check 4: Firewall blocking?**
```cmd
# On PC, allow port 8000:
# Windows Firewall → Advanced Settings → Inbound Rules → New Rule
# Port → TCP → 8000 → Allow
```

**Check 5: Backend listening on all interfaces?**
```cmd
# Start backend with --host 0.0.0.0:
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Check 6: Test from phone browser**
- Open browser on phone
- Go to: http://YOUR_PC_IP:8000/api/health
- Should see JSON response

### ❌ "App keeps stopping" or crashes

**Solution 1: Check logs**
```cmd
adb logcat | findstr GalaxyPulse
```

**Solution 2: Reinstall**
```cmd
adb uninstall com.galaxypulse.monitor
adb install app-debug.apk
```

**Solution 3: Clear app data**
1. Settings → Apps → GalaxyPulse Monitor
2. Storage → Clear Data
3. Open app and reconfigure

---

## 🔋 Battery & Background Issues

### ❌ App stops running after screen off

**Solution 1: Disable battery optimization**
1. Settings → Battery → Battery Optimization
2. Find "GalaxyPulse Monitor"
3. Select "Don't optimize"

**Solution 2: Enable auto-start (OnePlus)**
1. Settings → Apps → App Management
2. Find "GalaxyPulse Monitor"
3. Tap "Auto-start" → Toggle ON

**Solution 3: Lock app in recents**
1. Open recent apps
2. Find GalaxyPulse Monitor
3. Pull down on app card → Tap lock icon

**Solution 4: Disable adaptive battery**
1. Settings → Battery → Adaptive Battery
2. Toggle OFF (or add GalaxyPulse to exceptions)

### ❌ Notification disappears

**Cause**: App was killed by system

**Solution**: Follow all battery optimization steps above

### ❌ High battery drain

**Expected**: ~2-3% per day for background monitoring

**If higher**:
1. Check poll interval (default 5 seconds is optimal)
2. Check network connectivity (constant reconnecting drains battery)
3. Check backend is reachable (failed requests drain battery)

---

## 📱 Detection Issues

### ❌ AI app usage not detected

**Check 1: Usage Access granted?**
- App → Should show "✅ Usage Access: Granted"
- If not, grant permission

**Check 2: Monitoring enabled?**
- Toggle should be ON
- Notification should show "Monitoring AI app usage..."

**Check 3: App in monitored list?**
Edit `MonitorService.kt` to add more apps:
```kotlin
private val aiApps = mapOf(
    "com.your.app.package" to "Your App Name"
)
```

**Check 4: Used app long enough?**
- Use app for at least 5 seconds
- Wait up to 1 minute for detection

**Check 5: Cooldown period?**
- 10-minute cooldown per app
- Check last trigger time in logs

### ❌ No Telegram message received

**Check 1: Backend received request?**
- Check backend logs
- Should see: "System info received: ..."

**Check 2: Telegram bot configured?**
- Check backend `.env` file
- Verify `TELEGRAM_BOT_TOKEN`
- Verify `TELEGRAM_CHAT_ID`

**Check 3: Test Telegram bot**
```cmd
# On PC:
curl -X POST http://localhost:8000/api/feedback/trigger ^
  -H "Content-Type: application/json" ^
  -d "{\"chat_id\":6536013557,\"feature\":\"Test\",\"health_context\":{}}"
```

**Check 4: Anti-interrupt rules?**
- Won't trigger at night (23:00-06:00)
- Won't trigger if stress > 75
- Won't trigger if battery < 15% and not charging

---

## 📊 System Info Issues

### ❌ "No system info" or empty fields

**Check 1: Permissions granted?**
- All required permissions should be granted
- Check Android settings → Apps → GalaxyPulse Monitor → Permissions

**Check 2: Android version?**
- Requires Android 8.0+ (API 26+)
- Check: Settings → About Phone → Android version

**Check 3: Test in app**
- Tap "View System Info"
- Should see JSON with all fields
- If fields are null, check logs

### ❌ OxygenOS version shows "Android X" instead

**Expected**: Some OnePlus devices don't expose OxygenOS version via API

**Workaround**: App will show "Android X" or "OxygenOS X" based on detection

### ❌ Steps always show same number

**Expected**: Step counter is heuristic-based (time of day × 800)

**For real steps**: Requires continuous sensor monitoring (battery intensive)

**Future**: Will integrate with Google Fit API for real step count

---

## 🔍 Debugging

### View App Logs
```cmd
# All logs:
adb logcat | findstr GalaxyPulse

# Errors only:
adb logcat *:E | findstr GalaxyPulse

# Save to file:
adb logcat > logs.txt
```

### View Backend Logs
```cmd
# In backend directory:
uvicorn app.main:app --log-level debug
```

### Test Backend API
```cmd
# Health check:
curl http://YOUR_PC_IP:8000/api/health

# Trigger feedback:
curl -X POST http://YOUR_PC_IP:8000/api/feedback/trigger ^
  -H "Content-Type: application/json" ^
  -d "{\"chat_id\":6536013557,\"feature\":\"Test\",\"health_context\":{}}"
```

### Check App State
```cmd
# Is app running?
adb shell ps | findstr galaxypulse

# Is service running?
adb shell dumpsys activity services | findstr GalaxyPulse
```

---

## 🆘 Still Not Working?

### Collect Debug Info

1. **App logs**:
   ```cmd
   adb logcat -d > app_logs.txt
   ```

2. **System info from app**:
   - Tap "View System Info"
   - Tap "Copy"
   - Paste to file

3. **Backend logs**:
   - Copy terminal output

4. **Configuration**:
   - Backend URL
   - Telegram Chat ID
   - Android version
   - OnePlus model

### Common Fixes Checklist

- [ ] Usage Access permission granted
- [ ] Battery optimization disabled
- [ ] Auto-start enabled (OnePlus)
- [ ] Backend running on PC
- [ ] Phone and PC on same WiFi
- [ ] Correct backend URL (PC's IP)
- [ ] Monitoring toggle ON
- [ ] App not force-stopped
- [ ] Firewall allows port 8000
- [ ] Telegram bot token valid

### Reset Everything

If all else fails:

1. **Uninstall app**:
   ```cmd
   adb uninstall com.galaxypulse.monitor
   ```

2. **Rebuild APK**:
   - Android Studio → Build → Clean Project
   - Build → Rebuild Project
   - Build → Build APK

3. **Reinstall**:
   ```cmd
   adb install app-debug.apk
   ```

4. **Reconfigure from scratch**

---

## 📞 Getting Help

If you're still stuck:

1. Check `README.md` for detailed documentation
2. Review `ANDROID_APP_SETUP.md` for setup steps
3. Check backend logs for API errors
4. Use `adb logcat` for runtime debugging
5. Verify all prerequisites are met

---

## 💡 Tips

- **Always check logs first** - Most issues show clear error messages
- **Test backend separately** - Ensure backend works before debugging app
- **Use browser to test** - Open backend URL in phone browser to verify connectivity
- **Check OnePlus settings** - OxygenOS has aggressive battery management
- **Restart helps** - Restart app, phone, or PC often fixes weird issues

---

**Last Updated**: May 8, 2026
