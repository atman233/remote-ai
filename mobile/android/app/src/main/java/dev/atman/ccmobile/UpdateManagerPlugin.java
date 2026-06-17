package dev.atman.ccmobile;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "UpdateManager")
public class UpdateManagerPlugin extends Plugin {

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        String version = call.getString("version");

        if (url == null || version == null) {
            call.reject("Missing required parameters: url, version");
            return;
        }

        getActivity().runOnUiThread(() -> {
            call.resolve(new JSObject().put("started", true));
        });

        new Thread(() -> {
            try {
                File updatesDir = new File(getContext().getExternalFilesDir(null), "updates");
                if (!updatesDir.exists()) {
                    updatesDir.mkdirs();
                }
                File apkFile = new File(updatesDir, "ai-remote-v" + version + ".apk");

                URL downloadUrl = new URL(url);
                HttpURLConnection conn = (HttpURLConnection) downloadUrl.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("User-Agent", "CCMobile/" + version);
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(60000);
                conn.connect();

                int responseCode = conn.getResponseCode();
                if (responseCode / 100 != 2) {
                    throw new RuntimeException("HTTP " + responseCode);
                }

                int fileSize = conn.getContentLength();
                InputStream in = conn.getInputStream();
                FileOutputStream out = new FileOutputStream(apkFile);

                byte[] buffer = new byte[8192];
                long totalRead = 0;
                int bytesRead;
                int lastReportedPercent = -1;

                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                    totalRead += bytesRead;

                    if (fileSize > 0) {
                        int percent = (int) ((totalRead * 100) / fileSize);
                        if (percent != lastReportedPercent) {
                            lastReportedPercent = percent;
                            JSObject progress = new JSObject();
                            progress.put("percent", percent);
                            notifyListeners("downloadProgress", progress);
                        }
                    }
                }

                out.close();
                in.close();
                conn.disconnect();

                // Launch install intent
                Uri apkUri;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    apkUri = FileProvider.getUriForFile(
                        getContext(),
                        getContext().getPackageName() + ".fileprovider",
                        apkFile
                    );
                } else {
                    apkUri = Uri.fromFile(apkFile);
                }

                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                getContext().startActivity(intent);

                JSObject result = new JSObject();
                result.put("done", true);
                notifyListeners("downloadComplete", result);

            } catch (Exception e) {
                JSObject error = new JSObject();
                error.put("message", e.getMessage());
                notifyListeners("downloadError", error);
            }
        }).start();
    }
}
