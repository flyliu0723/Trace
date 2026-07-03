package com.spendwhere.monitor

import android.content.Context
import android.media.AudioManager
import android.os.Handler
import android.os.Looper

/**
 * 监听系统是否有音频输出，并在 MediaSession 尚未捕获时触发立即重扫。
 * Android 10+ 起公开 API 不再暴露播放者 UID，因此无法独立识别 package，
 * 此处作为 MediaSession 的辅助加速层（覆盖桌面小组件等延迟注册场景）。
 */
object AudioPlaybackWatcher {
  private val handler = Handler(Looper.getMainLooper())
  private var appContext: Context? = null
  private var playbackCallback: AudioManager.AudioPlaybackCallback? = null
  private var lastMusicActive = false

  private val pollRunnable =
    object : Runnable {
      override fun run() {
        pollActivePlayback()
        handler.postDelayed(this, POLL_INTERVAL_MS)
      }
    }

  fun start(context: Context) {
    stop()
    appContext = context.applicationContext

    val audioManager =
      appContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return

    val callback =
      object : AudioManager.AudioPlaybackCallback() {
        override fun onPlaybackConfigChanged(
          configs: MutableList<android.media.AudioPlaybackConfiguration>,
        ) {
          nudgeMediaSessionScan()
        }
      }
    playbackCallback = callback
    audioManager.registerAudioPlaybackCallback(callback, handler)

    pollActivePlayback()
    handler.post(pollRunnable)
  }

  fun stop() {
    handler.removeCallbacks(pollRunnable)

    val context = appContext
    val callback = playbackCallback
    if (context != null && callback != null) {
      val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
      audioManager?.unregisterAudioPlaybackCallback(callback)
    }

    playbackCallback = null
    lastMusicActive = false
    appContext = null
  }

  /** 兼容 MediaStateReconciler 接口；package 识别仍由 MediaSession 负责 */
  fun getPlayingPackages(): Set<String> = emptySet()

  fun isPlaying(packageName: String): Boolean = false

  private fun pollActivePlayback() {
    val context = appContext ?: return
    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
    val musicActive = audioManager.isMusicActive

    if (musicActive) {
      nudgeMediaSessionScan()
    }

    if (musicActive && !lastMusicActive) {
      handler.postDelayed({ nudgeMediaSessionScan() }, FOLLOW_UP_DELAY_MS)
      handler.postDelayed({ nudgeMediaSessionScan() }, FOLLOW_UP_DELAY_MS * 3)
    }

    lastMusicActive = musicActive
  }

  private fun nudgeMediaSessionScan() {
    MediaSessionWatcher.pollNow()
  }

  private const val POLL_INTERVAL_MS = 3_000L
  private const val FOLLOW_UP_DELAY_MS = 1_000L
}
