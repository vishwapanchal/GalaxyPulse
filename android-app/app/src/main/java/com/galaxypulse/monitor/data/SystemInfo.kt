package com.galaxypulse.monitor.data

import com.google.gson.annotations.SerializedName

/**
 * Complete system information for OnePlus/OxygenOS devices
 */
data class SystemInfo(
    // Device Info
    @SerializedName("device_manufacturer") val deviceManufacturer: String,
    @SerializedName("device_model") val deviceModel: String,
    @SerializedName("device_brand") val deviceBrand: String,
    @SerializedName("android_version") val androidVersion: String,
    @SerializedName("sdk_int") val sdkInt: Int,
    @SerializedName("os_name") val osName: String, // OxygenOS version
    
    // Battery
    @SerializedName("battery_level") val batteryLevel: Int,
    @SerializedName("battery_charging") val batteryCharging: Boolean,
    @SerializedName("battery_temperature") val batteryTemperature: Float,
    @SerializedName("battery_health") val batteryHealth: String,
    
    // Health Context
    @SerializedName("time_of_day") val timeOfDay: String,
    @SerializedName("stress_score") val stressScore: Int,
    @SerializedName("sleep_score") val sleepScore: Int,
    @SerializedName("heart_rate") val heartRate: Int,
    @SerializedName("steps_today") val stepsToday: Int,
    
    // System Resources
    @SerializedName("memory_available_mb") val memoryAvailableMb: Long,
    @SerializedName("memory_total_mb") val memoryTotalMb: Long,
    @SerializedName("memory_used_percent") val memoryUsedPercent: Int,
    @SerializedName("storage_available_gb") val storageAvailableGb: Long,
    @SerializedName("storage_total_gb") val storageTotalGb: Long,
    
    // Network
    @SerializedName("network_type") val networkType: String,
    @SerializedName("is_connected") val isConnected: Boolean,
    @SerializedName("is_wifi") val isWifi: Boolean,
    @SerializedName("is_mobile_data") val isMobileData: Boolean,
    
    // Screen
    @SerializedName("screen_on") val screenOn: Boolean,
    @SerializedName("screen_brightness") val screenBrightness: Int,
    
    // Location (optional)
    @SerializedName("location_enabled") val locationEnabled: Boolean,
    
    // Timestamp
    @SerializedName("timestamp") val timestamp: Long
)

data class HealthContext(
    @SerializedName("time_of_day") val timeOfDay: String,
    @SerializedName("stress_score") val stressScore: Int,
    @SerializedName("sleep_score") val sleepScore: Int,
    @SerializedName("heart_rate") val heartRate: Int,
    @SerializedName("steps_today") val stepsToday: Int,
    @SerializedName("battery_level") val batteryLevel: Int,
    @SerializedName("battery_charging") val batteryCharging: Boolean,
    @SerializedName("is_dnd_enabled") val isDndEnabled: Boolean = false,
    @SerializedName("is_on_call") val isOnCall: Boolean = false,
    @SerializedName("memory_used_percent") val memoryUsedPercent: Int = 0
)

data class FeedbackTriggerRequest(
    @SerializedName("chat_id") val chatId: Long,
    @SerializedName("feature") val feature: String,
    @SerializedName("health_context") val healthContext: HealthContext,
    @SerializedName("system_info") val systemInfo: SystemInfo? = null,
    @SerializedName("decision") val decision: String? = null,
    @SerializedName("explanation") val explanation: String? = null
)
