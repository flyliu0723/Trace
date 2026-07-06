package com.spendwhere

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(com.spendwhere.monitor.BehaviorMonitorPackage())
          add(com.spendwhere.share.ReceiptSharePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    com.spendwhere.monitor.EventStore.init(applicationContext)
    loadReactNative(this)
  }
}
