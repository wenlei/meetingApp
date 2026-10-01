package org.jitsi.meet.sdk;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.security.MessageDigest;

/** Independent integrity gate: a partial or altered download can never become installable. */
final class UpdateIntegrity {
    static void verify(File file, long size, String expectedHash) throws Exception {
        if (file.length() != size) { throw new IOException("download_size_mismatch"); }
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[65536];
            int count;
            while ((count = input.read(buffer)) != -1) { digest.update(buffer, 0, count); }
        }
        StringBuilder actual = new StringBuilder();
        for (byte value : digest.digest()) { actual.append(String.format("%02x", value & 255)); }
        if (!actual.toString().equalsIgnoreCase(expectedHash)) { throw new IOException("download_hash_mismatch"); }
    }
}
