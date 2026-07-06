package com.spendwhere.share

import android.content.Intent
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class ReceiptShareModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ReceiptShare"

  @ReactMethod
  fun shareImage(filePath: String, title: String, promise: Promise) {
    try {
      val activity = reactApplicationContext.currentActivity
      val context = activity ?: reactApplicationContext
      val normalizedPath = filePath.removePrefix("file://")
      val file = File(normalizedPath)
      if (!file.exists()) {
        promise.reject("FILE_NOT_FOUND", "截图文件不存在: $normalizedPath")
        return
      }

      val authority = "${reactContext.packageName}.fileprovider"
      val contentUri = FileProvider.getUriForFile(reactContext, authority, file)
      val intent = Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, contentUri)
        putExtra(Intent.EXTRA_SUBJECT, title)
        putExtra(Intent.EXTRA_TITLE, title)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }

      val chooser = Intent.createChooser(intent, title).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(chooser)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("SHARE_FAILED", error.message, error)
    }
  }
}
