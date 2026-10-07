package org.jitsi.meet.sdk;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;

/** Exercises the actual downloader's local artifact policy without an Android build. */
public class UpdateArtifactsTest {
    private static void check(boolean value) { if (!value) { throw new AssertionError(); } }

    public static void main(String[] args) throws Exception {
        Path directory = Files.createTempDirectory("meeting-artifacts-test-");
        byte[] payload = new byte[] { 1, 2, 3, 4 };
        StringBuilder digest = new StringBuilder();
        for (byte b : MessageDigest.getInstance("SHA-256").digest(payload)) {
            digest.append(String.format("%02x", b & 255));
        }
        String hash = digest.toString();
        try {
            File first = UpdateArtifacts.readyFile(directory.toFile(), 100, hash);
            File next = UpdateArtifacts.readyFile(directory.toFile(), 101, hash);
            check(!first.equals(next));
            check(first.equals(UpdateArtifacts.readyFile(directory.toFile(), 100, hash.toUpperCase())));
            check(!first.equals(UpdateArtifacts.readyFile(directory.toFile(), 100, "a".repeat(64))));
            try { UpdateArtifacts.readyFile(directory.toFile(), 100, "../bad"); throw new AssertionError(); }
            catch (IllegalArgumentException expected) { }
            Path part = directory.resolve("download.part");
            Files.write(part, payload);
            UpdateArtifacts.promote(part.toFile(), first, payload.length, hash);
            check(first.isFile() && !Files.exists(part));
            check(first.setLastModified(123456000L));
            long untouched = first.lastModified();
            Files.write(part, payload);
            UpdateArtifacts.promote(part.toFile(), first, payload.length, hash);
            check(first.lastModified() == untouched && !Files.exists(part));
            Files.write(part, new byte[] { 9 });
            try { UpdateArtifacts.promote(part.toFile(), next, payload.length, hash); throw new AssertionError(); }
            catch (java.io.IOException expected) { }
            check(!next.exists());
            Files.write(part, payload);
            UpdateArtifacts.promote(part.toFile(), next, payload.length, hash);
            Path legacy = directory.resolve("update.apk"); Files.write(legacy, payload);
            Path unknown = directory.resolve("do-not-touch.txt"); Files.write(unknown, payload);
            UpdateArtifacts.pruneInstalled(directory.toFile(), 100);
            check(!first.exists() && next.exists() && Files.exists(legacy) && Files.exists(unknown));
            System.out.println("PASS: version/hash-isolated paths, immutable retry, corrupt file rejected, pending files preserved");
        } finally {
            for (File file : directory.toFile().listFiles()) { Files.delete(file.toPath()); }
            Files.delete(directory);
        }
    }
}
