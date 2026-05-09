package com.galaxypulse.monitor

import android.animation.ObjectAnimator
import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Process
import android.provider.Settings
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.galaxypulse.monitor.databinding.ActivityMainBinding
import com.galaxypulse.monitor.service.MonitorService
import com.galaxypulse.monitor.utils.SystemInfoCollector
import com.google.gson.GsonBuilder

class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: SharedPreferences
    private lateinit var systemInfoCollector: SystemInfoCollector
    private val activityLog = mutableListOf<String>()
    private val maxLogLines = 100
    
    companion object {
        private const val PREFS_NAME = "galaxypulse_prefs"
        private const val KEY_BACKEND_URL = "backend_url"
        private const val KEY_CHAT_ID = "chat_id"
        private const val KEY_ENABLED = "enabled"
        private const val REQUEST_USAGE_ACCESS = 1001
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        systemInfoCollector = SystemInfoCollector(this)
        
        setupUI()
        loadSettings()
        checkPermissions()
        animateEntrance()
        startLogPolling()
    }
    
    private fun startLogPolling() {
        // Poll for log updates from the service every second
        binding.root.postDelayed(object : Runnable {
            override fun run() {
                val serviceLog = prefs.getString("service_log", null)
                if (serviceLog != null && serviceLog.isNotEmpty()) {
                    serviceLog.split("||").forEach { msg ->
                        addLog(msg)
                    }
                    prefs.edit().remove("service_log").apply()
                }
                binding.root.postDelayed(this, 1000)
            }
        }, 1000)
    }
    
    private fun animateEntrance() {
        // Animate cards with staggered entrance
        val cards = listOf(
            binding.tvHeaderTitle.parent as View,
            binding.tvPermissionTitle.parent as View,
            binding.tvConfigTitle.parent as View,
            binding.tvMonitoringTitle.parent as View,
            binding.tvSystemInfoTitle.parent as View
        )
        
        cards.forEachIndexed { index, card ->
            card.alpha = 0f
            card.translationY = 50f
            card.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(400)
                .setStartDelay((index * 100).toLong())
                .setInterpolator(AccelerateDecelerateInterpolator())
                .start()
        }
    }
    
    private fun setupUI() {
        // Save settings button
        binding.btnSave.setOnClickListener {
            saveSettings()
        }
        
        // Get Chat ID button - opens Telegram bot
        binding.btnGetChatId.setOnClickListener {
            openTelegramBot()
        }
        
        // Start/Stop monitoring
        binding.switchMonitoring.setOnCheckedChangeListener { _, isChecked ->
            prefs.edit().putBoolean(KEY_ENABLED, isChecked).apply()
            
            // Animate status indicator
            animateStatusChange(isChecked)
            
            if (isChecked) {
                startMonitoringService()
                addLog("✅ Monitoring started")
            } else {
                stopMonitoringService()
                addLog("⏹️ Monitoring stopped")
            }
        }
        
        // Test system info
        binding.btnTestSystemInfo.setOnClickListener {
            showSystemInfo()
        }
        
        // Request permissions
        binding.btnRequestPermissions.setOnClickListener {
            requestUsageAccessPermission()
        }
        
        // Battery optimization
        binding.btnBatteryOptimization.setOnClickListener {
            requestBatteryOptimizationExemption()
        }
        
        // Clear log button
        binding.btnClearLog.setOnClickListener {
            clearLog()
        }
    }
    
    private fun addLog(message: String) {
        val timestamp = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
            .format(java.util.Date())
        val logEntry = "[$timestamp] $message"
        
        activityLog.add(0, logEntry)
        if (activityLog.size > maxLogLines) {
            activityLog.removeAt(activityLog.size - 1)
        }
        
        runOnUiThread {
            binding.tvActivityLog.text = activityLog.joinToString("\n")
        }
    }
    
    private fun clearLog() {
        activityLog.clear()
        binding.tvActivityLog.text = "Log cleared. Waiting for events..."
        addLog("🗑️ Log cleared")
    }
    
    private fun animateStatusChange(isActive: Boolean) {
        // Update status indicator with animation
        val statusDrawable = if (isActive) {
            R.drawable.status_indicator_active
        } else {
            R.drawable.status_indicator_inactive
        }
        
        binding.statusIndicator.animate()
            .scaleX(0f)
            .scaleY(0f)
            .setDuration(150)
            .withEndAction {
                binding.statusIndicator.setBackgroundResource(statusDrawable)
                binding.statusIndicator.animate()
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(150)
                    .start()
            }
            .start()
        
        // Update status text
        binding.tvStatusValue.text = if (isActive) "Active" else "Inactive"
        binding.tvStatusValue.setTextColor(
            ContextCompat.getColor(
                this,
                if (isActive) R.color.accent_success else R.color.text_tertiary
            )
        )
    }
    
    private fun loadSettings() {
        val defaultBackendUrl = getString(R.string.default_backend_url)
        binding.etBackendUrl.setText(prefs.getString(KEY_BACKEND_URL, defaultBackendUrl))
        binding.etChatId.setText(prefs.getLong(KEY_CHAT_ID, 0).toString())
        binding.switchMonitoring.isChecked = prefs.getBoolean(KEY_ENABLED, false)
        
        updatePermissionStatus()
    }
    
    private fun saveSettings() {
        val backendUrl = binding.etBackendUrl.text.toString().trim()
        val chatIdStr = binding.etChatId.text.toString().trim()
        
        if (backendUrl.isEmpty()) {
            Toast.makeText(this, "Backend URL is required", Toast.LENGTH_SHORT).show()
            return
        }
        
        val chatId = chatIdStr.toLongOrNull() ?: 0
        if (chatId == 0L) {
            Toast.makeText(this, "Valid Chat ID is required", Toast.LENGTH_SHORT).show()
            return
        }
        
        prefs.edit()
            .putString(KEY_BACKEND_URL, backendUrl)
            .putLong(KEY_CHAT_ID, chatId)
            .apply()
        
        Toast.makeText(this, "Settings saved!", Toast.LENGTH_SHORT).show()
        
        if (binding.switchMonitoring.isChecked) {
            startMonitoringService()
        }
    }
    
    private fun checkPermissions() {
        updatePermissionStatus()
        
        if (!hasUsageAccessPermission()) {
            AlertDialog.Builder(this)
                .setTitle("Permission Required")
                .setMessage("GalaxyPulse needs Usage Access permission to detect AI app usage automatically.")
                .setPositiveButton("Grant") { _, _ ->
                    requestUsageAccessPermission()
                }
                .setNegativeButton("Later", null)
                .show()
        }
    }
    
    private fun hasUsageAccessPermission(): Boolean {
        val appOps = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }
    
    private fun requestUsageAccessPermission() {
        startActivityForResult(
            Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS),
            REQUEST_USAGE_ACCESS
        )
    }
    
    private fun requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            } catch (e: Exception) {
                try {
                    val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
                    startActivity(intent)
                } catch (e2: Exception) {
                    Toast.makeText(this, "Unable to open battery settings", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
    
    private fun updatePermissionStatus() {
        val hasPermission = hasUsageAccessPermission()
        
        // Animate permission status change
        binding.tvPermissionStatus.animate()
            .alpha(0f)
            .setDuration(150)
            .withEndAction {
                binding.tvPermissionStatus.text = if (hasPermission) {
                    "✅ Usage Access: Granted"
                } else {
                    "❌ Usage Access: Not Granted"
                }
                
                binding.tvPermissionStatus.setTextColor(
                    ContextCompat.getColor(
                        this,
                        if (hasPermission) R.color.accent_success else R.color.accent_error
                    )
                )
                
                binding.tvPermissionStatus.animate()
                    .alpha(1f)
                    .setDuration(150)
                    .start()
            }
            .start()
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_USAGE_ACCESS) {
            updatePermissionStatus()
        }
    }
    
    private fun startMonitoringService() {
        if (!hasUsageAccessPermission()) {
            Toast.makeText(this, "Usage Access permission required", Toast.LENGTH_SHORT).show()
            binding.switchMonitoring.isChecked = false
            return
        }
        
        val intent = Intent(this, MonitorService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        
        Toast.makeText(this, "Monitoring started", Toast.LENGTH_SHORT).show()
    }
    
    private fun stopMonitoringService() {
        stopService(Intent(this, MonitorService::class.java))
        Toast.makeText(this, "Monitoring stopped", Toast.LENGTH_SHORT).show()
    }
    
    private fun showSystemInfo() {
        val systemInfo = systemInfoCollector.collectSystemInfo()
        val gson = GsonBuilder().setPrettyPrinting().create()
        val json = gson.toJson(systemInfo)
        
        AlertDialog.Builder(this)
            .setTitle("System Information")
            .setMessage(json)
            .setPositiveButton("OK", null)
            .setNeutralButton("Copy") { _, _ ->
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                val clip = android.content.ClipData.newPlainText("System Info", json)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(this, "Copied to clipboard", Toast.LENGTH_SHORT).show()
            }
            .show()
    }
    
    private fun openTelegramBot() {
        val botUsername = getString(R.string.telegram_bot_username)
        
        AlertDialog.Builder(this)
            .setTitle("Get Your Chat ID")
            .setMessage(
                "To get your Telegram Chat ID:\n\n" +
                "1. Open Telegram\n" +
                "2. Search for @$botUsername\n" +
                "3. Send /start or /getchatid\n" +
                "4. Copy the Chat ID number\n" +
                "5. Come back and paste it here\n\n" +
                "Tap 'Open Bot' to go there now!"
            )
            .setPositiveButton("Open Bot") { _, _ ->
                try {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://t.me/$botUsername"))
                    startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(this, "Please install Telegram first", Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
