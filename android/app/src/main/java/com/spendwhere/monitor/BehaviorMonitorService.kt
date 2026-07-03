package com.spendwhere.monitor

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.spendwhere.MainActivity
import com.spendwhere.R

class BehaviorMonitorService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var screenReceiver: BroadcastReceiver? = null
  private var lastUsageQueryTime = System.currentTimeMillis()
  private var lastForegroundPackage: String? = null
  private var postureSampler: PostureSampler? = null

  private val usagePollRunnable =
    object : Runnable {
      override fun run() {
        pollUsageEvents()
        handler.postDelayed(this, USAGE_POLL_INTERVAL_MS)
      }
    }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    registerScreenReceiver()
    postureSampler = PostureSampler(applicationContext)
    handler.post(usagePollRunnable)
    MediaSessionWatcher.start(applicationContext)
    AudioPlaybackWatcher.start(applicationContext)
    ActivityRecognitionWatcher.start(applicationContext)
    isRunning = true
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP -> {
        stopSelf()
        return START_NOT_STICKY
      }
      else -> {
        val notification = buildNotification()
        startForeground(NOTIFICATION_ID, notification)
        isRunning = true
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(usagePollRunnable)
    unregisterScreenReceiver()
    postureSampler?.stopSampling()
    postureSampler = null
    MediaSessionWatcher.stop()
    AudioPlaybackWatcher.stop()
    ActivityRecognitionWatcher.stop(applicationContext)
    isRunning = false
    super.onDestroy()
  }

  private fun registerScreenReceiver() {
    screenReceiver =
      object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
          when (intent?.action) {
            Intent.ACTION_USER_PRESENT -> {
              EventStore.addEvent(
                MonitorEvent(type = "unlock", timestamp = System.currentTimeMillis()),
              )
              postureSampler?.startSampling()
            }
            Intent.ACTION_SCREEN_OFF -> {
              EventStore.addEvent(
                MonitorEvent(type = "screen_off", timestamp = System.currentTimeMillis()),
              )
              postureSampler?.stopSampling()
            }
          }
        }
      }

    val filter =
      IntentFilter().apply {
        addAction(Intent.ACTION_USER_PRESENT)
        addAction(Intent.ACTION_SCREEN_OFF)
      }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      registerReceiver(screenReceiver, filter, RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      registerReceiver(screenReceiver, filter)
    }
  }

  private fun unregisterScreenReceiver() {
    screenReceiver?.let {
      try {
        unregisterReceiver(it)
      } catch (_: IllegalArgumentException) {
        // 已注销
      }
    }
    screenReceiver = null
  }

  private fun pollUsageEvents() {
    val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return
    val now = System.currentTimeMillis()
    val events = usageStatsManager.queryEvents(lastUsageQueryTime, now)
    val usageEvent = UsageEvents.Event()

    while (events.hasNextEvent()) {
      events.getNextEvent(usageEvent)
      when (usageEvent.eventType) {
        UsageEvents.Event.MOVE_TO_FOREGROUND -> {
          val pkg = usageEvent.packageName ?: continue
          if (pkg == packageName) {
            continue
          }
          if (lastForegroundPackage != pkg) {
            lastForegroundPackage = pkg
            val appLabel = AppInfoResolver.resolveAppLabel(this, pkg)
            EventStore.addEvent(
              MonitorEvent(
                type = "app_foreground",
                timestamp = usageEvent.timeStamp,
                packageName = pkg,
                appLabel = appLabel,
                source = "usage_stats",
              ),
            )
            postureSampler?.startSampling()
          }
        }
        UsageEvents.Event.MOVE_TO_BACKGROUND -> {
          val pkg = usageEvent.packageName ?: continue
          if (pkg == packageName) {
            continue
          }
          if (lastForegroundPackage == pkg) {
            lastForegroundPackage = null
          }
          val appLabel = AppInfoResolver.resolveAppLabel(this, pkg)
          EventStore.addEvent(
            MonitorEvent(
              type = "app_background",
              timestamp = usageEvent.timeStamp,
              packageName = pkg,
              appLabel = appLabel,
              source = "usage_stats",
            ),
          )
        }
      }
    }
    lastUsageQueryTime = now
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val channel =
      NotificationChannel(
        CHANNEL_ID,
        "行为采集",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "轨迹正在记录"
      }
    val manager = getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(): Notification {
    val launchIntent = Intent(this, MainActivity::class.java)
    val pendingIntent =
      PendingIntent.getActivity(
        this,
        0,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("轨迹运行中")
      .setContentText("记录解锁、应用使用、运动与姿态")
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentIntent(pendingIntent)
      .setOngoing(true)
      .build()
  }

  companion object {
    const val ACTION_START = "com.spendwhere.monitor.START"
    const val ACTION_STOP = "com.spendwhere.monitor.STOP"
    private const val CHANNEL_ID = "spendwhere_monitor"
    private const val NOTIFICATION_ID = 1001
    private const val USAGE_POLL_INTERVAL_MS = 5_000L

    @Volatile
    var isRunning: Boolean = false
  }
}
