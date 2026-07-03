package com.spendwhere.monitor

import android.content.Context

/**
 * 对比持久化播放状态与实际播放状态，补全遗漏的 media_stop。
 */
object MediaStateReconciler {
  fun reconcile(context: Context): List<MonitorEvent> {
    val playingNow = mutableSetOf<String>()
    playingNow.addAll(MediaSessionWatcher.getPlayingPackages())
    playingNow.addAll(AudioPlaybackWatcher.getPlayingPackages())

    val events = mutableListOf<MonitorEvent>()
    val persisted = MediaPlaybackPersistence.getAllActivePlaybacks(context)

    for (playback in persisted) {
      if (playback.packageName in playingNow) {
        continue
      }

      events.add(
        MonitorEvent(
          type = "media_stop",
          timestamp = System.currentTimeMillis(),
          packageName = playback.packageName,
          appLabel = AppInfoResolver.resolveAppLabel(context, playback.packageName),
          metadata = mapOf("reconciled" to "true"),
          source = "reconcile",
        ),
      )
      MediaPlaybackPersistence.recordStop(context, playback.packageName)
    }

    return events
  }
}
