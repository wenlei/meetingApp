const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const read = file => fs.readFileSync(file, 'utf8');
const compile = code => ts.transpileModule(code, {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020
}}).outputText;
const source = read('react/features/base/conference/actions.any.ts');
const callback = source.match(/JitsiConferenceEvents\.KICKED,\s*([\s\S]*?)\);\n\n    conference\.on\(/)[1];
const actionBody = source.match(/export function kickedOut\([\s\S]*?\n\}/)[0];
const dispatched = [];
const shared = {exports: {}, deviceTransferred: false, dispatch: value => dispatched.push(value), conference: {}, state: {},
    KICKED_OUT: 'KICKED_OUT', getLocalParticipant: () => ({id: 'local'}), participantUpdated: value => ({type: 'participantUpdated', ...value})};
vm.createContext(shared);
vm.runInContext(compile(actionBody + '\n globalThis.listener = ' + callback + ';'), shared);
shared.listener(undefined, 'any reason', true);
assert.equal(dispatched.at(-1).deviceTransferred, true);
assert.equal(dispatched.at(-1).type, 'KICKED_OUT');
assert.equal(shared.deviceTransferred, true);
shared.listener(undefined, 'any reason', false);
assert.equal(dispatched.at(-1).deviceTransferred, false);

const native = {exports: {}, require: name => {
    if (name.endsWith('/dialog/actions')) return {openDialog: (name, component, props) => ({props})};
    if (name.endsWith('/participants/functions')) return {getParticipantDisplayName: () => 'Host'};
    return {};
}};
vm.runInNewContext(compile(read('react/features/conference/actions.native.ts')), native);
function notice(participant, transfer) {
    const rendered = []; let submitted = false;
    native.exports.notifyKickedOut(participant, () => {submitted = true;}, transfer)(value => rendered.push(value), () => ({}));
    assert.equal(submitted, false);
    rendered[0].props.onSubmit();
    assert.equal(submitted, true);
    return rendered[0].props.contentKey.key;
}
assert.equal(notice(undefined, true), 'dialog.meetingDeviceTransferred');
assert.equal(notice({isReplaced: () => true, getId: () => 'local'}, true), 'dialog.meetingDeviceTransferred');
assert.equal(notice(undefined, false), 'dialog.kickSystemTitle');
assert.equal(notice({getId: () => 'host'}, false), 'dialog.kickTitle');
assert.match(read('react/features/conference/middleware.native.ts'), /action\.deviceTransferred === true/);
assert.match(read('react/features/conference/middleware.web.ts'), /action\.deviceTransferred === true \? i18next\.t\('dialog.meetingDeviceTransferred'\)/);
for (const locale of ['main', 'main-zh-CN']) {
    const value = JSON.parse(read(`lang/${locale}.json`)).dialog;
    assert(value.meetingDeviceTransferred);
    assert(!/kick|移出|踢/i.test(value.meetingDeviceTransferred));
    assert(value.kickSystemTitle);
}
console.log('PASS: server replacement signal selects transfer notice; moderator/system kicks remain distinct; confirmation callback and translations');

const failure = source.match(/JitsiConferenceEvents\.CONFERENCE_FAILED,\s*([\s\S]*?)\);\n    conference\.on\(/)[1];
shared.conferenceFailed = () => ({type: 'FAILED'});
vm.runInContext(compile('globalThis.failed = ' + failure + ';'), shared);
const count = dispatched.length;
shared.failed('conference.offerAnswerFailed');
assert.equal(dispatched.length, count, 'Late errors from replaced conference must not trigger reload');
shared.deviceTransferred = false;
shared.failed('conference.offerAnswerFailed');
assert.equal(dispatched.at(-1).type, 'FAILED', 'Unrelated conference errors remain visible');

let middleware;
const calls = [];
let navigated;
let disconnected;
const nativeMiddleware = {exports: {}, require: name => {
    if (name.endsWith('/MiddlewareRegistry')) return {default: {register: fn => {middleware = fn;}}};
    if (name.endsWith('/actionTypes')) return {KICKED_OUT: 'KICKED_OUT'};
    if (name.endsWith('/app/actions.native')) return {appNavigate: () => ({type: 'NAVIGATE'})};
    if (name.endsWith('/connection/actions')) return {disconnect: () => ({type: 'DISCONNECT'})};
    if (name === './actions.native') return {notifyKickedOut: (...args) => ({type: 'NOTICE', args})};
    return {};
}};
vm.runInNewContext(compile(read('react/features/conference/middleware.native.ts')), nativeMiddleware);
const action = {type: 'KICKED_OUT', deviceTransferred: true};
middleware({dispatch: value => {
    calls.push(value);
    if (value.type === 'DISCONNECT') return new Promise(resolve => {disconnected = resolve;});
    if (value.type === 'NAVIGATE') return new Promise(resolve => {navigated = resolve;});
}})(value => value)(action);
assert.deepEqual(calls.map(value => value.type), ['DISCONNECT']);
disconnected();
Promise.resolve().then(async () => {
    assert.deepEqual(calls.map(value => value.type), ['DISCONNECT', 'NAVIGATE']);
    navigated();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(calls.map(value => value.type), ['DISCONNECT', 'NAVIGATE', 'NOTICE']);
    assert.equal(calls[2].args[2], true);
    console.log('PASS: disconnect/navigation precedes notice; late replaced-session errors ignored; ordinary errors preserved');
});
