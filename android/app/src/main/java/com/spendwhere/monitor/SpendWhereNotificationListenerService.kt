package com.spendwhere.monitor

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * 通知监听服务：用于获取 MediaSession 访问权限。
 * 不读取通知内容，仅作为系统授权入口。
 */
class SpendWhereNotificationListenerService : NotificationListenerService() {
  override fun onListenerConnected() {
    super.onListenerConnected()
    MediaSessionWatcher.onNotificationListenerConnected(applicationContext)
  }

  override fun onListenerDisconnected() {
    MediaSessionWatcher.onNotificationListenerDisconnected()
    super.onListenerDisconnected()
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    // 不处理通知内容
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification?) {
    // 不处理通知内容
  }
}
