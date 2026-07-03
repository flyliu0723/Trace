package com.spendwhere.monitor

import android.content.Context
import android.media.session.MediaController

object MediaMetadataHelper {
  fun buildMetadata(controller: MediaController): Map<String, String> {
    val metadata = controller.metadata ?: return emptyMap()
    val result = mutableMapOf<String, String>()

    metadata.getString(android.media.MediaMetadata.METADATA_KEY_TITLE)?.let { result["title"] = it }
    metadata.getString(android.media.MediaMetadata.METADATA_KEY_ARTIST)?.let { result["artist"] = it }
    metadata.getString(android.media.MediaMetadata.METADATA_KEY_ALBUM)?.let { result["album"] = it }

    val duration = metadata.getLong(android.media.MediaMetadata.METADATA_KEY_DURATION)
    if (duration > 0) {
      result["durationMs"] = duration.toString()
    }

    return result
  }

  fun buildTrackKey(metadata: Map<String, String>): String {
    return listOf(
      metadata["title"].orEmpty(),
      metadata["artist"].orEmpty(),
      metadata["album"].orEmpty(),
    ).joinToString("|")
  }
}
