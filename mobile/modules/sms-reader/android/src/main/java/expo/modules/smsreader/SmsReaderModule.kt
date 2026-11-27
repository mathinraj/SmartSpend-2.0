package expo.modules.smsreader

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import android.provider.Telephony
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Reads bank messages from the SMS inbox for SpendTrak's SMS import. Personal messages never leave this module. */
class SmsReaderModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("SmsReader")

    Function("hasPermission") {
      context.checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
    }

    /** Business-sender messages received after `sinceMs`, oldest first, at most `limit`. */
    AsyncFunction("readInbox") { sinceMs: Double, limit: Int ->
      requirePermission()
      val out = mutableListOf<Map<String, Any>>()
      context.contentResolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        arrayOf(Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
        "${Telephony.Sms.DATE} > ?",
        arrayOf(sinceMs.toLong().toString()),
        "${Telephony.Sms.DATE} ASC"
      )?.use { cursor ->
        while (cursor.moveToNext() && out.size < limit) {
          val address = cursor.getString(1) ?: continue
          if (!SmsFilter.isBusinessSender(address)) continue
          out.add(mapOf("id" to cursor.getLong(0).toDouble(), "address" to address, "body" to (cursor.getString(2) ?: ""), "date" to cursor.getLong(3).toDouble()))
        }
      }
      out
    }

    /** One message by inbox ID (for reporting a message whose text SpendTrak didn't keep), if it's a business sender's. */
    AsyncFunction("readMessage") { id: Double ->
      requirePermission()
      context.contentResolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY),
        "${Telephony.Sms._ID} = ?",
        arrayOf(id.toLong().toString()),
        null
      )?.use { cursor ->
        if (cursor.moveToFirst() && SmsFilter.isBusinessSender(cursor.getString(0))) cursor.getString(1) else null
      }
    }

    /** Turns the receiver's notifications on or off; `link` is the deep link a tap opens. */
    Function("configureAlerts") { enabled: Boolean, notify: Boolean, link: String ->
      context.getSharedPreferences(SmsReceiver.PREFS, Context.MODE_PRIVATE).edit()
        .putBoolean(SmsReceiver.KEY_ENABLED, enabled)
        .putBoolean(SmsReceiver.KEY_NOTIFY, notify)
        .putString(SmsReceiver.KEY_LINK, link)
        .apply()
    }

    Function("isIgnoringBatteryOptimizations") {
      (context.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(context.packageName)
    }

    /** Opens a system screen: "app" (App info), "battery", "autostart" or "smsPermission" (Xiaomi). Returns what opened. */
    Function("openSettings") { kind: String ->
      val pkg = context.packageName
      val candidates = when (kind) {
        "battery" -> listOf(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
        "autostart" -> AUTOSTART.map { (p, c) -> Intent().setComponent(ComponentName(p, c)) }
        "smsPermission" -> listOf(
          Intent("miui.intent.action.APP_PERM_EDITOR")
            .setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity")
            .putExtra("extra_pkgname", pkg)
        )
        else -> emptyList()
      }
      for (intent in candidates) {
        if (start(intent)) return@Function kind
      }
      start(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", pkg, null)))
      "app"
    }
  }

  private fun requirePermission() {
    if (context.checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
      throw SecurityException("SMS permission not granted")
    }
  }

  private fun start(intent: Intent): Boolean =
    try {
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    } catch (e: ActivityNotFoundException) {
      false
    } catch (e: SecurityException) {
      false
    }

  companion object {
    /** Phone makers' own "autostart" screens; apps not allowed there can miss SMS while closed. */
    private val AUTOSTART = listOf(
      "com.miui.securitycenter" to "com.miui.permcenter.autostart.AutoStartManagementActivity",
      "com.coloros.safecenter" to "com.coloros.safecenter.permission.startup.StartupAppListActivity",
      "com.coloros.safecenter" to "com.coloros.safecenter.startupapp.StartupAppListActivity",
      "com.oppo.safe" to "com.oppo.safe.permission.startup.StartupAppListActivity",
      "com.vivo.permissionmanager" to "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
      "com.iqoo.secure" to "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity",
      "com.huawei.systemmanager" to "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
      "com.huawei.systemmanager" to "com.huawei.systemmanager.optimize.process.ProtectActivity",
      "com.oneplus.security" to "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity",
      "com.samsung.android.lool" to "com.samsung.android.sm.battery.ui.BatteryActivity",
      "com.asus.mobilemanager" to "com.asus.mobilemanager.entry.FunctionActivity",
    )
  }
}
