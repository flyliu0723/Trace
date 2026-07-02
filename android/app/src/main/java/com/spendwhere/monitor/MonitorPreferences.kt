package com.spendwhere.monitor

import android.content.Context

object MonitorPreferences {
  private const val PREFS_NAME = "spendwhere_monitor_prefs"
  private const val KEY_MONITOR_ENABLED = "monitor_enabled"

  fun setMonitorEnabled(context: Context, enabled: Boolean) {
    context.applicationContext
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_MONITOR_ENABLED, enabled)
      .apply()
  }

  fun isMonitorEnabled(context: Context): Boolean {
    return context.applicationContext
      .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getBoolean(KEY_MONITOR_ENABLED, false)
  }
}
