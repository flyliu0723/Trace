package com.spendwhere.monitor

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context

/**
 * 从 UsageStatsManager 拉取历史事件，用于对账补全采集断层。
 */
object UsageStatsReconciler {
  private const val MAX_RECONCILE_WINDOW_MS = 7L * 24 * 60 * 60 * 1000

  fun reconcile(context: Context, sinceTimestamp: Long): List<MonitorEvent> {
    val usageStatsManager =
      context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return emptyList()

    val now = System.currentTimeMillis()
    val start = maxOf(sinceTimestamp, now - MAX_RECONCILE_WINDOW_MS)
    if (start >= now) {
      return emptyList()
    }

    val events = usageStatsManager.queryEvents(start, now)
    val usageEvent = UsageEvents.Event()
    val result = mutableListOf<MonitorEvent>()
    val ownPackage = context.packageName

    while (events.hasNextEvent()) {
      events.getNextEvent(usageEvent)
      val mapped = mapUsageEvent(context, usageEvent, ownPackage) ?: continue
      result.add(mapped)
    }

    return result
  }

  private fun mapUsageEvent(
    context: Context,
    event: UsageEvents.Event,
    ownPackage: String,
  ): MonitorEvent? {
    val pkg = event.packageName
    if (pkg == ownPackage) {
      return null
    }

    return when (event.eventType) {
      UsageEvents.Event.MOVE_TO_FOREGROUND -> {
        if (pkg.isNullOrBlank()) {
          return null
        }
        MonitorEvent(
          type = "app_foreground",
          timestamp = event.timeStamp,
          packageName = pkg,
          appLabel = AppInfoResolver.resolveAppLabel(context, pkg),
          source = "reconcile",
        )
      }
      UsageEvents.Event.MOVE_TO_BACKGROUND -> {
        if (pkg.isNullOrBlank()) {
          return null
        }
        MonitorEvent(
          type = "app_background",
          timestamp = event.timeStamp,
          packageName = pkg,
          appLabel = AppInfoResolver.resolveAppLabel(context, pkg),
          source = "reconcile",
        )
      }
      UsageEvents.Event.KEYGUARD_HIDDEN -> {
        MonitorEvent(
          type = "unlock",
          timestamp = event.timeStamp,
          source = "reconcile",
        )
      }
      UsageEvents.Event.SCREEN_NON_INTERACTIVE -> {
        MonitorEvent(
          type = "screen_off",
          timestamp = event.timeStamp,
          source = "reconcile",
        )
      }
      else -> null
    }
  }
}
