const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname,
    '../../react/features/internal-account/mobileSession.native.ts'), 'utf8');
const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const ordinary = 'com.guangyuxinneng.meeting.account';
const protectedService = `${ordinary}.biometric`;

function fixture() {
    const credentials = new Map();
    const preferences = new Map();
    const state = { available: true, cancel: false, valid: true, prompts: 0, id: 1, name: 'alice' };
    const keychain = {
        ACCESS_CONTROL: { BIOMETRY_CURRENT_SET: 'biometric' },
        ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device' },
        getSupportedBiometryType: async () => state.available ? 'Fingerprint' : null,
        hasGenericPassword: async ({ service }) => credentials.has(service),
        setGenericPassword: async (username, password, options) => {
            credentials.set(options.service, { username, password });
            return true;
        },
        resetGenericPassword: async ({ service }) => credentials.delete(service),
        getGenericPassword: async ({ service }) => {
            if (service === protectedService) {
                state.prompts++;
                if (state.cancel) {
                    throw new Error('User cancelled');
                }
            }
            return credentials.get(service) || false;
        }
    };
    const exports = {};
    vm.runInNewContext(code, {
        exports,
        require: name => {
            if (name === 'react-native-keychain') return keychain;
            if (name === '@react-native-async-storage/async-storage') return {
                default: {
                    getItem: async key => preferences.get(key) || null,
                    setItem: async (key, value) => preferences.set(key, value)
                }
            };
            if (name === '../app/logger') return { default: { info() {} } };
            throw new Error(`Unexpected dependency: ${name}`);
        },
        fetch: async () => ({
            ok: state.valid,
            status: state.valid ? 200 : 401,
            json: async () => ({
                access_token: `token-${state.name}`,
                user: { id: state.id, username: state.name, display_name: state.name }
            })
        })
    });
    return { api: exports, state, credentials };
}

(async () => {
    const f = fixture();
    await f.api.signIn('alice', 'test-only');
    assert.equal((await f.api.biometricLoginState()).enabled, true);
    assert.equal(f.state.prompts, 1);
    assert.equal(f.credentials.has(ordinary), false);
    assert.equal((await f.api.signInWithBiometrics()).username, 'alice');

    await f.api.disableBiometricLogin();
    await f.api.signOut();
    assert.equal(f.credentials.size, 0);
    const promptsBefore = f.state.prompts;
    await f.api.signIn('alice', 'test-only');
    assert.equal((await f.api.biometricLoginState()).enabled, false);
    assert.equal(f.state.prompts, promptsBefore);
    await f.api.enableBiometricLogin();
    await f.api.signOut();
    await f.api.signIn('alice', 'test-only');
    assert.equal((await f.api.biometricLoginState()).enabled, true);

    f.state.id = 2;
    f.state.name = 'bob';
    await f.api.signIn('bob', 'test-only');
    assert.equal(f.credentials.get(protectedService).username, 'bob');
    assert.equal((await f.api.signInWithBiometrics()).username, 'bob');

    for (const option of [ 'unavailable', 'cancelled', 'invalid-password' ]) {
        const g = fixture();
        g.state.available = option !== 'unavailable';
        g.state.cancel = option === 'cancelled';
        g.state.valid = option !== 'invalid-password';
        if (g.state.valid) {
            assert.equal((await g.api.signIn('alice', 'test-only')).username, 'alice');
            assert.equal(g.credentials.has(ordinary), true);
        } else {
            await assert.rejects(g.api.signIn('alice', 'incorrect'));
            assert.equal(g.credentials.size, 0);
            assert.equal(g.state.prompts, 0);
        }
        assert.equal((await g.api.biometricLoginState()).enabled, false);
    }
    console.log('PASS: default enable, biometric login, persistent opt-out, re-enable, account isolation, unavailable sensor, cancellation, invalid password');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
