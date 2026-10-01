package org.jitsi.meet.sdk;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.security.MessageDigest;

/** Run with javac/java; exercises the same gate used by the Android downloader. */
public class UpdateIntegrityTest {
    private static void rejected(Path file, long size, String hash, String reason) throws Exception {
        try {
            UpdateIntegrity.verify(file.toFile(), size, hash);
            throw new AssertionError("Accepted invalid download: " + reason);
        } catch (java.io.IOException expected) {
            if (!reason.equals(expected.getMessage())) { throw expected; }
        }
    }

    public static void main(String[] args) throws Exception {
        Path directory = Files.createTempDirectory("meeting-update-test-");
        Path file = directory.resolve("package.part");
        byte[] payload = new byte[2048];
        for (int i = 0; i < payload.length; i++) { payload[i] = (byte) (i % 251); }
        StringBuilder hash = new StringBuilder();
        for (byte value : MessageDigest.getInstance("SHA-256").digest(payload)) {
            hash.append(String.format("%02x", value & 255));
        }
        try {
            Files.write(file, payload);
            UpdateIntegrity.verify(file.toFile(), payload.length, hash.toString());
            Files.write(file, Arrays.copyOf(payload, 1302));
            rejected(file, payload.length, hash.toString(), "download_size_mismatch");
            Files.write(file, Arrays.copyOf(payload, 0));
            rejected(file, payload.length, hash.toString(), "download_size_mismatch");
            Files.write(file, Arrays.copyOf(payload, payload.length + 1));
            rejected(file, payload.length, hash.toString(), "download_size_mismatch");
            payload[100] ^= 1;
            Files.write(file, payload);
            rejected(file, payload.length, hash.toString(), "download_hash_mismatch");
            System.out.println("PASS: complete file accepted; truncated, empty, oversized and altered files rejected");
        } finally {
            Files.deleteIfExists(file);
            Files.delete(directory);
        }
    }
}
