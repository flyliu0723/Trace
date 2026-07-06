package com.spendwhere.monitor

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionRequest
import com.google.android.gms.location.DetectedActivity

/**
 * 通过 Activity Transition API 检测步行、静止等运动状态变化。
 * 仅在状态切换时写入事件，避免持续采样耗电。
 */
object ActivityRecognitionWatcher {
  private const val REQUEST_CODE = 42001

  fun start(context: Context) {
    if (!hasPermission(context)) {
      return
    }

    val transitions = mutableListOf<ActivityTransition>()
    val activities =
      listOf(
        DetectedActivity.WALKING,
        DetectedActivity.RUNNING,
        DetectedActivity.ON_FOOT,
        DetectedActivity.STILL,
        DetectedActivity.IN_VEHICLE,
      )

    for (activity in activities) {
      transitions.add(
        ActivityTransition.Builder()
          .setActivityType(activity)
          .setActivityTransition(ActivityTransition.ACTIVITY_TRANSITION_ENTER)
          .build(),
      )
    }

    val request = ActivityTransitionRequest(transitions)
    val intent =
      Intent(context, ActivityTransitionReceiver::class.java).apply {
        setPackage(context.packageName)
      }
    val pendingIntent =
      PendingIntent.getBroadcast(
        context,
        REQUEST_CODE,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
      )

    ActivityRecognition.getClient(context)
      .requestActivityTransitionUpdates(request, pendingIntent)
      .addOnFailureListener { error ->
        android.util.Log.w("ActivityRecognition", "注册活动识别失败: ${error.message}")
      }
  }

  fun stop(context: Context) {
    val intent =
      Intent(context, ActivityTransitionReceiver::class.java).apply {
        setPackage(context.packageName)
      }
    val pendingIntent =
      PendingIntent.getBroadcast(
        context,
        REQUEST_CODE,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
      )

    ActivityRecognition.getClient(context)
      .removeActivityTransitionUpdates(pendingIntent)
      .addOnFailureListener { error ->
        android.util.Log.w("ActivityRecognition", "注销活动识别失败: ${error.message}")
      }
  }

  fun hasPermission(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      return true
    }
    return ContextCompat.checkSelfPermission(
      context,
      Manifest.permission.ACTIVITY_RECOGNITION,
    ) == PackageManager.PERMISSION_GRANTED
  }
}
