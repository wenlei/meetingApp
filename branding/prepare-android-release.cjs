// Generate metadata from the signed bytes, never from the unsigned build output.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const [directory, requestedVersion, requestedCode] = process.argv.slice(2);
const { version, versionCode } = require('./android-release.json');
if (!/^\d+\.\d+\.\d+$/.test(version) || !Number.isSafeInteger(versionCode)
    || versionCode <= 0 || versionCode > 2100000000) throw new Error('Invalid Android release identity');
if (!directory || (requestedVersion && requestedVersion !== version)
    || (requestedCode && Number(requestedCode) !== versionCode)) {
    throw new Error('Usage: node prepare-android-release.cjs DIRECTORY [VERSION VERSION_CODE]; version must match android-release.json');
}
const sdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || path.join(os.homedir(), 'Library/Android/sdk');
const buildTools = path.join(sdk, 'build-tools');
const toolsVersion = fs.readdirSync(buildTools).filter(name => /^\d+\.\d+\.\d+$/.test(name))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
const aapt = path.join(buildTools, toolsVersion, 'aapt');
const apksigner = path.join(buildTools, toolsVersion, 'apksigner');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const expectedBundle = digest(fs.readFileSync(path.join(__dirname, '../android/sdk/build/generated/assets/react/release/index.android.bundle')));
const expectedCertificate = 'd9e7c3fb2351cd116859241526a0566f488d05ec768d6d09b0d0e9e10261a83a';
const base = 'https://113.46.187.140:18001/android/';
function artifact(abi) {
    const name = `guangyu-meeting-${version}-${versionCode}-${abi}.apk`;
    const file = path.join(directory, name);
    const badging = execFileSync(aapt, ['dump', 'badging', file], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    const identity = badging.match(/package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/);
    if (!identity || identity[1] !== 'com.guangyuxinneng.meeting'
        || Number(identity[2]) !== versionCode || identity[3] !== version) {
        throw new Error(`APK identity does not match release config: ${file}`);
    }
    const nativeCode = badging.match(/^native-code: (.+)$/m)?.[1] || '';
    const expectedAbis = abi === 'arm64-v8a' ? ['arm64-v8a'] : ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'];
    if (expectedAbis.some(value => !nativeCode.includes(`'${value}'`))) {
        throw new Error(`APK is missing an expected architecture: ${file}`);
    }
    const certificate = execFileSync(apksigner, ['verify', '--print-certs', file], { encoding: 'utf8' });
    if (!certificate.includes(`Signer #1 certificate SHA-256 digest: ${expectedCertificate}`)) {
        throw new Error(`Wrong release signing certificate: ${file}`);
    }
    const bundle = execFileSync('unzip', ['-p', file, 'assets/index.android.bundle'], { maxBuffer: 32 * 1024 * 1024 });
    if (digest(bundle) !== expectedBundle) throw new Error(`APK contains a stale JS bundle: ${file}`);
    const bytes = fs.readFileSync(file);
    return { name, url: base + name, size: bytes.length,
        sha256: digest(bytes) };
}
const arm = artifact('arm64-v8a'), universal = artifact('universal');
const manifest = { version, versionCode, url: arm.url, size: arm.size, sha256: arm.sha256,
    universalUrl: universal.url, universalSize: universal.size, universalSha256: universal.sha256,
    bundleSha256: expectedBundle };
const currentManifestPath = path.join(directory, 'version.json');
if (fs.existsSync(currentManifestPath)) {
    const previous = JSON.parse(fs.readFileSync(currentManifestPath, 'utf8'));
    if (String(previous.version).localeCompare(version, undefined, { numeric: true }) > 0
        || previous.versionCode > versionCode || (previous.versionCode === versionCode
        && (previous.sha256 !== arm.sha256 || previous.universalSha256 !== universal.sha256))
        || (previous.version === version && previous.versionCode !== versionCode)) {
        throw new Error('A published version cannot be reused for different APK bytes. Increment both release fields.');
    }
    if (previous.version !== version && /^\d+\.\d+\.\d+$/.test(previous.version)) {
        fs.copyFileSync(currentManifestPath, path.join(directory, `version-${previous.version}.json`));
    }
}
fs.writeFileSync(path.join(directory, 'version.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(directory, 'sha256.txt'), [arm, universal].map(a => `${a.sha256}  ${a.name}\n`).join(''));
console.log(JSON.stringify(manifest, null, 2));
