package dev.atman.ccmobile;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
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

    private static final String TAG = "UpdateManager";
    private static final int MAX_REDIRECTS = 5;

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        String version = call.getString("version");

        if (url == null || version == null) {
            call.reject("Missing required parameters: url, version");
            return;
        }

        // Resolve immediately; progress is delivered via events.
        call.resolve(new JSObject().put("started", true));

        new Thread(() -> {
            try {
                File updatesDir = new File(getContext().getExternalFilesDir(null), "updates");
                if (!updatesDir.exists()) {
                    updatesDir.mkdirs();
                }
                File apkFile = new File(updatesDir, "ai-remote-v" + version + ".apk");

                downloadFile(url, apkFile, version);
                launchInstall(apkFile);

                JSObject result = new JSObject();
                result.put("done", true);
                notifyListeners("downloadComplete", result);
            } catch (Exception e) {
                Log.e(TAG, "Update failed", e);
                JSObject error = new JSObject();
                error.put("message", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
                notifyListeners("downloadError", error);
            }
        }).start();
    }

    private void downloadFile(String url, File outFile, String version) throws Exception {
        URL currentUrl = new URL(url);
        int redirects = 0;

        while (redirects < MAX_REDIRECTS) {
            HttpURLConnection conn = (HttpURLConnection) currentUrl.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("User-Agent", "CCMobile/" + version);
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(60000);
            conn.connect();

            int responseCode = conn.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
                responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
                responseCode == HttpURLConnection.HTTP_SEE_OTHER ||
                responseCode == 307 || responseCode == 308) {
                String location = conn.getHeaderField("Location");
                conn.disconnect();
                if (location == null) {
                    throw new RuntimeException("Redirect without Location header");
                }
                currentUrl = new URL(currentUrl, location);
                redirects++;
                continue;
            }

            if (responseCode / 100 != 2) {
                conn.disconnect();
                throw new RuntimeException("HTTP " + responseCode);
            }

            int fileSize = conn.getContentLength();
            try (InputStream in = conn.getInputStream();
                 FileOutputStream out = new FileOutputStream(outFile)) {
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
            }
            conn.disconnect();
            return;
        }

        throw new RuntimeException("Too many redirects");
    }

    private void launchInstall(File apkFile) throws Exception {
        Activity activity = getActivity();
        Uri apkUri;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            apkUri = FileProvider.getUriForFile(
                activity,
                activity.getPackageName() + ".fileprovider",
                apkFile
            );
        } else {
            apkUri = Uri.fromFile(apkFile);
        }

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

        activity.startActivity(intent);
    }
}
