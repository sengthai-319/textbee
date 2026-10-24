package com.vernu.sms.helpers

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.vernu.sms.AppConstants
import com.vernu.sms.BuildConfig
import com.vernu.sms.R

// One notification per newer release, only when the server has switched
// it on. Tapping opens the download page with the installed version.
object UpdateNotifier {
    private const val CHANNEL_ID = "app_updates"
    private const val NOTIFICATION_ID = 7392

    fun shouldNotify(enabled: Boolean, latestCode: Int, installedCode: Int, lastNotifiedCode: Int): Boolean =
        enabled && latestCode > installedCode && latestCode != lastNotifiedCode

    fun downloadUrl(): String {
        val versionInfo = "${BuildConfig.VERSION_NAME}(${BuildConfig.VERSION_CODE})"
        return "https://github.com/sengthai-319/textbee/blob/main/docs/SETUP.md#android-phones"
    }

    fun maybeNotify(context: Context) {
        val latest = DeviceConfig.latestVersionCode(context)
        val lastNotified = SharedPreferenceHelper.getSharedPreferenceInt(
            context, AppConstants.SHARED_PREFS_LAST_UPDATE_NOTIFIED_VERSION_CODE_KEY, 0
        )
        if (!shouldNotify(DeviceConfig.updateNotificationsEnabled(context), latest, BuildConfig.VERSION_CODE, lastNotified)) return
        if (!DeviceHealth.evaluate(context).hasPostNotificationsPermission) return

        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "App updates", NotificationManager.IMPORTANCE_LOW)
            )
        }
        // A blocked channel shows nothing; do not record the release as notified
        val blocked = !NotificationManagerCompat.from(context).areNotificationsEnabled() ||
            (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
                manager.getNotificationChannel(CHANNEL_ID)?.importance == NotificationManager.IMPORTANCE_NONE)
        if (blocked) return

        val open = PendingIntent.getActivity(
            context, 0, Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl())),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val versionName = DeviceConfig.latestVersionName(context) ?: "a newer version"
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("CrossHubSMS $versionName is available")
            .setContentText("This update improves message sending in the background. Tap to download.")
            .setContentIntent(open)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
        manager.notify(NOTIFICATION_ID, notification)
        SharedPreferenceHelper.setSharedPreferenceInt(
            context, AppConstants.SHARED_PREFS_LAST_UPDATE_NOTIFIED_VERSION_CODE_KEY, latest
        )
        DeviceLog.log(context, "update_notified", "version $versionName ($latest)")
    }
}
