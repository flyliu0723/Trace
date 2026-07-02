package com.spendwhere.monitor

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings

object BatteryOptimizationHelper {
  fun isIgnoringBatteryOptimizations(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      return true
    }
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    return powerManager.isIgnoringBatteryOptimizations(context.packageName)
  }

  fun openBatteryOptimizationSettings(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      try {
        val intent =
          Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
            data = Uri.parse("package:${context.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
        context.startActivity(intent)
        return
      } catch (_: Exception) {
        // 部分机型不支持直接申请，跳转列表页
      }
    }

    val fallback =
      Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
    context.startActivity(fallback)
  }

  fun getManufacturerKey(): String {
    return Build.MANUFACTURER.lowercase()
  }

  fun getRomKeepAliveHint(manufacturer: String): String {
    return when {
      manufacturer.contains("xiaomi") || manufacturer.contains("redmi") ->
        "小米/红米：设置 → 应用设置 → 应用管理 → SpendWhere → 省电策略选「无限制」，并开启自启动。"
      manufacturer.contains("huawei") || manufacturer.contains("honor") ->
        "华为/荣耀：设置 → 应用 → 应用启动管理 → SpendWhere → 手动管理，开启全部开关。"
      manufacturer.contains("oppo") || manufacturer.contains("realme") || manufacturer.contains("oneplus") ->
        "OPPO/一加：设置 → 电池 → 更多 → 耗电保护 → SpendWhere → 允许后台运行。"
      manufacturer.contains("vivo") ->
        "vivo：设置 → 电池 → 后台耗电管理 → SpendWhere → 允许后台高耗电。"
      manufacturer.contains("samsung") ->
        "三星：设置 → 应用程序 → SpendWhere → 电池 → 不受限制。"
      else ->
        "请在系统设置中将 SpendWhere 设为「不受电池优化限制」，并允许自启动与后台运行。"
    }
  }
}
