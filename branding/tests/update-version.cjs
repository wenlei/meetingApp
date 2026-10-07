const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../../react/features/internal-account/appUpdate.native.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exported = {};
const origin = 'https://113.46.187.140:18001';
const release = require('../android-release.json');
const installed = { version: release.version, buildNumber: String(release.versionCode) };
let manifest = { ...release, url: `${origin}/android/test.apk`, size: 1024, sha256: 'a'.repeat(64) };
const dependencies = {
    'react-native': { Platform: { OS: 'android' }, NativeModules: { AppInfo: installed }, DeviceEventEmitter: { addListener() {} }, Alert: { alert() { throw Error('Unexpected update prompt'); } } },
    '../app/logger': { default: { warn() {} } },
    './mobileSession.native': { MEETING_URL: origin }
};
vm.runInNewContext(code, { exports: exported, require: name => dependencies[name], fetch: async () => ({ ok: true, json: async () => ({ ...manifest }) }) });
(async () => {
    assert.equal((await exported.checkAppUpdate()).hasUpdate, false);
    await exported.promptAppUpdate(true);
    manifest = { ...manifest, version: '1.0.7', versionCode: 24456500 };
    assert.equal((await exported.checkAppUpdate()).hasUpdate, false);
    installed.version = '1.0.7';
    installed.buildNumber = '24456500';
    manifest = { ...manifest, ...release };
    assert.equal((await exported.checkAppUpdate()).hasUpdate, true);
    console.log(`PASS: 1.0.7 offers ${release.version}; installed ${release.version} never offers itself or an older release`);
})().catch(error => { console.error(error); process.exitCode = 1; });
