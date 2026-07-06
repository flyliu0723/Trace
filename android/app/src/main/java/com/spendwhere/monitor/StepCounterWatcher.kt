package com.spendwhere.monitor

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper

/**
 * 通过硬件计步传感器推断步行/静止，不依赖 Google Play Services。
 * 每分钟采样步数增量，状态变化时写入 activity_change 事件。
 */
object StepCounterWatcher {
  private const val POLL_INTERVAL_MS = 60_000L
  /** 每分钟至少增加这么多步，视为进入步行 */
  private const val WALKING_STEP_DELTA = 20
  /** 每分钟步数低于此值，计为低活动采样 */
  private const val STILL_STEP_DELTA = 5
  /** 连续低活动采样次数达到此值后，从步行回落为静止 */
  private const val STILL_STREAK_REQUIRED = 2

  private var handler: Handler? = null
  private var sensorManager: SensorManager? = null
  private var stepSensor: Sensor? = null
  private var isRunning = false
  private var latestStepCount = -1f
  private var baselineStepCount = -1f
  private var inferredActivity = "STILL"
  private var lowActivityStreak = 0

  private val stepListener =
    object : SensorEventListener {
      override fun onSensorChanged(event: SensorEvent) {
        latestStepCount = event.values[0]
      }

      override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // 无需处理
      }
    }

  private val pollRunnable =
    object : Runnable {
      override fun run() {
        evaluateActivity()
        handler?.postDelayed(this, POLL_INTERVAL_MS)
      }
    }

  fun hasSensor(context: Context): Boolean {
    val manager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager ?: return false
    return manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) != null
  }

  fun isActive(): Boolean = isRunning

  fun start(context: Context) {
    if (isRunning) {
      return
    }
    if (!ActivityRecognitionWatcher.hasPermission(context)) {
      return
    }

    sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
    stepSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    if (stepSensor == null) {
      android.util.Log.w("StepCounterWatcher", "设备无 TYPE_STEP_COUNTER 传感器")
      return
    }

    latestStepCount = -1f
    baselineStepCount = -1f
    inferredActivity = "STILL"
    lowActivityStreak = 0

    sensorManager?.registerListener(
      stepListener,
      stepSensor,
      SensorManager.SENSOR_DELAY_NORMAL,
    )

    handler = Handler(Looper.getMainLooper())
    handler?.postDelayed(pollRunnable, POLL_INTERVAL_MS)
    isRunning = true
    android.util.Log.i("StepCounterWatcher", "计步运动检测已启动")
  }

  fun stop() {
    if (!isRunning) {
      return
    }

    handler?.removeCallbacks(pollRunnable)
    handler = null
    sensorManager?.unregisterListener(stepListener)
    sensorManager = null
    stepSensor = null
    isRunning = false
  }

  private fun evaluateActivity() {
    if (latestStepCount < 0f) {
      return
    }

    if (baselineStepCount < 0f) {
      baselineStepCount = latestStepCount
      return
    }

    val delta = latestStepCount - baselineStepCount
    baselineStepCount = latestStepCount

    when {
      delta >= WALKING_STEP_DELTA -> {
        lowActivityStreak = 0
        transitionTo("WALKING")
      }
      delta < STILL_STEP_DELTA -> {
        lowActivityStreak += 1
        if (inferredActivity == "WALKING" && lowActivityStreak >= STILL_STREAK_REQUIRED) {
          transitionTo("STILL")
        }
      }
      else -> {
        lowActivityStreak = 0
      }
    }
  }

  private fun transitionTo(activity: String) {
    if (activity == inferredActivity) {
      return
    }

    inferredActivity = activity
    EventStore.addEvent(
      MonitorEvent(
        type = "activity_change",
        timestamp = System.currentTimeMillis(),
        metadata =
          mapOf(
            "activity" to activity,
            "detector" to "step_counter",
          ),
        source = "native",
      ),
    )
    android.util.Log.i("StepCounterWatcher", "活动状态切换: $activity")
  }
}
