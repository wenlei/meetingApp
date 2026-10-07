const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const moduleSource = fs.readFileSync(path.join(root, 'android/sdk/src/main/java/org/jitsi/meet/sdk/AppUpdateModule.java'), 'utf8');
assert.match(moduleSource, /UpdateArtifacts.readyFile\(directory, version, hash\)/);
assert.match(moduleSource, /verifyFile\(partial, size, hash, version, versionName\)/);
assert.match(moduleSource, /UpdateArtifacts.promote\(partial, ready, size, hash\)/);
assert.doesNotMatch(moduleSource, /new File\(directory, "update.apk"\)/);
assert.match(moduleSource, /verifyFile\(ready, verifiedSize, verifiedHash, verifiedVersion, verifiedVersionName\)/);
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'meeting-update-java-'));
const java = name => process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', name) : name;
try {
    const sources = ['main/UpdateIntegrity', 'main/UpdateArtifacts', 'test/UpdateIntegrityTest', 'test/UpdateArtifactsTest']
        .map(name => path.join(root, 'android/sdk/src', name.replace('/', '/java/org/jitsi/meet/sdk/')) + '.java');
    execFileSync(java('javac'), ['-d', output, ...sources], { stdio: 'inherit' });
    for (const name of ['UpdateIntegrityTest', 'UpdateArtifactsTest']) {
        execFileSync(java('java'), ['-cp', output, `org.jitsi.meet.sdk.${name}`], { stdio: 'inherit' });
    }
} finally { fs.rmSync(output, { recursive: true, force: true }); }
