package com.spendwhere.monitor

import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.util.Base64
import android.util.LruCache
import java.io.ByteArrayOutputStream

/**
 * 统一解析应用显示名与图标，带内存缓存。
 */
object AppInfoResolver {
  private const val ICON_SIZE_PX = 128
  private val labelCache = mutableMapOf<String, String>()
  private val iconCache = LruCache<String, String>(120)

  fun resolveAppLabel(context: Context, packageName: String): String {
    labelCache[packageName]?.let { return it }

    return try {
      val appInfo = context.packageManager.getApplicationInfo(packageName, 0)
      val label = context.packageManager.getApplicationLabel(appInfo).toString()
      labelCache[packageName] = label
      label
    } catch (_: PackageManager.NameNotFoundException) {
      packageName
    } catch (_: Exception) {
      packageName
    }
  }

  fun getAppIconBase64(context: Context, packageName: String): String? {
    iconCache.get(packageName)?.let { return it }

    return try {
      val appInfo = context.packageManager.getApplicationInfo(packageName, 0)
      val drawable = context.packageManager.getApplicationIcon(appInfo)
      val bitmap = drawableToBitmap(drawable, ICON_SIZE_PX)
      val stream = ByteArrayOutputStream()
      bitmap.compress(Bitmap.CompressFormat.PNG, 90, stream)
      val base64 = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
      val dataUri = "data:image/png;base64,$base64"
      iconCache.put(packageName, dataUri)
      dataUri
    } catch (_: Exception) {
      null
    }
  }

  private fun drawableToBitmap(drawable: Drawable, size: Int): Bitmap {
    if (drawable is BitmapDrawable) {
      val source = drawable.bitmap
      if (source != null) {
        return Bitmap.createScaledBitmap(source, size, size, true)
      }
    }

    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, size, size)
    drawable.draw(canvas)
    return bitmap
  }
}
