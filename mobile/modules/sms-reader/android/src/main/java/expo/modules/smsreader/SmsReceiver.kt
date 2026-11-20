package expo.modules.smsreader

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.provider.Telephony

/**
 * Posts "₹450.00 debited · HDFCBK" when a bank SMS arrives, even with the app closed. It stores nothing:
 * tapping the notification opens the app, which scans the inbox and parses the message itself.
 * Message text is never logged.
 */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (!prefs.getBoolean(KEY_ENABLED, false) || !prefs.getBoolean(KEY_NOTIFY, true)) return
    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
    // Long messages arrive in parts; join them per sender before checking.
    for ((address, parts) in messages.filterNotNull().groupBy { it.displayOriginatingAddress ?: "" }) {
      if (!SmsFilter.isBusinessSender(address)) continue
      val body = parts.joinToString("") { it.displayMessageBody ?: "" }
      val alert = SmsFilter.alertFor(body) ?: continue
      notify(context, prefs.getString(KEY_LINK, null), SmsFilter.senderLabel(address), alert, (address + body).hashCode())
    }
  }

  private fun notify(context: Context, link: String?, sender: String, alert: SmsFilter.Alert, id: Int) {
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 33 &&
      context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) return
    if (!manager.areNotificationsEnabled()) return
    if (Build.VERSION.SDK_INT >= 26 && manager.getNotificationChannel(CHANNEL_ID) == null) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "Bank messages", NotificationManager.IMPORTANCE_DEFAULT).apply {
          description = "When a bank SMS arrives, so you can add it to SpendTrak"
        }
      )
    }

    val open = (if (link != null) Intent(Intent.ACTION_VIEW, Uri.parse(link)).setPackage(context.packageName)
      else context.packageManager.getLaunchIntentForPackage(context.packageName))
      ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP) ?: return
    val tap = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val icon = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
      .takeIf { it != 0 } ?: context.applicationInfo.icon

    fun builder(): Notification.Builder =
      if (Build.VERSION.SDK_INT >= 26) Notification.Builder(context, CHANNEL_ID) else @Suppress("DEPRECATION") Notification.Builder(context)

    val public = builder()
      .setSmallIcon(icon)
      .setContentTitle("New bank transaction")
      .setContentText("Tap to review in SpendTrak")
      .build()
    val notification = builder()
      .setSmallIcon(icon)
      .setColor(Color.parseColor("#6C5CE7"))
      .setContentTitle("₹${alert.amount} ${alert.verb}")
      .setContentText("$sender · Tap to review in SpendTrak")
      .setAutoCancel(true)
      .setContentIntent(tap)
      .setVisibility(Notification.VISIBILITY_PRIVATE)
      .setPublicVersion(public)
      .build()
    manager.notify(TAG, id, notification)
  }

  companion object {
    const val PREFS = "spendtrak_sms"
    const val KEY_ENABLED = "enabled"
    const val KEY_NOTIFY = "notify"
    const val KEY_LINK = "link"
    const val CHANNEL_ID = "bank-messages"
    const val TAG = "spendtrak-sms"
  }
}
