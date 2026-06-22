package dev.atman.ccmobile;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpdateManagerPlugin.class);
        registerPlugin(ForegroundServicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
