package dev.atman.ccmobile;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ForegroundService")
public class ForegroundServicePlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        String projectName = call.getString("projectName", "CC Mobile");
        Context context = getContext();
        NotificationForegroundService.start(context, projectName);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Context context = getContext();
        NotificationForegroundService.stop(context);
        call.resolve();
    }
}
