// Run only after the new release and its rollback version have passed release checks.
// Dry-run by default. Keep exactly two verified immutable releases; aliases stay live.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const [directoryArg, currentArg, previousArg, mode] = process.argv.slice(2);
if (!directoryArg || !currentArg || !previousArg || (mode && mode !== '--apply')) {
    throw new Error('Usage: node prune-android-releases.cjs DIST CURRENT_VERSION_JSON PREVIOUS_VERSION_JSON [--apply]');
}
const directory = fs.realpathSync(directoryArg);
if (!['android-download', 'jitsi-download'].includes(path.basename(directory))) {
    throw new Error(`Unexpected release directory: ${directory}`);
}
const readManifest = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const releases = [readManifest(currentArg), readManifest(previousArg)];
if (releases[0].versionCode <= releases[1].versionCode || releases[0].version === releases[1].version) {
    throw new Error('Current and previous manifests must be different, newest first.');
}
const kept = new Set();
function verifyBytes(file, size, hash) {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.size !== size) {
        throw new Error(`Missing or wrong-size artifact: ${file}`);
    }
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (actualHash !== hash) throw new Error(`Checksum mismatch: ${file}`);
}
for (const release of releases) {
    if (!/^\d+\.\d+\.\d+$/.test(release.version) || !Number.isSafeInteger(release.versionCode)) {
        throw new Error('Invalid version metadata.');
    }
    for (const [urlKey, sizeKey, hashKey, abi] of [
        ['url', 'size', 'sha256', 'arm64-v8a'],
        ['universalUrl', 'universalSize', 'universalSha256', 'universal']
    ]) {
        const expected = `guangyu-meeting-${release.version}-${release.versionCode}-${abi}.apk`;
        if (new URL(release[urlKey]).pathname.split('/').pop() !== expected) {
            throw new Error(`Unexpected artifact name: ${release[urlKey]}`);
        }
        const file = path.join(directory, expected);
        verifyBytes(file, release[sizeKey], release[hashKey]);
        kept.add(expected);
    }
}
verifyBytes(path.join(directory, 'guangyu-meeting.apk'), releases[0].size, releases[0].sha256);
verifyBytes(path.join(directory, 'guangyu-meeting-universal.apk'), releases[0].universalSize, releases[0].universalSha256);

const candidates = [];
const oldArtifact = /^guangyu-meeting-(?:\d+\.\d+\.\d+.*|aligned)\.apk(?:\.idsig|\.previous)?$/;
for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isFile() && oldArtifact.test(entry.name)) {
        const owner = entry.name.replace(/\.idsig$|\.previous$/, '');
        if (!kept.has(owner)) candidates.push(path.join(directory, entry.name));
    }
    if (entry.isFile() && /^guangyu-meeting(?:-universal)?\.apk\.idsig$/.test(entry.name)) {
        candidates.push(path.join(directory, entry.name));
    }
}
// Published immutable packages supersede backup APK copies. Preserve backup metadata.
const backups = path.join(directory, 'backups');
function inspectBackups(folder) {
    if (!fs.existsSync(folder)) return;
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
        const file = path.join(folder, entry.name);
        if (entry.isDirectory()) inspectBackups(file);
        else if (entry.isFile() && /^guangyu-meeting.*\.apk(?:\.idsig|\.previous)?$/.test(entry.name)) candidates.push(file);
    }
}
inspectBackups(backups);
for (const file of candidates) console.log(`${mode === '--apply' ? 'REMOVE' : 'WOULD REMOVE'} ${file}`);
console.log(`Verified ${releases[0].version} and ${releases[1].version}; ${candidates.length} old artifacts found.`);
if (mode === '--apply') {
    for (const file of candidates) fs.unlinkSync(file);
}
