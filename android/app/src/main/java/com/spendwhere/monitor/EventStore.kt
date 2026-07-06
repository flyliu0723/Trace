package com.spendwhere.monitor

import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import org.json.JSONObject

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

  fun toJson(): JSONObject {
    val json = JSONObject()
    json.put("type", type)
    json.put("timestamp", timestamp)
    packageName?.let { json.put("packageName", it) }
    appLabel?.let { json.put("appLabel", it) }
    json.put("source", source)
    metadata?.takeIf { it.isNotEmpty() }?.let { meta ->
      val metaJson = JSONObject()
      meta.forEach { (key, value) -> metaJson.put(key, value) }
      json.put("metadata", metaJson)
    }
    return json
  }

  companion object {
    fun fromJson(json: JSONObject): MonitorEvent {
      val metadataJson = json.optJSONObject("metadata")
      val metadata =
        metadataJson?.let { meta ->
          buildMap {
            val keys = meta.keys()
            while (keys.hasNext()) {
              val key = keys.next()
              put(key, meta.optString(key))
            }
          }
        }

      return MonitorEvent(
        type = json.getString("type"),
        timestamp = json.getLong("timestamp"),
        packageName = json.optString("packageName").takeIf { it.isNotBlank() },
        appLabel = json.optString("appLabel").takeIf { it.isNotBlank() },
        metadata = metadata,
        source = json.optString("source", "native"),
      )
    }
  }
}

object EventStore {
  private val events = mutableListOf<MonitorEvent>()
  private val lock = Any()
  @Volatile
  private var persistence: EventStorePersistence? = null

  fun init(context: Context) {
    if (persistence != null) {
      return
    }
    synchronized(lock) {
      if (persistence != null) {
        return
      }
      val store = EventStorePersistence(context.applicationContext)
      persistence = store
      events.addAll(store.loadAll())
    }
  }

  fun addEvent(event: MonitorEvent) {
    synchronized(lock) {
      events.add(event)
      persistence?.append(event)
    }
  }

  fun drainEvents(): List<MonitorEvent> {
    synchronized(lock) {
      val copy = events.toList()
      events.clear()
      persistence?.clear()
      return copy
    }
  }

  fun peekCount(): Int {
    synchronized(lock) {
      return events.size
    }
  }

  fun persistedCount(): Int {
    return persistence?.persistedCount() ?: 0
  }
}
