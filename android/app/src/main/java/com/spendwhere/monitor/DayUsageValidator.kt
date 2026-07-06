package com.spendwhere.monitor

import android.app.usage.UsageStatsManager
import android.content.Context
import java.util.Calendar

/**
 * 从系统 UsageStats 汇总某日前台总时长，用于与本地采集结果交叉验证。
 */
object DayUsageValidator {
  fun getSystemForegroundMs(context: Context, dateString: String): Long {
    val usageStatsManager =
      context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return 0L

    val (start, end) = dayRangeMillis(dateString)
    if (start >= end) {
      return 0L
    }

    val stats =
      usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_BEST, start, end) ?: return 0L
    val ownPackage = context.packageName
    var total = 0L
    for (stat in stats) {
      if (stat.packageName == ownPackage) {
        continue
      }
      total += stat.totalTimeInForeground
    }
    return total
  }

  private fun dayRangeMillis(dateString: String): Pair<Long, Long> {
    val parts = dateString.split("-")
    if (parts.size != 3) {
      return 0L to 0L
    }

    val year = parts[0].toIntOrNull() ?: return 0L to 0L
    val month = parts[1].toIntOrNull()?.minus(1) ?: return 0L to 0L
    val day = parts[2].toIntOrNull() ?: return 0L to 0L

    val startCal =
      Calendar.getInstance().apply {
        set(Calendar.YEAR, year)
        set(Calendar.MONTH, month)
        set(Calendar.DAY_OF_MONTH, day)
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }
    val endCal =
      Calendar.getInstance().apply {
        timeInMillis = startCal.timeInMillis
        add(Calendar.DAY_OF_MONTH, 1)
        add(Calendar.MILLISECOND, -1)
      }
    return startCal.timeInMillis to endCal.timeInMillis
  }
}
