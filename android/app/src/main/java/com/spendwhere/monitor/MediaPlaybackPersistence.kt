package com.spendwhere.monitor

import android.content.Context

data class PersistedPlayback(
  val packageName: String,
  val startTime: Long,
  val title: String?,
  val artist: String?,
)

/**
 * 持久化进行中的媒体播放，供服务重启后静默恢复，避免重复 media_start。
 */
object MediaPlaybackPersistence {
  private const val PREFS_NAME = "spendwhere_media_playback"

  fun recordStart(
    context: Context,
    packageName: String,
    startTime: Long,
    metadata: Map<String, String>?,
  ) {
    prefs(context)
      .edit()
      .putLong(fieldKey(packageName, "start"), startTime)
      .putString(fieldKey(packageName, "title"), metadata?.get("title"))
      .putString(fieldKey(packageName, "artist"), metadata?.get("artist"))
      .apply()
  }

  fun recordStop(context: Context, packageName: String) {
    prefs(context)
      .edit()
      .remove(fieldKey(packageName, "start"))
      .remove(fieldKey(packageName, "title"))
      .remove(fieldKey(packageName, "artist"))
      .apply()
  }

  fun getActivePlayback(context: Context, packageName: String): PersistedPlayback? {
    val start = prefs(context).getLong(fieldKey(packageName, "start"), -1L)
    if (start <= 0) {
      return null
    }
    return PersistedPlayback(
      packageName = packageName,
      startTime = start,
      title = prefs(context).getString(fieldKey(packageName, "title"), null),
      artist = prefs(context).getString(fieldKey(packageName, "artist"), null),
    )
  }

  fun getAllActivePlaybacks(context: Context): List<PersistedPlayback> {
    val allKeys = prefs(context).all.keys
    val packages =
      allKeys
        .filter { it.startsWith("active|") && it.endsWith("|start") }
        .mapNotNull { key ->
          val parts = key.split("|")
          if (parts.size >= 3) parts[1] else null
        }
        .distinct()

    return packages.mapNotNull { getActivePlayback(context, it) }
  }

  fun updateMetadata(
    context: Context,
    packageName: String,
    metadata: Map<String, String>?,
  ) {
    if (getActivePlayback(context, packageName) == null) {
      return
    }
    prefs(context)
      .edit()
      .putString(fieldKey(packageName, "title"), metadata?.get("title"))
      .putString(fieldKey(packageName, "artist"), metadata?.get("artist"))
      .apply()
  }

  private fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  private fun fieldKey(packageName: String, field: String) = "active|$packageName|$field"
}
