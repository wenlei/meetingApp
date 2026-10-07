package org.jitsi.meet.sdk;

import java.io.File;
import java.io.IOException;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Versioned local paths prevent installers from reusing an older APK's URI. */
final class UpdateArtifacts {
    private static final Pattern NAME = Pattern.compile("update-([0-9]+)-[a-f0-9]{64}\\.apk");

    static File readyFile(File directory, long version, String hash) {
        if (version <= 0 || hash == null || !hash.matches("[a-fA-F0-9]{64}")) {
            throw new IllegalArgumentException("update_manifest_invalid");
        }
        return new File(directory, "update-" + version + "-" + hash.toLowerCase(Locale.ROOT) + ".apk");
    }

    /** Never replace an immutable file that may already be open in an installer. */
    static void promote(File partial, File ready, long size, String hash) throws Exception {
        UpdateIntegrity.verify(partial, size, hash);
        if (ready.exists()) {
            UpdateIntegrity.verify(ready, size, hash);
            if (!partial.delete()) { throw new IOException("storage_unavailable"); }
        } else if (!partial.renameTo(ready)) {
            throw new IOException("storage_unavailable");
        }
    }

    /** Only remove known artifacts already superseded by a successfully installed version. */
    static void pruneInstalled(File directory, long installedVersion) {
        File[] files = directory.listFiles();
        if (files == null) { return; }
        for (File file : files) {
            Matcher match = NAME.matcher(file.getName());
            if (!file.isFile() || !match.matches()) { continue; }
            try {
                if (Long.parseLong(match.group(1)) <= installedVersion) { file.delete(); }
            } catch (NumberFormatException ignored) {
                // Unknown files and newer pending installs are deliberately retained.
            }
        }
    }
}
