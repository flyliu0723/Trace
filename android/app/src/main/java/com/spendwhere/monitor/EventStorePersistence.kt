package com.spendwhere.monitor

import android.content.Context
import org.json.JSONObject
import java.io.File

/**
 * 将内存事件缓冲持久化到磁盘，避免进程被杀时丢失未同步事件。
 */
class EventStorePersistence(context: Context) {
  private val file = File(context.applicationContext.filesDir, BUFFER_FILE_NAME)
  private val ioLock = Any()

  fun loadAll(): List<MonitorEvent> {
    synchronized(ioLock) {
      if (!file.exists()) {
        return emptyList()
      }
      return file
        .readLines()
        .mapNotNull { line ->
          val trimmed = line.trim()
          if (trimmed.isEmpty()) {
            null
          } else {
            runCatching { MonitorEvent.fromJson(JSONObject(trimmed)) }.getOrNull()
          }
        }
    }
  }

  fun append(event: MonitorEvent) {
    synchronized(ioLock) {
      file.appendText(event.toJson().toString() + "\n")
      trimIfNeeded()
    }
  }

  fun clear() {
    synchronized(ioLock) {
      if (file.exists()) {
        file.delete()
      }
    }
  }

  fun persistedCount(): Int {
    synchronized(ioLock) {
      if (!file.exists()) {
        return 0
      }
      return file.readLines().count { it.trim().isNotEmpty() }
    }
  }

  private fun trimIfNeeded() {
    if (!file.exists()) {
      return
    }
    val lines = file.readLines().filter { it.trim().isNotEmpty() }
    if (lines.size <= MAX_BUFFER_LINES) {
      return
    }
    val trimmed = lines.takeLast(MAX_BUFFER_LINES / 2)
    file.writeText(trimmed.joinToString("\n", postfix = "\n"))
  }

  companion object {
    private const val BUFFER_FILE_NAME = "monitor_event_buffer.jsonl"
    private const val MAX_BUFFER_LINES = 5_000
  }
}
