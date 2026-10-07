// Regression: renaming an old APK must never create metadata advertising a new version.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const release = require('../android-release.json');
const oldApk = process.argv[2];
assert.ok(oldApk && fs.existsSync(oldApk), 'Pass an older signed APK to exercise the real Android manifest check');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'meeting-release-identity-'));
const renamed = path.join(directory, `guangyu-meeting-${release.version}-${release.versionCode}-arm64-v8a.apk`);
try {
    fs.symlinkSync(path.resolve(oldApk), renamed);
    const result = spawnSync(process.execPath, [path.join(__dirname, '../prepare-android-release.cjs'), directory], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /APK identity does not match release config/);
    assert.equal(fs.existsSync(path.join(directory, 'version.json')), false);
    console.log('PASS: old APK with a new filename rejected before publication metadata is written');
} finally {
    fs.unlinkSync(renamed);
    fs.rmdirSync(directory);
}
