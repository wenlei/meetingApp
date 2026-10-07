const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const base = fs.readFileSync(path.join(root, 'react/features/welcome/components/AbstractWelcomePage.ts'), 'utf8');
const native = ts.createSourceFile('native.tsx', fs.readFileSync(path.join(root,
    'react/features/welcome/components/WelcomePage.native.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const nativeClass = native.statements.find(node => ts.isClassDeclaration(node) && node.name.text === 'WelcomePage');
const method = name => nativeClass.members.find(node => node.name?.getText(native) === name).body.getText(native);
let generated = 0;
const random = () => `RandomRoom${++generated}`;
class Component {
    constructor(props) { this.props = props; }
    setState(update, callback) { Object.assign(this.state, update); callback?.(); }
}
const exportsForTest = {};
const dependencies = {
    '@jitsi/js-utils/random': { generateRoomWithoutSeparator: random },
    react: { Component },
    '../../analytics/AnalyticsEvents': { createWelcomePageEvent: () => ({}) },
    '../../analytics/functions': { sendAnalytics() {} },
    '../../app/actions': { appNavigate: room => room },
    '../../base/util/isInsecureRoomName': { default: () => false },
    '../../calendar-sync/functions': {}, '../../prejoin/functions': {}, '../../recent-list/functions': {}
};
vm.runInNewContext(ts.transpileModule(base, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020
} }).outputText, { exports: exportsForTest, require: name => {
    assert.ok(name in dependencies, name); return dependencies[name];
}, window: { setTimeout: () => 1 }, clearTimeout() {} });
const resolve = vm.runInNewContext(`(function()${method('_getRoomName')})`, { generateRoomWithoutSeparator: random });
const mount = vm.runInNewContext(`(function()${method('componentDidMount').replace('super.componentDidMount();', 'this._mounted = true;')})`, {
    getName: () => 'Meeting'
});
function page(input = '', suggested = '') {
    const calls = [], listeners = {};
    let settle, fail;
    const result = new exportsForTest.AbstractWelcomePage({
        dispatch: room => { calls.push(room); return new Promise((yes, no) => { settle = yes; fail = no; }); },
        navigation: { setOptions() {}, addListener: (event, fn) => { listeners[event] = fn; } }
    });
    result._getRoomName = resolve;
    mount.call(result); // Already-focused screen: no focus event delivered after account gate mounts.
    result.state.room = input;
    result.state.generatedRoomName = suggested;
    return { result, calls, settle: () => settle(), fail: () => fail(new Error('navigation failed')) };
}
(async () => {
    for (const input of ['', '   ', '\t\n']) {
        const item = page(input);
        item.result._onJoin(); item.result._onJoin();
        assert.equal(item.calls.length, 1);
        assert.match(item.calls[0], /^RandomRoom\d+$/);
        item.settle(); await Promise.resolve();
        assert.equal(item.result.state.joining, false);
    }
    for (const input of [' TeamMeeting2026 ', ' https://113.46.187.140:18001/ExistingRoom ']) {
        const item = page(input); item.result._onJoin();
        assert.equal(item.calls[0], input.trim());
        item.fail(); await Promise.resolve();
        item.result._onJoin(); assert.equal(item.calls.length, 2); item.settle();
    }
    const suggestion = page('', 'SuggestedRoom'); suggestion.result._onJoin();
    assert.equal(suggestion.calls[0], 'SuggestedRoom'); suggestion.settle();
    const sync = page(); sync.result.props.dispatch = () => { throw Error('sync failure'); };
    assert.throws(() => sync.result._onJoin(), /sync failure/);
    assert.equal(sync.result._joinInFlight, false);
    const web = new exportsForTest.AbstractWelcomePage({});
    assert.equal(web._getRoomName(), ''); // Web generation-disabled behavior is unchanged.
    console.log('PASS: first mount without focus, empty/whitespace, names/URLs, suggestion, duplicate tap, retry; web unchanged');
})().catch(error => { console.error(error); process.exitCode = 1; });
