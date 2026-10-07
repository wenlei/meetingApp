const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('react/features/internal-account/deviceHandoff.native.ts', 'utf8');
const exportsForTest = {};
let decision = true, prompts = 0, writes = 0;
const dependencies = {
    '@react-native-async-storage/async-storage': { default: { getItem: async () => null, setItem: async () => { writes++; } } },
    'react-native': { Platform: { OS: 'android' }, Alert: { alert: (_title, _message, buttons, options) => {
        prompts++;
        if (decision === 'dismiss') options.onDismiss(); else buttons[decision ? 1 : 0].onPress();
    } } },
    uuid: { v4: () => '01234567-89ab-cdef-0123-456789abcdef' },
    '../base/i18n/i18next': { default: { language: 'zhCN' } }
};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
    { exports: exportsForTest, require: key => { assert.ok(dependencies[key], key); return dependencies[key]; } });
const ok = { status: 200 };
const conflict = { status: 409, json: async () => ({ error: 'device_conflict', device: '浏览器', replace: 'generation_A' }) };
(async () => {
    const { requestDeviceJoin, DeviceSwitchCancelled } = exportsForTest;
    let requests = [];
    assert.equal(await requestDeviceJoin('RoomABC', async body => { requests.push(body); return ok; }), ok);
    assert.equal(prompts, 0);
    assert.equal(requests[0].device_kind, 'android');
    requests = [];
    assert.equal(await requestDeviceJoin('RoomABC', async body => { requests.push(body); return requests.length === 1 ? conflict : ok; }), ok);
    assert.equal(requests[1].device_replace, 'generation_A');
    assert.equal(requests[0].device_id, requests[1].device_id);
    for (decision of [false, 'dismiss']) {
        let calls = 0;
        await assert.rejects(requestDeviceJoin('RoomABC', async () => { calls++; return conflict; }), DeviceSwitchCancelled);
        assert.equal(calls, 1);
    }
    decision = true;
    let calls = 0;
    await assert.rejects(requestDeviceJoin('RoomABC', async () => { calls++; return conflict; }), /设备状态已变化/);
    assert.equal(calls, 2); // No retry loop when a third device changes the target.
    await assert.rejects(requestDeviceJoin('RoomABC', async () => { throw new Error('offline'); }), /offline/);
    assert.equal(await requestDeviceJoin('RoomABC', async () => ok), ok);
    assert.equal(writes, 1);
    exportsForTest.selectDeviceHandoff('RoomABC', 'selected_generation');
    const previousPrompts = prompts;
    let explicit;
    await requestDeviceJoin('RoomABC', async body => { explicit = body; return ok; });
    assert.equal(explicit.device_replace, 'selected_generation');
    assert.equal(prompts, previousPrompts); // The icon tap itself is the explicit request.
    exportsForTest.selectDeviceHandoff('RoomABC', 'stale_generation');
    await assert.rejects(requestDeviceJoin('RoomABC', async () => conflict), /设备状态已变化/);
    assert.equal(prompts, previousPrompts); // Do not silently retarget another device.
    console.log('PASS: direct join, device identity persistence, explicit confirmation, cancel/dismiss, stale race, network retry');
})().catch(error => { console.error(error); process.exitCode = 1; });
