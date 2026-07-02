package com.spendwhere.monitor

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.sqrt

/**
 * 在亮屏使用期间低频采样重力向量，推断躺卧 / 手持等姿态。
 */
class PostureSampler(private val context: Context) {
  private val handler = Handler(Looper.getMainLooper())
  private var sensorManager: SensorManager? = null
  private var postureSensor: Sensor? = null
  private var isSampling = false
  private var lastPosture: String? = null
  private var pendingPosture: String? = null
  private var stableCount = 0

  private val sensorListener =
    object : SensorEventListener {
      override fun onSensorChanged(event: SensorEvent) {
        if (!isSampling) {
          return
        }

        val posture = classifyPosture(event.values[0], event.values[1], event.values[2])
        if (posture == pendingPosture) {
          stableCount++
        } else {
          pendingPosture = posture
          stableCount = 1
        }

        if (stableCount >= STABLE_COUNT && posture != lastPosture) {
          lastPosture = posture
          EventStore.addEvent(
            MonitorEvent(
              type = "posture_change",
              timestamp = System.currentTimeMillis(),
              metadata = mapOf("posture" to posture),
              source = "native",
            ),
          )
        }
      }

      override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // 无需处理
      }
    }

  fun startSampling() {
    if (isSampling) {
      return
    }

    isSampling = true
    sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
    postureSensor =
      sensorManager?.getDefaultSensor(Sensor.TYPE_GRAVITY)
        ?: sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    postureSensor?.let { sensor ->
      sensorManager?.registerListener(
        sensorListener,
        sensor,
        SensorManager.SENSOR_DELAY_NORMAL,
      )
    }
  }

  fun stopSampling() {
    if (!isSampling) {
      return
    }

    isSampling = false
    sensorManager?.unregisterListener(sensorListener)
    pendingPosture = null
    stableCount = 0
  }

  companion object {
    private const val STABLE_COUNT = 3

    /**
     * 根据重力向量计算手机相对水平面的倾角。
     * 倾角较小（接近平放）视为躺卧使用，较大视为手持。
     */
    fun classifyPosture(x: Float, y: Float, z: Float): String {
      val horizontal = sqrt((x * x + y * y).toDouble())
      val pitch = Math.toDegrees(atan2(horizontal, abs(z).toDouble())).toFloat()

      return when {
        pitch < 50f -> "lying"
        else -> "handheld"
      }
    }
  }
}
