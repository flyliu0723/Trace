package com.spendwhere.monitor

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

class BehaviorMonitorModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "BehaviorMonitor"

  @ReactMethod
  fun startMonitor(promise: Promise) {
    try {
      MonitorPreferences.setMonitorEnabled(reactContext, true)
      val intent = Intent(reactContext, BehaviorMonitorService::class.java).apply {
        action = BehaviorMonitorService.ACTION_START
      }
      ContextCompat.startForegroundService(reactContext, intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("START_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun stopMonitor(promise: Promise) {
    try {
      MonitorPreferences.setMonitorEnabled(reactContext, false)
      val intent = Intent(reactContext, BehaviorMonitorService::class.java).apply {
        action = BehaviorMonitorService.ACTION_STOP
      }
      reactContext.startService(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("STOP_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun getMonitorStatus(promise: Promise) {
    try {
      val manufacturer = BatteryOptimizationHelper.getManufacturerKey()
      val map: WritableMap = Arguments.createMap()
      map.putBoolean("isRunning", BehaviorMonitorService.isRunning)
      map.putBoolean("hasUsageAccess", hasUsageAccess())
      map.putBoolean("hasNotificationPermission", hasNotificationPermission())
      map.putBoolean(
        "hasNotificationListenerAccess",
        MediaSessionWatcher.hasNotificationListenerAccess(reactContext),
      )
      map.putBoolean(
        "isIgnoringBatteryOptimizations",
        BatteryOptimizationHelper.isIgnoringBatteryOptimizations(reactContext),
      )
      map.putBoolean(
        "hasActivityRecognitionPermission",
        ActivityRecognitionWatcher.hasPermission(reactContext),
      )
      map.putString("manufacturer", manufacturer)
      map.putString("romKeepAliveHint", BatteryOptimizationHelper.getRomKeepAliveHint(manufacturer))
      promise.resolve(map)
    } catch (e: Exception) {
      promise.reject("STATUS_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun requestUsageAccess(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("USAGE_ACCESS_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun requestNotificationPermission(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
        }
        reactContext.startActivity(intent)
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("NOTIFICATION_PERMISSION_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun requestNotificationListenerAccess(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("NOTIFICATION_LISTENER_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun requestBatteryOptimizationExemption(promise: Promise) {
    try {
      BatteryOptimizationHelper.openBatteryOptimizationSettings(reactContext)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("BATTERY_OPTIMIZATION_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun refreshContextSensors(promise: Promise) {
    try {
      if (BehaviorMonitorService.isRunning) {
        ActivityRecognitionWatcher.start(reactContext)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("REFRESH_CONTEXT_SENSORS_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun syncEvents(promise: Promise) {
    try {
      val events = EventStore.drainEvents()
      val array: WritableArray = Arguments.createArray()
      for (event in events) {
        array.pushMap(event.toWritableMap())
      }
      promise.resolve(array)
    } catch (e: Exception) {
      promise.reject("SYNC_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun reconcileEvents(sinceTimestamp: Double, promise: Promise) {
    try {
      if (!hasUsageAccess()) {
        promise.resolve(Arguments.createArray())
        return
      }
      val since = sinceTimestamp.toLong()
      val events = UsageStatsReconciler.reconcile(reactContext, since)
      val array: WritableArray = Arguments.createArray()
      for (event in events) {
        array.pushMap(event.toWritableMap())
      }
      promise.resolve(array)
    } catch (e: Exception) {
      promise.reject("RECONCILE_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun reconcileMediaState(promise: Promise) {
    try {
      val events = MediaStateReconciler.reconcile(reactContext)
      val array: WritableArray = Arguments.createArray()
      for (event in events) {
        array.pushMap(event.toWritableMap())
      }
      promise.resolve(array)
    } catch (e: Exception) {
      promise.reject("RECONCILE_MEDIA_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun getActiveMediaPackages(promise: Promise) {
    try {
      val playing = mutableSetOf<String>()
      playing.addAll(MediaSessionWatcher.getPlayingPackages())
      playing.addAll(AudioPlaybackWatcher.getPlayingPackages())
      val array: WritableArray = Arguments.createArray()
      for (pkg in playing.sorted()) {
        array.pushString(pkg)
      }
      promise.resolve(array)
    } catch (e: Exception) {
      promise.reject("GET_ACTIVE_MEDIA_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun resolveAppLabels(packageNames: ReadableArray, promise: Promise) {
    try {
      val result: WritableMap = Arguments.createMap()
      for (i in 0 until packageNames.size()) {
        val pkg = packageNames.getString(i) ?: continue
        result.putString(pkg, AppInfoResolver.resolveAppLabel(reactContext, pkg))
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("RESOLVE_LABELS_FAILED", e.message, e)
    }
  }

  @ReactMethod
  fun getAppIcons(packageNames: ReadableArray, promise: Promise) {
    try {
      val result: WritableMap = Arguments.createMap()
      for (i in 0 until packageNames.size()) {
        val pkg = packageNames.getString(i) ?: continue
        val icon = AppInfoResolver.getAppIconBase64(reactContext, pkg)
        if (icon != null) {
          result.putString(pkg, icon)
        }
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("GET_ICONS_FAILED", e.message, e)
    }
  }

  private fun hasUsageAccess(): Boolean {
    val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode =
      appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        reactContext.packageName,
      )
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun hasNotificationPermission(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return true
    }
    return reactContext.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
      android.content.pm.PackageManager.PERMISSION_GRANTED
  }
}
