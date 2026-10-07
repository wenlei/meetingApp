const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const implementation = ts.transpileModule(fs.readFileSync('react/features/internal-account/handoffMedia.native.ts', 'utf8'),
    {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
const exportsForTest = {};
vm.runInNewContext(implementation, {exports: exportsForTest});
const {registerMediaHandoff, handoffConferenceJoined, handoffMediaReady, handoffConferenceLeft} = exportsForTest;
const settle = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
    let commits = 0, cancels = 0, errors = 0, mutes = 0, restores = 0, fail = false;
    const track = {isMuted: () => false, mute: async () => { mutes++; }, unmute: async () => { restores++; }};
    const conference = {getName: () => 'RoomABC', getLocalTracks: () => [track], isConnectionInterrupted: () => false};
    registerMediaHandoff({room: 'roomabc', commit: async () => { commits++; if (fail) throw Error('offline'); },
        cancel: async () => { cancels++; }, error: () => { errors++; }});
    return {conference, fail: value => { fail = value; }, counts: () => ({commits,cancels,errors,mutes,restores})};
}
(async () => {
    let f = fixture();
    assert.equal(f.counts().commits, 0); // Login/preflight has no media effects.
    handoffConferenceJoined(f.conference);
    await settle();
    assert.equal(f.counts().commits, 0); // MUC joined must not evict old endpoint.
    assert.equal(f.counts().mutes, 1);
    handoffMediaReady({...f.conference, getName: () => 'OtherRoom'});
    await settle(); assert.equal(f.counts().commits, 0);
    handoffMediaReady(f.conference);
    handoffMediaReady(f.conference);
    await settle();
    assert.equal(f.counts().commits, 1);
    assert.equal(f.counts().restores, 1);
    handoffConferenceLeft(f.conference);
    assert.equal(f.counts().cancels, 0); // Successful handoff is not cancelled on later leave.
    f = fixture();
    handoffMediaReady(f.conference); // Race: media event arrives before joined action.
    await settle(); assert.equal(f.counts().commits, 0);
    handoffConferenceJoined(f.conference);
    await settle(); assert.equal(f.counts().commits, 1);
    f = fixture();
    handoffConferenceJoined(f.conference);
    handoffConferenceLeft(f.conference);
    handoffMediaReady(f.conference);
    await settle();
    assert.equal(f.counts().commits, 0); assert.equal(f.counts().cancels, 1);
    f = fixture(); f.fail(true);
    handoffConferenceJoined(f.conference); handoffMediaReady(f.conference);
    await settle();
    assert.equal(f.counts().restores, 0); assert.equal(f.counts().errors, 1);
    f.fail(false); handoffMediaReady(f.conference); await settle();
    assert.equal(f.counts().commits, 2); assert.equal(f.counts().restores, 1);
    console.log('PASS: passive login, MUC-only no commit, media-ready signal, event race, mute/restore, cancellation and retry');
})().catch(error => {console.error(error); process.exitCode = 1;});
