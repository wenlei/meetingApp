// Generate metadata from the signed bytes, never from the unsigned build output.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const [directory, version, rawCode] = process.argv.slice(2);
const versionCode = Number(rawCode);
if (!directory || !/^\d+\.\d+\.\d+$/.test(version) || !Number.isSafeInteger(versionCode)) {
    throw new Error('Usage: node prepare-android-release.cjs DIRECTORY VERSION VERSION_CODE');
}
const base = 'https://113.46.187.140:18001/android/';
function artifact(abi) {
    const name = `guangyu-meeting-${version}-${versionCode}-${abi}.apk`;
    const bytes = fs.readFileSync(path.join(directory, name));
    return { name, url: base + name, size: bytes.length,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}
const arm = artifact('arm64-v8a'), universal = artifact('universal');
const manifest = { version, versionCode, url: arm.url, size: arm.size, sha256: arm.sha256,
    universalUrl: universal.url, universalSize: universal.size, universalSha256: universal.sha256 };
fs.writeFileSync(path.join(directory, 'version.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(directory, 'sha256.txt'), [arm, universal].map(a => `${a.sha256}  ${a.name}\n`).join(''));
console.log(JSON.stringify(manifest, null, 2));
