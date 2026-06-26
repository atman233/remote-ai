package dev.atman.ccmobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONObject;

public class ForegroundService extends Service {
    private static final String CHANNEL_CONNECTION = "ccmobile_connection";
    private static final String CHANNEL_TASKS = "claude-tasks";
    private static final int CONNECTION_NOTIFY_ID = 1001;
    private static final String PREFS_NAME = "ccmobile_service";

    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_DAEMON_URL = "daemonUrl";
    public static final String EXTRA_TOKEN = "token";
    public static final String EXTRA_PROJECT = "projectName";
    public static final String EXTRA_POLL_INTERVAL = "pollInterval";

    private String currentTitle = "Claude 已连接";
    private String daemonUrl = "";
    private String token = "";
    private String projectName = "";
    private int pollIntervalSec = 10;

    private ScheduledExecutorService scheduler;
    private long lastNotifId = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel(CHANNEL_CONNECTION, "连接状态",
            "显示 Claude 连接状态", NotificationManager.IMPORTANCE_LOW, false);
        createNotificationChannel(CHANNEL_TASKS, "任务通知",
            "Claude 任务完成或需要确认时通知", NotificationManager.IMPORTANCE_HIGH, true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.hasExtra(EXTRA_DAEMON_URL)) {
            daemonUrl = intent.getStringExtra(EXTRA_DAEMON_URL);
            token = intent.getStringExtra(EXTRA_TOKEN);
            projectName = intent.getStringExtra(EXTRA_PROJECT);
            currentTitle = intent.getStringExtra(EXTRA_TITLE);
            pollIntervalSec = intent.getIntExtra(EXTRA_POLL_INTERVAL, 10);
            if (pollIntervalSec < 5) pollIntervalSec = 5;
            saveConfig();
        } else if (daemonUrl.isEmpty()) {
            restoreConfig();
        }

        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_CONNECTION)
            .setContentTitle("CC Mobile")
            .setContentText(currentTitle)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();

        startForeground(CONNECTION_NOTIFY_ID, notification);
        startPolling();
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopPolling();
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Don't stop — keep polling when app is swiped away
    }

    // ---- Persistence ----

    private void saveConfig() {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit()
            .putString("daemonUrl", daemonUrl)
            .putString("token", token)
            .putString("projectName", projectName)
            .putInt("pollInterval", pollIntervalSec)
            .putString("title", currentTitle)
            .putLong("lastNotifId", lastNotifId)
            .apply();
    }

    private void restoreConfig() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        daemonUrl = prefs.getString("daemonUrl", "");
        token = prefs.getString("token", "");
        projectName = prefs.getString("projectName", "");
        pollIntervalSec = prefs.getInt("pollInterval", 10);
        currentTitle = prefs.getString("title", "Claude 已连接");
        lastNotifId = prefs.getLong("lastNotifId", 0);
    }

    // ---- Polling ----

    private void startPolling() {
        stopPolling();
        if (daemonUrl.isEmpty() || projectName.isEmpty()) return;

        scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleWithFixedDelay(this::pollNotifications,
            0, pollIntervalSec, TimeUnit.SECONDS);
    }

    private void stopPolling() {
        if (scheduler != null) {
            scheduler.shutdown();
            scheduler = null;
        }
    }

    private void pollNotifications() {
        // Save lastNotifId periodically so restarts don't miss notifications
        saveLastNotifId();
        try {
            String encodedProject = URLEncoder.encode(projectName, "UTF-8");
            URL url = new URL(daemonUrl + "/api/projects/" + encodedProject
                + "/notifications?since=" + lastNotifId);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);

            if (conn.getResponseCode() != 200) {
                conn.disconnect();
                return;
            }

            InputStream is = conn.getInputStream();
            java.util.Scanner s = new java.util.Scanner(is, "UTF-8").useDelimiter("\\A");
            String body = s.hasNext() ? s.next() : "";
            s.close();
            conn.disconnect();

            JSONObject json = new JSONObject(body);
            JSONArray items = json.getJSONArray("notifications");
            long latestId = json.optLong("latestId", lastNotifId);
            long serverCounter = json.optLong("serverCounter", -1);

            if (serverCounter >= 0 && serverCounter < lastNotifId) {
                lastNotifId = 0;
            }

            for (int i = 0; i < items.length(); i++) {
                JSONObject item = items.getJSONObject(i);
                String event = item.optString("event", "stop");
                showTaskNotification(event);
            }

            if (latestId > lastNotifId) {
                lastNotifId = latestId;
                saveLastNotifId();
            }
        } catch (Exception e) {
            // Retry on next poll
        }
    }

    private void saveLastNotifId() {
        getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .edit().putLong("lastNotifId", lastNotifId).apply();
    }

    // ---- Task Notification ----

    private void showTaskNotification(String event) {
        NotificationManager manager = getSystemService(NotificationManager.class);

        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("fromNotification", true);
        intent.putExtra("projectName", projectName);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, (int) System.currentTimeMillis(),
            intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String body = projectName.isEmpty() ? "点击查看" : "项目: " + projectName;
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_TASKS)
            .setContentTitle("Claude 完成回复")
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build();

        manager.notify((int) System.currentTimeMillis(), notification);
    }

    // ---- Helpers ----

    private void createNotificationChannel(String id, String name,
            String desc, int importance, boolean showBadge) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(id, name, importance);
            channel.setDescription(desc);
            channel.setShowBadge(showBadge);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
