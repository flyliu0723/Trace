package com.spendwhere.monitor

import android.content.ComponentName
import android.content.Context
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Handler
import android.os.Looper
import android.provider.Settings

/**
 * 通过 MediaSession 检测后台音频播放（播客、音乐等）。
 * 需要用户授予「通知使用权」才能获取活跃媒体会话。
 */
object MediaSessionWatcher {
  private val handler = Handler(Looper.getMainLooper())
  private var appContext: Context? = null
  private var mediaSessionManager: MediaSessionManager? = null
  private var listenerComponent: ComponentName? = null

  private val activeControllers = mutableMapOf<String, MediaController>()
  private val controllerCallbacks = mutableMapOf<String, MediaController.Callback>()
  private val lastPlaybackState = mutableMapOf<String, Int>()
  private val lastTrackKey = mutableMapOf<String, String>()
  private var pendingInitialScan = false

  private val sessionsChangedListener =
    MediaSessionManager.OnActiveSessionsChangedListener { controllers ->
      syncControllers(controllers ?: emptyList())
    }

  private val pollRunnable =
    object : Runnable {
      override fun run() {
        pollActiveSessions()
        handler.postDelayed(this, POLL_INTERVAL_MS)
      }
    }

  fun hasNotificationListenerAccess(context: Context): Boolean {
    val enabled =
      Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        ?: return false
    return enabled.contains(context.packageName)
  }

  fun isPlaying(packageName: String): Boolean {
    return lastPlaybackState[packageName] == PlaybackState.STATE_PLAYING
  }

  fun getPlayingPackages(): Set<String> {
    return lastPlaybackState
      .filter { it.value == PlaybackState.STATE_PLAYING }
      .keys
      .toSet()
  }

  fun start(context: Context) {
    if (!hasNotificationListenerAccess(context)) {
      return
    }

    stop()
    appContext = context.applicationContext
    mediaSessionManager =
      appContext?.getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager
    listenerComponent =
      ComponentName(appContext!!, SpendWhereNotificationListenerService::class.java)
    pendingInitialScan = true

    try {
      mediaSessionManager?.addOnActiveSessionsChangedListener(
        sessionsChangedListener,
        listenerComponent,
        handler,
      )
      pollActiveSessions()
      handler.post(pollRunnable)
    } catch (_: SecurityException) {
      // 未授权通知使用权
    }
  }

  fun stop() {
    handler.removeCallbacks(pollRunnable)
    try {
      mediaSessionManager?.removeOnActiveSessionsChangedListener(sessionsChangedListener)
    } catch (_: Exception) {
      // 已移除
    }

    for ((pkg, controller) in activeControllers) {
      controllerCallbacks[pkg]?.let { controller.unregisterCallback(it) }
    }
    activeControllers.clear()
    controllerCallbacks.clear()
    lastPlaybackState.clear()
    lastTrackKey.clear()
    pendingInitialScan = false
    mediaSessionManager = null
    listenerComponent = null
    appContext = null
  }

  fun onNotificationListenerConnected(context: Context) {
    if (BehaviorMonitorService.isRunning) {
      start(context)
    }
  }

  fun onNotificationListenerDisconnected() {
    stop()
  }

  /** 供 AudioPlaybackWatcher 在检测到系统有音频输出时立即重扫 MediaSession */
  fun pollNow() {
    pollActiveSessions()
  }

  private fun pollActiveSessions() {
    val context = appContext ?: return
    val manager = mediaSessionManager ?: return
    val component = listenerComponent ?: return

    try {
      val controllers = manager.getActiveSessions(component)
      syncControllers(controllers)
    } catch (_: SecurityException) {
      // 权限丢失
    }
  }

  private fun syncControllers(controllers: List<MediaController>) {
    val context = appContext ?: return
    val isRecovering = pendingInitialScan
    val currentPackages = controllers.map { it.packageName }.toSet()

    for (controller in controllers) {
      val pkg = controller.packageName
      if (activeControllers.containsKey(pkg)) {
        val knownState = lastPlaybackState[pkg]
        val currentState = controller.playbackState?.state
        if (knownState != null && currentState != null && knownState != currentState) {
          handlePlaybackTransition(context, controller, knownState, currentState)
        } else if (knownState == null) {
          observeInitialState(context, controller, isRecovering)
        }
        checkMetadataChange(context, controller)
        continue
      }

      val callback =
        object : MediaController.Callback() {
          override fun onPlaybackStateChanged(state: PlaybackState?) {
            val previous = lastPlaybackState[pkg] ?: PlaybackState.STATE_NONE
            val next = state?.state ?: PlaybackState.STATE_NONE
            if (previous != next) {
              handlePlaybackTransition(context, controller, previous, next)
            }
          }

          override fun onMetadataChanged(metadata: android.media.MediaMetadata?) {
            checkMetadataChange(context, controller)
          }

          override fun onSessionDestroyed() {
            handleSessionDestroyed(context, pkg)
          }
        }

      controller.registerCallback(callback, handler)
      activeControllers[pkg] = controller
      controllerCallbacks[pkg] = callback
      observeInitialState(context, controller, isRecovering)
    }

    val removedPackages = activeControllers.keys - currentPackages
    for (pkg in removedPackages) {
      handleSessionDestroyed(context, pkg)
    }

    if (pendingInitialScan) {
      pendingInitialScan = false
    }
  }

  private fun observeInitialState(
    context: Context,
    controller: MediaController,
    isRecovering: Boolean,
  ) {
    val pkg = controller.packageName
    val state = controller.playbackState?.state ?: PlaybackState.STATE_NONE
    val previous = lastPlaybackState[pkg]

    if (previous == null) {
      lastPlaybackState[pkg] = state
      rememberTrackKey(controller)
      if (state == PlaybackState.STATE_PLAYING) {
        handlePlayingDiscovered(context, controller, isRecovering)
      } else if (isRecovering) {
        MediaPlaybackPersistence.recordStop(context, pkg)
      }
      return
    }

    if (previous != state) {
      handlePlaybackTransition(context, controller, previous, state)
    }
  }

  private fun rememberTrackKey(controller: MediaController) {
    val pkg = controller.packageName
    val metadata = MediaMetadataHelper.buildMetadata(controller)
    lastTrackKey[pkg] = MediaMetadataHelper.buildTrackKey(metadata)
  }

  private fun checkMetadataChange(context: Context, controller: MediaController) {
    val pkg = controller.packageName
    if (lastPlaybackState[pkg] != PlaybackState.STATE_PLAYING) {
      return
    }

    val metadata = MediaMetadataHelper.buildMetadata(controller)
    val trackKey = MediaMetadataHelper.buildTrackKey(metadata)
    if (trackKey.isBlank()) {
      return
    }

    val previous = lastTrackKey[pkg]
    if (previous == null) {
      lastTrackKey[pkg] = trackKey
      return
    }

    if (previous != trackKey) {
      lastTrackKey[pkg] = trackKey
      emitMediaEvent(context, controller, "media_track_change")
    }
  }

  private fun handlePlayingDiscovered(
    context: Context,
    controller: MediaController,
    isRecovering: Boolean,
  ) {
    if (!isRecovering) {
      emitMediaEvent(context, controller, "media_start")
      return
    }

    val pkg = controller.packageName
    val persisted = MediaPlaybackPersistence.getActivePlayback(context, pkg)
    if (persisted != null) {
      // 服务重启但播放未中断，静默恢复，不重复写入 media_start
      return
    }

    emitRecoveredMediaStart(context, controller)
  }

  private fun emitRecoveredMediaStart(context: Context, controller: MediaController) {
    val pkg = controller.packageName
    val position = controller.playbackState?.position ?: 0L
    val estimatedStart = maxOf(0L, System.currentTimeMillis() - position)
    val metadata = MediaMetadataHelper.buildMetadata(controller).toMutableMap()
    metadata["recovered"] = "true"

    EventStore.addEvent(
      MonitorEvent(
        type = "media_start",
        timestamp = estimatedStart,
        packageName = pkg,
        appLabel = AppInfoResolver.resolveAppLabel(context, pkg),
        metadata = metadata,
        source = "recovery",
      ),
    )
    MediaPlaybackPersistence.recordStart(context, pkg, estimatedStart, metadata)
    rememberTrackKey(controller)
  }

  private fun handlePlaybackTransition(
    context: Context,
    controller: MediaController,
    previous: Int,
    next: Int,
  ) {
    val pkg = controller.packageName
    lastPlaybackState[pkg] = next

    when {
      next == PlaybackState.STATE_PLAYING && previous != PlaybackState.STATE_PLAYING -> {
        rememberTrackKey(controller)
        emitMediaEvent(context, controller, "media_start")
      }
      next == PlaybackState.STATE_PAUSED && previous == PlaybackState.STATE_PLAYING -> {
        emitMediaEvent(context, controller, "media_pause")
      }
      next == PlaybackState.STATE_PLAYING && previous == PlaybackState.STATE_PAUSED -> {
        rememberTrackKey(controller)
        emitMediaEvent(context, controller, "media_start")
      }
      isStoppedState(next) && wasActiveState(previous) -> {
        emitMediaEvent(context, controller, "media_stop")
      }
    }
  }

  private fun handleSessionDestroyed(context: Context, pkg: String) {
    val previous = lastPlaybackState[pkg]
    if (previous != null && wasActiveState(previous)) {
      val controller = activeControllers[pkg]
      if (controller != null) {
        emitMediaEvent(context, controller, "media_stop")
      } else {
        EventStore.addEvent(
          MonitorEvent(
            type = "media_stop",
            timestamp = System.currentTimeMillis(),
            packageName = pkg,
            appLabel = AppInfoResolver.resolveAppLabel(context, pkg),
            source = "media_session",
          ),
        )
        MediaPlaybackPersistence.recordStop(context, pkg)
      }
    }

    activeControllers[pkg]?.let { controller ->
      controllerCallbacks[pkg]?.let { controller.unregisterCallback(it) }
    }
    activeControllers.remove(pkg)
    controllerCallbacks.remove(pkg)
    lastPlaybackState.remove(pkg)
    lastTrackKey.remove(pkg)
  }

  private fun emitMediaEvent(context: Context, controller: MediaController, type: String) {
    val pkg = controller.packageName
    val metadata = MediaMetadataHelper.buildMetadata(controller)
    val timestamp = System.currentTimeMillis()

    EventStore.addEvent(
      MonitorEvent(
        type = type,
        timestamp = timestamp,
        packageName = pkg,
        appLabel = AppInfoResolver.resolveAppLabel(context, pkg),
        metadata = metadata,
        source = "media_session",
      ),
    )

    when (type) {
      "media_start" -> MediaPlaybackPersistence.recordStart(context, pkg, timestamp, metadata)
      "media_track_change" -> MediaPlaybackPersistence.updateMetadata(context, pkg, metadata)
      "media_pause", "media_stop" -> MediaPlaybackPersistence.recordStop(context, pkg)
    }
  }

  private fun wasActiveState(state: Int): Boolean {
    return state == PlaybackState.STATE_PLAYING || state == PlaybackState.STATE_PAUSED
  }

  private fun isStoppedState(state: Int): Boolean {
    return state == PlaybackState.STATE_STOPPED ||
      state == PlaybackState.STATE_NONE ||
      state == PlaybackState.STATE_ERROR
  }

  private const val POLL_INTERVAL_MS = 3_000L
}
