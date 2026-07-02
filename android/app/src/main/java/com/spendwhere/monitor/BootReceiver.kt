package com.spendwhere.monitor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/**
 * 开机后自动恢复监控服务（需用户曾手动开启过监控）。
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_BOOT_COMPLETED) {
      return
    }
    if (!MonitorPreferences.isMonitorEnabled(context)) {
      return
    }

    val serviceIntent =
      Intent(context, BehaviorMonitorService::class.java).apply {
        action = BehaviorMonitorService.ACTION_START
      }
    ContextCompat.startForegroundService(context, serviceIntent)
  }
}
