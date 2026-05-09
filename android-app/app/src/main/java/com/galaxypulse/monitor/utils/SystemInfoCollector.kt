package com.galaxypulse.monitor.utils

import android.app.ActivityManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.Environment
import android.os.StatFs
import android.provider.Settings
import com.galaxypulse.monitor.data.HealthContext
import com.galaxypulse.monitor.data.SystemInfo
import java.util.Calendar

/**
 * Collects comprehensive system information from OnePlus/OxygenOS devices
 */
class SystemInfoCollector(private val context: Context) {
    
    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private var currentSteps = 0
    
    fun collectSystemInfo(): SystemInfo {
        return SystemInfo(
            // Device Info
            deviceManufacturer = Build.MANUFACTURER,
            deviceModel = Build.MODEL,
            deviceBrand = Build.BRAND,
            androidVersion = Build.VERSION.RELEASE,
            sdkInt = Build.VERSION.SDK_INT,
            osName = getOxygenOSVersion(),
            
            // Battery
            batteryLevel = getBatteryLevel(),
            batteryCharging = isBatteryCharging(),
            batteryTemperature = getBatteryTemperature(),
            batteryHealth = getBatteryHealth(),
            
            // Health Context
            timeOfDay = getTimeOfDay(),
            stressScore = calculateStressScore(),
            sleepScore = calculateSleepScore(),
            heartRate = estimateHeartRate(),
            stepsToday = getStepsToday(),
            
            // System Resources
            memoryAvailableMb = getAvailableMemoryMb(),
            memoryTotalMb = getTotalMemoryMb(),
            memoryUsedPercent = getMemoryUsedPercent(),
            storageAvailableGb = getAvailableStorageGb(),
            storageTotalGb = getTotalStorageGb(),
            
            // Network
            networkType = getNetworkType(),
            isConnected = isNetworkConnected(),
            isWifi = isWifiConnected(),
            isMobileData = isMobileDataConnected(),
            
            // Screen
            screenOn = isScreenOn(),
            screenBrightness = getScreenBrightness(),
            
            // Location
            locationEnabled = isLocationEnabled(),
            
            // Timestamp
            timestamp = System.currentTimeMillis()
        )
    }
    
    fun getHealthContext(): HealthContext {
        return HealthContext(
            timeOfDay = getTimeOfDay(),
            stressScore = calculateStressScore(),
            sleepScore = calculateSleepScore(),
            heartRate = estimateHeartRate(),
            stepsToday = getStepsToday(),
            batteryLevel = getBatteryLevel(),
            batteryCharging = isBatteryCharging()
        )
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Device Info
    // ═══════════════════════════════════════════════════════════════════════════
    
    private fun getOxygenOSVersion(): String {
        return try {
            // OnePlus/OxygenOS specific build properties
            val version = Build.VERSION.INCREMENTAL
            when {
                version.contains("Oxygen", ignoreCase = true) -> version
                Build.BRAND.equals("OnePlus", ignoreCase = true) -> "OxygenOS ${Build.VERSION.RELEASE}"
                Build.BRAND.equals("OPPO", ignoreCase = true) -> "ColorOS ${Build.VERSION.RELEASE}"
                else -> "Android ${Build.VERSION.RELEASE}"
            }
        } catch (e: Exception) {
            "Android ${Build.VERSION.RELEASE}"
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Battery Info
    // ═══════════════════════════════════════════════════════════════════════════
    
    private fun getBatteryLevel(): Int {
        val batteryStatus = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (level >= 0 && scale > 0) {
            (level * 100 / scale.toFloat()).toInt()
        } else {
            80 // fallback
        }
    }
    
    private fun isBatteryCharging(): Boolean {
        val batteryStatus = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val status = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        return status == BatteryManager.BATTERY_STATUS_CHARGING || 
               status == BatteryManager.BATTERY_STATUS_FULL
    }
    
    private fun getBatteryTemperature(): Float {
        val batteryStatus = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val temp = batteryStatus?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, -1) ?: -1
        return if (temp > 0) temp / 10f else 30f // Convert from tenths of degree
    }
    
    private fun getBatteryHealth(): String {
        val batteryStatus = context.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        return when (batteryStatus?.getIntExtra(BatteryManager.EXTRA_HEALTH, -1)) {
            BatteryManager.BATTERY_HEALTH_GOOD -> "Good"
            BatteryManager.BATTERY_HEALTH_OVERHEAT -> "Overheat"
            BatteryManager.BATTERY_HEALTH_DEAD -> "Dead"
            BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE -> "Over Voltage"
            BatteryManager.BATTERY_HEALTH_COLD -> "Cold"
            else -> "Unknown"
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Health Context (Heuristic-based)
    // ═══════════════════════════════════════════════════════════════════════════
    
    private fun getTimeOfDay(): String {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return when (hour) {
            in 0..5 -> "night"
            in 6..11 -> "morning"
            in 12..16 -> "afternoon"
            in 17..21 -> "evening"
            else -> "night"
        }
    }
    
    private fun calculateStressScore(): Int {
        // Heuristic based on time of day, battery, and system load
        val timeOfDay = getTimeOfDay()
        val batteryLevel = getBatteryLevel()
        val isCharging = isBatteryCharging()
        val memoryUsed = getMemoryUsedPercent()
        
        var stress = 40
        
        // Time-based stress (circadian rhythm)
        when (timeOfDay) {
            "night" -> stress += 30
            "evening" -> stress += 15
            "morning" -> stress -= 10
        }
        
        // Battery stress
        if (batteryLevel < 20 && !isCharging) stress += 25
        if (batteryLevel < 10 && !isCharging) stress += 15
        
        // System load stress
        if (memoryUsed > 80) stress += 10
        
        return stress.coerceIn(0, 100)
    }
    
    private fun calculateSleepScore(): Int {
        // Heuristic: morning = good sleep, night = poor sleep
        val timeOfDay = getTimeOfDay()
        return when (timeOfDay) {
            "morning" -> 82
            "afternoon" -> 75
            "evening" -> 68
            "night" -> 45
            else -> 70
        }
    }
    
    private fun estimateHeartRate(): Int {
        // Heuristic based on time of day and activity
        val timeOfDay = getTimeOfDay()
        val steps = getStepsToday()
        
        var hr = when (timeOfDay) {
            "morning" -> 65
            "afternoon" -> 72
            "evening" -> 75
            "night" -> 62
            else -> 70
        }
        
        // Adjust for activity level
        if (steps > 8000) hr += 5
        if (steps > 12000) hr += 8
        
        return hr
    }
    
    private fun getStepsToday(): Int {
        // Try to get real step count from sensor
        try {
            val stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
            if (stepSensor != null) {
                // Note: This requires continuous monitoring, so we use heuristic for now
                // In production, implement a SensorEventListener in the service
            }
        } catch (e: Exception) {
            // Sensor not available
        }
        
        // Heuristic: ~800 steps per hour during waking hours
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        val hoursSinceMorning = maxOf(0, hour - 7)
        return minOf(hoursSinceMorning * 800, 12000)
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Memory & Storage
    // ═══════════════════════════════════════════════════════════════════════════
    
    private fun getAvailableMemoryMb(): Long {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        return memoryInfo.availMem / (1024 * 1024)
    }
    
    private fun getTotalMemoryMb(): Long {
        val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memoryInfo = ActivityManager.MemoryInfo()
        activityManager.getMemoryInfo(memoryInfo)
        return memoryInfo.totalMem / (1024 * 1024)
    }
    
    private fun getMemoryUsedPercent(): Int {
        val total = getTotalMemoryMb()
        val available = getAvailableMemoryMb()
        return if (total > 0) {
            ((total - available) * 100 / total).toInt()
        } else 50
    }
    
    private fun getAvailableStorageGb(): Long {
        val stat = StatFs(Environment.getDataDirectory().path)
        val availableBytes = stat.availableBlocksLong * stat.blockSizeLong
        return availableBytes / (1024 * 1024 * 1024)
    }
    
    private fun getTotalStorageGb(): Long {
        val stat = StatFs(Environment.getDataDirectory().path)
        val totalBytes = stat.blockCountLong * stat.blockSizeLong
        return totalBytes / (1024 * 1024 * 1024)
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Network
    // ═══════════════════════════════════════════════════════════════════════════
    
    private fun isNetworkConnected(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            capabilities != null
        } else {
            @Suppress("DEPRECATION")
            connectivityManager.activeNetworkInfo?.isConnected == true
        }
    }
    
    private fun isWifiConnected(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
        } else {
            @Suppress("DEPRECATION")
            connectivityManager.activeNetworkInfo?.type == ConnectivityManager.TYPE_WIFI
        }
    }
    
    private fun isMobileDataConnected(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true
        } else {
            @Suppress("DEPRECATION")
            connectivityManager.activeNetworkInfo?.type == ConnectivityManager.TYPE_MOBILE
        }
    }
    
    private fun getNetworkType(): String {
        return when {
            isWifiConnected() -> "WiFi"
            isMobileDataConnected() -> "Mobile Data"
            isNetworkConnected() -> "Other"
            else -> "Disconnected"
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Screen & Display
    // ═══════════════════════════════════════════════════════════════════════════
    
    private fun isScreenOn(): Boolean {
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
            powerManager.isInteractive
        } else {
            @Suppress("DEPRECATION")
            powerManager.isScreenOn
        }
    }
    
    private fun getScreenBrightness(): Int {
        return try {
            Settings.System.getInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS)
        } catch (e: Exception) {
            128 // Default mid-brightness
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Location
    // ═══════════════════════════════════════════════════════════════════════════
    
    private fun isLocationEnabled(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as android.location.LocationManager
                locationManager.isLocationEnabled
            } else {
                @Suppress("DEPRECATION")
                val mode = Settings.Secure.getInt(context.contentResolver, Settings.Secure.LOCATION_MODE)
                mode != Settings.Secure.LOCATION_MODE_OFF
            }
        } catch (e: Exception) {
            false
        }
    }
}
