package com.galaxypulse.monitor

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.galaxypulse.monitor.databinding.ActivityLogBinding
import com.galaxypulse.monitor.utils.LogManager

class LogActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLogBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLogBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Setup Toolbar
        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        supportActionBar?.title = "Live System Logs"
        binding.toolbar.setNavigationOnClickListener { finish() }

        // Observe logs
        LogManager.logs.observe(this) { logs ->
            binding.tvLiveLogs.text = logs.joinToString("\n")
        }

        binding.btnClearLog.setOnClickListener {
            LogManager.clearLogs()
            binding.tvLiveLogs.text = "Logs cleared. Waiting for events..."
        }
    }
}
