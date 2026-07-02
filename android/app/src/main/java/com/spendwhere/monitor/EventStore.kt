package com.spendwhere.monitor

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

data class MonitorEvent(
  val type: String,
  val timestamp: Long,
  val packageName: String? = null,
  val appLabel: String? = null,
  val metadata: Map<String, String>? = null,
  val source: String = "native",
) {
  fun toWritableMap(): WritableMap {
    val map = Arguments.createMap()
    map.putString("type", type)
    map.putDouble("timestamp", timestamp.toDouble())
    packageName?.let { map.putString("packageName", it) }
    appLabel?.let { map.putString("appLabel", it) }
    map.putString("source", source)
    metadata?.takeIf { it.isNotEmpty() }?.let { meta ->
      val metaMap = Arguments.createMap()
      meta.forEach { (key, value) -> metaMap.putString(key, value) }
      map.putMap("metadata", metaMap)
    }
    return map
  }
}

object EventStore {
  private val events = mutableListOf<MonitorEvent>()
  private val lock = Any()

  fun addEvent(event: MonitorEvent) {
    synchronized(lock) {
      events.add(event)
    }
  }

  fun drainEvents(): List<MonitorEvent> {
    synchronized(lock) {
      val copy = events.toList()
      events.clear()
      return copy
    }
  }

  fun peekCount(): Int {
    synchronized(lock) {
      return events.size
    }
  }
}
