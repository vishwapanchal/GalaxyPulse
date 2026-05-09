package com.galaxypulse.monitor.service

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.galaxypulse.monitor.GalaxyPulseApp
import com.galaxypulse.monitor.MainActivity
import com.galaxypulse.monitor.R
import com.galaxypulse.monitor.data.FeedbackTriggerRequest
import com.galaxypulse.monitor.utils.SystemInfoCollector
import com.google.gson.Gson
import kotlinx.coroutines.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class MonitorService : Service() {
    
    private val serviceScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private lateinit var systemInfoCollector: SystemInfoCollector
    private lateinit var prefs: SharedPreferences
    private val gson = Gson()
    
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()
    
    // AI Apps to monitor (OnePlus/OxygenOS + Google)
    private val aiApps = mapOf(
        "com.google.ar.lens" to "Google Lens",
        "com.google.android.apps.translate" to "Google Translate AI",
        "com.google.android.apps.photos" to "Google Photos AI",
        "com.google.android.googlequicksearchbox" to "Circle to Search",
        "com.samsung.android.photostudio" to "AI Photo Erase",
        "com.samsung.android.app.notes" to "Note Assist",
        "com.google.android.inputmethod.latin" to "Gboard Smart Compose",
        "com.samsung.android.livestranslate" to "Live Translate",
        "com.oneplus.camera" to "OnePlus Camera AI",
        "com.oneplus.gallery" to "OnePlus Gallery AI"
    )
    
    private val cooldownMs = 60000L // 1 minute
    private val pollIntervalMs = 1000L // 1 second
    
    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val PREFS_NAME = "galaxypulse_prefs"
        private const val KEY_BACKEND_URL = "backend_url"
        private const val KEY_CHAT_ID = "chat_id"
        private const val KEY_ENABLED = "enabled"
    }
    
    override fun onCreate() {
        super.onCreate()
        systemInfoCollector = SystemInfoCollector(this)
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        
        startForeground(NOTIFICATION_ID, createNotification("Monitoring AI app usage..."))
        startMonitoring()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        serviceScope.cancel()
        super.onDestroy()
    }
    
    private fun startMonitoring() {
        serviceScope.launch {
            while (isActive) {
                try {
                    if (isMonitoringEnabled()) {
                        checkAppUsage()
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                delay(pollIntervalMs)
            }
        }
    }
    
    private fun checkAppUsage() {
        val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val endTime = System.currentTimeMillis()
        val startTime = endTime - (60 * 1000) // Last 1 minute
        
        val usageStats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startTime,
            endTime
        )
        
        if (usageStats.isNullOrEmpty()) {
            // No usage stats permission
            updateNotification("⚠️ Usage Access permission needed")
            logToUI("⚠️ No usage stats - check permissions")
            return
        }
        
        // Find most recently used app
        val recentApp = usageStats.maxByOrNull { it.lastTimeUsed }
        
        recentApp?.let { stats ->
            val packageName = stats.packageName
            val featureName = aiApps[packageName]
            
            // Log detected app
            val appName = featureName ?: packageName.substringAfterLast(".")
            logToUI("📱 Detected: $appName")
            
            if (featureName != null) {
                val lastTriggered = prefs.getLong("last_$packageName", 0)
                val now = System.currentTimeMillis()
                
                if (now - lastTriggered > cooldownMs) {
                    val healthContext = systemInfoCollector.getHealthContext()
                    
                    logToUI("🔍 AI app detected: $featureName")
                    // Always send decision explanation to Telegram
                    sendDecisionExplanation(packageName, featureName, healthContext)
                    prefs.edit().putLong("last_$packageName", now).apply()
                } else {
                    val remainingMin = ((cooldownMs - (now - lastTriggered)) / 60000).toInt()
                    logToUI("⏳ Cooldown: $featureName ($remainingMin min left)")
                }
            }
        }
        
        updateNotification("✓ Monitoring active")
    }
    
    private fun logToUI(message: String) {
        val existing = prefs.getString("service_log", "") ?: ""
        val newLog = if (existing.isEmpty()) message else "$existing||$message"
        prefs.edit().putString("service_log", newLog).apply()
    }
    
    private fun sendDecisionExplanation(
        packageName: String,
        featureName: String,
        healthContext: com.galaxypulse.monitor.data.HealthContext
    ) {
        serviceScope.launch(Dispatchers.IO) {
            try {
                val backendUrl = prefs.getString(KEY_BACKEND_URL, "") ?: ""
                val chatId = prefs.getLong(KEY_CHAT_ID, 0)
                
                if (backendUrl.isEmpty() || chatId == 0L) {
                    withContext(Dispatchers.Main) {
                        updateNotification("⚠️ Backend not configured")
                    }
                    return@launch
                }
                
                // Build decision explanation
                val reasons = mutableListOf<String>()
                var willAsk = true
                
                // Rule 1: Battery dying (< 15%)
                if (healthContext.batteryLevel < 15 && !healthContext.batteryCharging) {
                    reasons.add("🔋 Low battery (${healthContext.batteryLevel}%)")
                    willAsk = false
                }
                
                // Rule 2: DND is on
                if (healthContext.isDndEnabled) {
                    reasons.add("🔕 Do Not Disturb is ON")
                    willAsk = false
                }
                
                // Rule 3: Night time
                if (healthContext.timeOfDay == "night") {
                    reasons.add("🌙 It's nighttime")
                    willAsk = false
                }
                
                // Rule 4: CPU under heavy load (Proxy: Memory > 85%)
                if (healthContext.memoryUsedPercent > 85) {
                    reasons.add("⚙️ High system load (${healthContext.memoryUsedPercent}%)")
                    willAsk = false
                }
                
                // Rule 5: User on a call
                if (healthContext.isOnCall) {
                    reasons.add("📞 User is on a call")
                    willAsk = false
                }
                
                if (willAsk) {
                    reasons.add("✅ Device conditions optimal")
                }
                
                val systemInfo = systemInfoCollector.collectSystemInfo()
                val decision = if (willAsk) "✅ ASKING FOR FEEDBACK" else "❌ SKIPPING FEEDBACK"
                val explanation = "$decision\n\nApp: $featureName\n\nReasons:\n${reasons.joinToString("\n")}\n\nSystem Info:\n${formatSystemInfo(systemInfo)}"
                
                val request = FeedbackTriggerRequest(
                    chatId = chatId,
                    feature = featureName,
                    healthContext = healthContext,
                    systemInfo = systemInfo,
                    decision = if (willAsk) "ask" else "skip",
                    explanation = explanation
                )
                
                val json = gson.toJson(request)
                val body = json.toRequestBody("application/json".toMediaType())
                
                val httpRequest = Request.Builder()
                    .url("$backendUrl/api/feedback/trigger")
                    .post(body)
                    .build()
                
                val response = httpClient.newCall(httpRequest).execute()
                
                withContext(Dispatchers.Main) {
                    if (response.isSuccessful) {
                        updateNotification("✅ Sent: $featureName")
                        logToUI("✅ Sent to Telegram: $featureName")
                    } else {
                        updateNotification("❌ Backend error: ${response.code}")
                        logToUI("❌ Backend error: ${response.code}")
                    }
                }
                
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    updateNotification("❌ Error: ${e.message?.take(30)}")
                    logToUI("❌ Error: ${e.message?.take(50)}")
                }
                e.printStackTrace()
            }
        }
    }
    
    private fun formatSystemInfo(systemInfo: com.galaxypulse.monitor.data.SystemInfo): String {
        return """
            Device: ${systemInfo.deviceModel}
            Android: ${systemInfo.androidVersion}
            Battery: ${systemInfo.batteryLevel}%
            Memory: ${systemInfo.memoryAvailableMb}MB free
            Storage: ${systemInfo.storageAvailableGb}GB free
        """.trimIndent()
    }

    
    private fun isMonitoringEnabled(): Boolean {
        return prefs.getBoolean(KEY_ENABLED, true)
    }
    
    private fun createNotification(text: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        return NotificationCompat.Builder(this, GalaxyPulseApp.CHANNEL_ID)
            .setContentTitle("GalaxyPulse Monitor")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
    
    private fun updateNotification(text: String) {
        val notification = createNotification(text)
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, notification)
    }
    
    private fun showTriggerNotification(featureName: String) {
        val notification = NotificationCompat.Builder(this, GalaxyPulseApp.CHANNEL_ID)
            .setContentTitle("Feedback Requested")
            .setContentText("How was your experience with $featureName?")
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
        
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
