package dev.atman.ccmobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

public class NotificationForegroundService extends Service {

    private static final String CHANNEL_ID = "cc_connection";
    private static final int NOTIFICATION_ID = 1001;
    private static final String EXTRA_PROJECT_NAME = "project_name";

    private static String sProjectName = null;

    /**
     * Start the foreground service with the given project name.
     * Called from JavaScript via Capacitor bridge.
     */
    public static void start(Context context, String projectName) {
        sProjectName = projectName;
        Intent intent = new Intent(context, NotificationForegroundService.class);
        intent.putExtra(EXTRA_PROJECT_NAME, projectName);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }
    }

    /**
     * Stop the foreground service.
     * Called from JavaScript via Capacitor bridge.
     */
    public static void stop(Context context) {
        sProjectName = null;
        Intent intent = new Intent(context, NotificationForegroundService.class);
        context.stopService(intent);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.hasExtra(EXTRA_PROJECT_NAME)) {
            sProjectName = intent.getStringExtra(EXTRA_PROJECT_NAME);
        }

        String name = sProjectName != null ? sProjectName : "CC Mobile";
        String title = "CC Mobile 已连接";
        String content = name;

        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new Notification.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(getSmallIconResId())
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build();

        startForeground(NOTIFICATION_ID, notification);

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopForeground(true);
        sProjectName = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "CC Mobile 连接",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("显示当前连接的会话状态");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private int getSmallIconResId() {
        // Use the drawable resource name without extension
        return getResources().getIdentifier(
            "ic_stat_notify", "drawable", getPackageName()
        );
    }
}
