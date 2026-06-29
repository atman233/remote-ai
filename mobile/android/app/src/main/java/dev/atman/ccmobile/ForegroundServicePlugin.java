package dev.atman.ccmobile;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ForegroundService")
public class ForegroundServicePlugin extends Plugin {

    private static final int NOTIFICATION_PERMISSION_REQUEST = 9001;

    @PluginMethod
    public void start(PluginCall call) {
        String title = call.getString("title", "Claude 已连接");
        String daemonUrl = call.getString("daemonUrl", "");
        String token = call.getString("token", "");
        String projectName = call.getString("projectName", "");
        int pollInterval = call.getInt("pollInterval", 10);

        // Android 13+ requires runtime POST_NOTIFICATIONS permission
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    getActivity(),
                    new String[] { Manifest.permission.POST_NOTIFICATIONS },
                    NOTIFICATION_PERMISSION_REQUEST
                );
            }
        }

        Intent serviceIntent = new Intent(getContext(), ForegroundService.class);
        serviceIntent.putExtra(ForegroundService.EXTRA_TITLE, title);
        serviceIntent.putExtra(ForegroundService.EXTRA_DAEMON_URL, daemonUrl);
        serviceIntent.putExtra(ForegroundService.EXTRA_TOKEN, token);
        serviceIntent.putExtra(ForegroundService.EXTRA_PROJECT, projectName);
        serviceIntent.putExtra(ForegroundService.EXTRA_POLL_INTERVAL, pollInterval);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(serviceIntent);
        } else {
            getContext().startService(serviceIntent);
        }

        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent serviceIntent = new Intent(getContext(), ForegroundService.class);
        getContext().stopService(serviceIntent);
        call.resolve();
    }
}
