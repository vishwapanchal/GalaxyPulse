package com.galaxypulse.monitor.utils

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object LogManager {
    private val maxLogLines = 200
    private val _logs = MutableLiveData<List<String>>(emptyList())
    val logs: LiveData<List<String>> = _logs

    private val logList = mutableListOf<String>()

    fun addLog(message: String) {
        val timestamp = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val logEntry = "[$timestamp] $message"
        
        synchronized(logList) {
            logList.add(0, logEntry)
            if (logList.size > maxLogLines) {
                logList.removeAt(logList.size - 1)
            }
            // Post value so it updates UI on the main thread safely
            _logs.postValue(logList.toList())
        }
    }

    fun clearLogs() {
        synchronized(logList) {
            logList.clear()
            _logs.postValue(logList.toList())
        }
    }
}
