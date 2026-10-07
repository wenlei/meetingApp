package org.jitsi.meet.sdk;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.content.FileProvider;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Arrays;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicBoolean;

/** Downloads only our signed updates into private storage before handing off to Android. */
class AppUpdateModule extends ReactContextBaseJavaModule {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicBoolean busy = new AtomicBoolean();
    private volatile boolean cancelled;
    private volatile HttpURLConnection connection;
    private volatile File verifiedFile;
    private volatile String verifiedHash;
    private volatile long verifiedSize;
    private volatile long verifiedVersion;
    private volatile String verifiedVersionName;

    AppUpdateModule(ReactApplicationContext context) { super(context); }

    @Override public String getName() { return "AppUpdate"; }
    @Override public java.util.Map<String, Object> getConstants() {
        java.util.Map<String, Object> values = new java.util.HashMap<>();
        values.put("supportsArm64", Arrays.asList(android.os.Build.SUPPORTED_ABIS).contains("arm64-v8a"));
        return values;
    }
    @ReactMethod public void addListener(String name) { }
    @ReactMethod public void removeListeners(double count) { }

    private void progress(String phase, long received, long total, int attempt) {
        if (!getReactApplicationContext().hasActiveReactInstance()) { return; }
        WritableMap event = Arguments.createMap();
        event.putString("phase", phase);
        event.putDouble("received", received);
        event.putDouble("total", total);
        event.putInt("attempt", attempt);
        getReactApplicationContext().getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("AppUpdateProgress", event);
    }

    @ReactMethod public void download(ReadableMap manifest, Promise promise) {
        if (!busy.compareAndSet(false, true)) {
            promise.reject("update_busy", "An update is already running");
            return;
        }
        cancelled = false;
        verifiedFile = null;
        worker.execute(() -> {
            File partial = new File(getReactApplicationContext().getCacheDir(), "updates/download.part");
            try {
                URL url = new URL(manifest.getString("url"));
                long size = (long) manifest.getDouble("size");
                long version = (long) manifest.getDouble("versionCode");
                String versionName = manifest.getString("version");
                String hash = manifest.getString("sha256");
                if (!"https".equals(url.getProtocol()) || !"113.46.187.140".equals(url.getHost())
                    || url.getPort() != 18001 || !url.getPath().startsWith("/android/")
                    || url.getUserInfo() != null || hash == null || !hash.matches("[a-fA-F0-9]{64}")
                    || size < 1 || size > 300_000_000L || version <= installedVersion()) {
                    throw new SecurityException("update_manifest_invalid");
                }
                File directory = partial.getParentFile();
                if (!directory.isDirectory() && !directory.mkdirs()) { throw new IOException("storage_unavailable"); }
                UpdateArtifacts.pruneInstalled(directory, installedVersion());
                File ready = UpdateArtifacts.readyFile(directory, version, hash);
                for (int attempt = 1; attempt <= 3; attempt++) {
                    try {
                        if (cancelled) { throw new IOException("update_cancelled"); }
                        progress("downloading", 0, size, attempt);
                        connection = (HttpURLConnection) url.openConnection();
                        connection.setInstanceFollowRedirects(false);
                        connection.setConnectTimeout(15000);
                        connection.setReadTimeout(25000);
                        connection.setUseCaches(false);
                        connection.setRequestProperty("Accept-Encoding", "identity");
                        if (connection.getResponseCode() != 200) { throw new IOException("download_http_error"); }
                        long length = connection.getContentLengthLong();
                        if (length != -1 && length != size) { throw new IOException("download_size_mismatch"); }
                        long received = 0, lastProgress = 0;
                        try (InputStream input = connection.getInputStream();
                             FileOutputStream output = new FileOutputStream(partial, false)) {
                            byte[] buffer = new byte[65536];
                            int count;
                            while ((count = input.read(buffer)) != -1) {
                                if (cancelled) { throw new IOException("update_cancelled"); }
                                received += count;
                                if (received > size) { throw new IOException("download_size_mismatch"); }
                                output.write(buffer, 0, count);
                                long now = android.os.SystemClock.elapsedRealtime();
                                if (now - lastProgress > 250) {
                                    progress("downloading", received, size, attempt);
                                    lastProgress = now;
                                }
                            }
                            output.getFD().sync();
                        }
                        if (cancelled) { throw new IOException("update_cancelled"); }
                        progress("verifying", received, size, attempt);
                        verifyFile(partial, size, hash, version, versionName);
                        if (cancelled) { throw new IOException("update_cancelled"); }
                        UpdateArtifacts.promote(partial, ready, size, hash);
                        verifiedSize = size;
                        verifiedHash = hash;
                        verifiedVersion = version;
                        verifiedVersionName = versionName;
                        verifiedFile = ready;
                        progress("ready", size, size, attempt);
                        promise.resolve(null);
                        return;
                    } catch (IOException error) {
                        partial.delete();
                        if (cancelled || attempt == 3) { throw error; }
                        progress("retrying", 0, size, attempt + 1);
                        Thread.sleep(1000L * attempt);
                    } finally {
                        if (connection != null) { connection.disconnect(); connection = null; }
                    }
                }
            } catch (Exception error) {
                partial.delete();
                promise.reject(cancelled ? "update_cancelled" : "update_failed", error.getMessage(), error);
            } finally {
                busy.set(false);
            }
        });
    }

    private long installedVersion() throws PackageManager.NameNotFoundException {
        return getReactApplicationContext().getPackageManager()
            .getPackageInfo(getReactApplicationContext().getPackageName(), 0).versionCode;
    }

    @SuppressWarnings("deprecation")
    private void verifyFile(File file, long size, String hash, long version, String versionName) throws Exception {
        UpdateIntegrity.verify(file, size, hash);
        PackageManager manager = getReactApplicationContext().getPackageManager();
        PackageInfo archive = manager.getPackageArchiveInfo(file.getAbsolutePath(), PackageManager.GET_SIGNATURES);
        PackageInfo installed = manager.getPackageInfo(getReactApplicationContext().getPackageName(), PackageManager.GET_SIGNATURES);
        if (archive == null || !installed.packageName.equals(archive.packageName)
            || archive.versionCode != version || archive.versionCode <= installed.versionCode
            || versionName == null || !versionName.equals(archive.versionName)
            || archive.signatures == null || !Arrays.equals(installed.signatures, archive.signatures)) {
            throw new SecurityException("update_identity_mismatch");
        }
    }

    @ReactMethod public void cancel() {
        cancelled = true;
        HttpURLConnection active = connection;
        if (active != null) { active.disconnect(); }
    }

    @ReactMethod public void install(Promise promise) {
        worker.execute(() -> {
            try {
                File ready = verifiedFile;
                if (ready == null) { throw new IOException("update_not_verified"); }
                verifyFile(ready, verifiedSize, verifiedHash, verifiedVersion, verifiedVersionName);
                getReactApplicationContext().runOnUiQueueThread(() -> {
                    try {
                        ReactApplicationContext context = getReactApplicationContext();
                        if (!context.getPackageManager().canRequestPackageInstalls()) {
                            context.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                Uri.parse("package:" + context.getPackageName())).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                            promise.resolve("permission");
                            return;
                        }
                        Uri uri = FileProvider.getUriForFile(context, context.getPackageName() + ".updates", ready);
                        Intent intent = new Intent(Intent.ACTION_VIEW)
                            .setDataAndType(uri, "application/vnd.android.package-archive")
                            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                        promise.resolve("installer");
                    } catch (Exception error) { promise.reject("install_failed", error); }
                });
            } catch (Exception error) { promise.reject("install_failed", error); }
        });
    }
}
