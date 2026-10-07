package com.guangyuxinneng.meeting.updatetest;

import android.app.Instrumentation;
import android.os.Bundle;
import android.content.Context;
import java.lang.reflect.Constructor;
import java.lang.reflect.Proxy;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/** Integration harness for the release APK's real native downloader, without test hooks in the app. */
public class UpdateFlowInstrumentation extends Instrumentation {
    private Bundle arguments;
    @Override public void onCreate(Bundle args) { arguments = args; start(); }

    @Override public void onStart() {
        Bundle result = new Bundle();
        try {
            Context context = getTargetContext();
            ClassLoader loader = context.getClassLoader();
            Class<?> moduleType = loader.loadClass("org.jitsi.meet.sdk.AppUpdateModule");
            startActivitySync(new android.content.Intent().setClassName(context.getPackageName(), "org.jitsi.meet.MainActivity")
                .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK));
            Class<?> holder = loader.loadClass("org.jitsi.meet.sdk.ReactHostHolder");
            java.lang.reflect.Method getHost = holder.getDeclaredMethod("getReactHost");
            getHost.setAccessible(true);
            Object module = null;
            for (int attempt = 0; attempt < 100 && module == null; attempt++) {
                Object host = getHost.invoke(null);
                if (host != null) {
                    java.lang.reflect.Method getContext = host.getClass().getMethod("getCurrentReactContext");
                    getContext.setAccessible(true);
                    Object react = getContext.invoke(host);
                    if (react != null) {
                        java.lang.reflect.Method getModule = react.getClass().getMethod("getNativeModule", String.class);
                        getModule.setAccessible(true);
                        module = getModule.invoke(react, "AppUpdate");
                    }
                }
                if (module == null) { Thread.sleep(200); }
            }
            if (module == null) { throw new Exception("Native update module was not registered"); }
            Class<?> readableMap = loader.loadClass("com.facebook.react.bridge.ReadableMap");
            Class<?> promiseType = loader.loadClass("com.facebook.react.bridge.Promise");
            Object manifest = Proxy.newProxyInstance(loader, new Class<?>[]{readableMap}, (proxy, method, values) -> {
                String key = (String) values[0];
                if (method.getName().equals("getDouble")) { return Double.valueOf(arguments.getString(key)); }
                return arguments.getString(key);
            });
            CountDownLatch downloaded = new CountDownLatch(1);
            String[] downloadError = new String[1];
            Object downloadPromise = Proxy.newProxyInstance(loader, new Class<?>[]{promiseType}, (proxy, method, values) -> {
                if (method.getName().equals("reject")) { downloadError[0] = java.util.Arrays.toString(values); }
                downloaded.countDown();
                return null;
            });
            java.lang.reflect.Method download = moduleType.getMethod("download", readableMap, promiseType);
            download.setAccessible(true);
            if ("true".equals(arguments.getString("reuseDownload"))) {
                // Preserve the verified network download across a test-runner restart.
                // install() below independently verifies these bytes and their package identity again.
                String fileName = "update-" + arguments.getString("versionCode") + "-"
                    + arguments.getString("sha256").toLowerCase(java.util.Locale.ROOT) + ".apk";
                java.io.File cached = new java.io.File(context.getCacheDir(), "updates/" + fileName);
                if (!cached.exists()) {
                    // Migration tests can still target the legacy updater.
                    cached = new java.io.File(context.getCacheDir(), "updates/update.apk");
                }
                Object[][] restored = {
                    {"verifiedFile", cached},
                    {"verifiedSize", Long.valueOf(arguments.getString("size"))},
                    {"verifiedHash", arguments.getString("sha256")},
                    {"verifiedVersion", Long.valueOf(arguments.getString("versionCode"))}
                };
                for (Object[] field : restored) {
                    java.lang.reflect.Field value = moduleType.getDeclaredField((String) field[0]);
                    value.setAccessible(true);
                    value.set(module, field[1]);
                }
                try {
                    java.lang.reflect.Field versionName = moduleType.getDeclaredField("verifiedVersionName");
                    versionName.setAccessible(true);
                    versionName.set(module, arguments.getString("version"));
                } catch (NoSuchFieldException olderApp) { /* 1.0.7 has no version-name field. */ }
                result.putString("download", "Previously verified HTTPS download reused; install() revalidates it");
            } else {
                download.invoke(module, manifest, downloadPromise);
                if (!downloaded.await(5, TimeUnit.MINUTES)) { throw new Exception("Download timed out"); }
                if (downloadError[0] != null) { throw new Exception(downloadError[0]); }
                result.putString("download", "PASS: HTTPS download and size/hash/package/signer/version verification");
            }
            if ("true".equals(arguments.getString("versionedHandoff"))) {
                // Explicit legacy migration test only; production install() still revalidates all bytes.
                java.lang.reflect.Field fileField = moduleType.getDeclaredField("verifiedFile");
                fileField.setAccessible(true);
                java.io.File legacy = (java.io.File) fileField.get(module);
                java.io.File unique = new java.io.File(legacy.getParentFile(), "update-"
                    + arguments.getString("versionCode") + "-"
                    + arguments.getString("sha256").toLowerCase(java.util.Locale.ROOT) + ".apk");
                if (!legacy.equals(unique)) {
                    java.nio.file.Files.copy(legacy.toPath(), unique.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                    fileField.set(module, unique);
                }
                result.putString("legacyMigration", "Versioned handoff of the same verified download; not stock legacy behavior");
            }
            CountDownLatch installed = new CountDownLatch(1);
            String[] installResult = new String[1];
            Object installPromise = Proxy.newProxyInstance(loader, new Class<?>[]{promiseType}, (proxy, method, values) -> {
                installResult[0] = method.getName().equals("resolve") ? String.valueOf(values[0]) : java.util.Arrays.toString(values);
                installed.countDown();
                return null;
            });
            java.lang.reflect.Method install = moduleType.getMethod("install", promiseType);
            install.setAccessible(true);
            install.invoke(module, installPromise);
            if (!installed.await(30, TimeUnit.SECONDS)) { throw new Exception("Installer hand-off timed out"); }
            result.putString("install", installResult[0]);
            if (!"installer".equals(installResult[0])) { throw new Exception("Installer not opened: " + installResult[0]); }
            result.putString("result", "PASS");
            sendStatus(0, result);
            // Finishing instrumentation kills the target app and can dismiss its installer.
            // Keep it alive for UI confirmation; package replacement will end the process.
            if ("true".equals(arguments.getString("waitForInstall"))) { Thread.sleep(180000); }
            finish(-1, result);
        } catch (Throwable error) {
            result.putString("error", error.toString());
            finish(0, result);
        }
    }
}
