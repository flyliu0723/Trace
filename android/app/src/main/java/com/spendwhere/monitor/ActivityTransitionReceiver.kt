package com.spendwhere.monitor

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionResult
import com.google.android.gms.location.DetectedActivity

/**
 * 接收 Activity Transition 回调，写入 activity_change 事件。
 */
class ActivityTransitionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (!ActivityTransitionResult.hasResult(intent)) {
      return
    }

    val result = ActivityTransitionResult.extractResult(intent) ?: return

    for (event in result.transitionEvents) {
      if (event.transitionType != ActivityTransition.ACTIVITY_TRANSITION_ENTER) {
        continue
      }

      val activity = activityTypeToString(event.activityType)
      EventStore.addEvent(
        MonitorEvent(
          type = "activity_change",
          timestamp = System.currentTimeMillis(),
          metadata =
            mapOf(
              "activity" to activity,
              "detector" to "google",
            ),
          source = "native",
        ),
      )
    }
  }

  private fun activityTypeToString(activityType: Int): String =
    when (activityType) {
      DetectedActivity.WALKING -> "WALKING"
      DetectedActivity.RUNNING -> "RUNNING"
      DetectedActivity.STILL -> "STILL"
      DetectedActivity.IN_VEHICLE -> "IN_VEHICLE"
      DetectedActivity.ON_FOOT -> "ON_FOOT"
      DetectedActivity.ON_BICYCLE -> "ON_BICYCLE"
      else -> "UNKNOWN"
    }
}
