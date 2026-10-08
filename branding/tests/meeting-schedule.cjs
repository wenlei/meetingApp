const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, 'react/features/internal-account', name), 'utf8');
const compile = source => ts.transpileModule(source, {compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React
}}).outputText;
const model = {};
vm.runInNewContext(compile(read('meetingSchedule.ts')), {exports: model, Date});
const origin = 'https://113.46.187.140:18001';
const base = {room:'',date:'2026-10-09',start_time:'09:00',end_time:'10:00',notes:' hi ',attendee_ids:[2,3]};
const payload = patch => model.meetingPayload({...base,...patch}, origin, 'MeetingRandom123');
assert.equal(payload({room:'  '}).meeting_url, origin+'/MeetingRandom123');
assert.equal(payload({room:'  MondayMeetup '}).title, 'MondayMeetup');
assert.equal(payload({room:origin+'/MondayMeetup'}).meeting_url, origin+'/MondayMeetup');
assert.equal(payload({}).notes,'hi');
assert.equal(model.meetingPayload(base,origin,'MeetingRandom123','已有中文日程标题').title,'已有中文日程标题');
for(const room of ['中文会议','short', 'a'.repeat(65), 'https://other.test/Meeting123',origin+'/Meeting123?jwt=secret',origin+'/Meeting123#jwt=secret']) {
    assert.throws(()=>payload({room}),/invalid_room/);
}
for(const date of ['2026-02-29','2026-04-31','1999-01-01','2101-01-01','junk']) assert.throws(()=>payload({date}),/invalid_date/);
assert.equal(payload({date:'2028-02-29'}).date,'2028-02-29');
for(const times of [{end_time:'09:00'},{end_time:'08:30'},{end_time:'24:00'},{start_time:'9:00'}]) assert.throws(()=>payload(times),/invalid_time/);
for(const attendee_ids of [[2,2],[-1],[1.2],Array.from({length:51},(_,i)=>i+1)]) assert.throws(()=>payload({attendee_ids}),/invalid_attendees/);
assert.throws(()=>payload({notes:'n'.repeat(1001)}),/invalid_notes/);
assert.equal(model.scheduleDefaults(Date.parse('2026-10-08T01:02:00Z')).start_time,'09:15');
assert.equal(model.scheduleDefaults(Date.parse('2026-10-08T15:30:00Z')).date,'2026-10-09');
assert.equal(model.scheduleDefaults(Date.parse('2026-10-08T01:02:00Z'),true).start_time,'09:02');
assert.equal(model.scheduleDefaults(Date.parse('2026-10-08T15:59:00Z'),true).end_time,'23:59');

const sessionExports = {}, calls = [];
const user = {id:1,username:'owner',display_name:'Owner'};
let response = async()=>({status:200,ok:true,json:async()=>({event:{id:10},users:[]})});
const dependencies = {
    '@react-native-async-storage/async-storage': {default:{}},
    'react-native-keychain': {resetGenericPassword:async()=>true,hasGenericPassword:async()=>false,getGenericPassword:async()=>false},
    '../app/logger': {default:{warn(){}}},
    './deviceHandoff.native': {}, './handoffMedia.native': {handoffConferenceLeft(){}}, './meetingSchedule': model
};
vm.runInNewContext(compile(read('mobileSession.native.ts')+'\nexport {setCurrentSession as testSetSession};'), {
    exports:sessionExports,require:name=>{assert.ok(name in dependencies,name);return dependencies[name];},
    AbortController,setTimeout,clearTimeout, fetch:async(url,opts)=>{calls.push({url,...opts});return response();}
});
const resetSession = () => sessionExports.testSetSession({token:'fixture-token',user});

// Render actual function components with deterministic hooks; no native network, accounts or calendar writes.
function uiFixture(event, failSave=false, entryEvents) {
    const cells=[],effects=[]; let cursor=0,dirty=true,tree,saved=[],closed=0,picks=0;
    const changed=(a,b)=>!a||a.length!==b.length||a.some((v,i)=>v!==b[i]);
    const react={...React,
        useState(initial) {const i=cursor++;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;
            return[cells[i],value=>{cells[i]=typeof value==='function'?value(cells[i]):value;dirty=true;}];},
        useRef(initial){const i=cursor++;return cells[i]||=( {current:initial} );},
        useEffect(fn,deps){const i=cursor++;if(changed(cells[i],deps)){cells[i]=deps;effects.push(fn);}}
    };
    const native=Object.fromEntries(['ActivityIndicator','KeyboardAvoidingView','Modal','Pressable','ScrollView','Text','TextInput','View'].map(n=>[n,n]));
    Object.assign(native,{StyleSheet:{create:v=>v,hairlineWidth:1},Platform:{OS:'android'},Alert:{alert(){}},
        NativeModules:{MeetingDateTime:{pick:async()=>{picks++;return '2026-10-10';}}}});
    const api={MEETING_URL:origin,meetingDirectory:async()=>[{id:2,username:'lynn',display_name:'Lynn'},{id:3,username:'kkun',display_name:'Kunkun'}],
        meetingReservations:async()=>entryEvents,
        saveMeeting:async(p,e)=>{saved.push({p,e});if(failSave)throw Error('save_uncertain');},cancelMeeting:async()=>{}};
    const exports={};
    vm.runInNewContext(compile(read('MeetingSchedule.native.tsx')+'\nexport {MeetingScheduleDialog as TestDialog};'), {exports,Date,Error,require:name=>{
        if(name==='react')return{default:react,...react};
        if(name==='react-native')return native;
        if(name==='react-native-safe-area-context')return{SafeAreaView:'SafeAreaView'};
        if(name==='react-i18next')return{useTranslation:()=>({i18n:{language:'zh-CN'}})};
        if(name==='uuid')return{v4:()=> '12345678-1234-1234-1234-123456789012'};
        if(name==='../base/icons/components/Icon')return{default:'Icon'};
        if(name==='../base/icons/svg')return{};
        if(name==='./brandPalette.native')return{brandPalette:{}};
        if(name==='./meetingSchedule')return model;
        if(name==='./mobileSession.native')return api;
        throw Error(name);
    }});
    async function flush(){for(let i=0;i<6;i++){if(dirty){dirty=false;cursor=0;tree=entryEvents
        ? exports.default({room:'Room123',inMeeting:true}) : exports.TestDialog({event,onClose:()=>closed++});effects.splice(0).forEach(fn=>fn());}await new Promise(r=>setImmediate(r));}return tree;}
    return{flush,get saved(){return saved;},get closed(){return closed;},get picks(){return picks;}};
}
function nodes(tree){if(Array.isArray(tree))return tree.flatMap(nodes);if(!tree||typeof tree!=='object')return[];return[tree,...nodes(tree.props?.children)];}
const findTextButton=(tree,text)=>nodes(tree).find(n=>n.type==='Pressable'&&nodes(n).some(c=>c.type==='Text'&&c.props.children===text));
(async()=>{
    resetSession();let refreshed=0;const unsub=sessionExports.subscribeReservations(()=>refreshed++);
    await sessionExports.meetingDirectory();assert.ok(calls.at(-1).url.endsWith('/api/users'));
    await sessionExports.saveMeeting(payload({}));assert.equal(calls.at(-1).method,'POST');
    assert.equal(calls.at(-1).headers.Authorization,'Bearer fixture-token');
    assert.deepEqual(JSON.parse(calls.at(-1).body).attendee_ids,[2,3]);
    await sessionExports.saveMeeting(payload({}),{id:10,can_edit:true});assert.equal(calls.at(-1).method,'PUT');
    await sessionExports.cancelMeeting({id:10,can_edit:true});assert.equal(calls.at(-1).method,'DELETE');
    assert.equal(refreshed,3);unsub();
    const before=calls.length;
    await assert.rejects(sessionExports.saveMeeting(payload({}),{id:10,can_edit:false}),/event_unavailable/);
    await assert.rejects(sessionExports.cancelMeeting({id:10,can_edit:false}),/event_unavailable/);
    assert.equal(calls.length,before,'Invitees cannot even submit a write');
    response=async()=>{throw Error('network lost');};
    await assert.rejects(sessionExports.saveMeeting(payload({})),/save_uncertain/);
    assert.equal(calls.length,before+1,'POST not automatically retried');
    response=async()=>({status:404,ok:false,json:async()=>({})});
    await assert.rejects(sessionExports.cancelMeeting({id:10,can_edit:true}),/event_unavailable/);
    response=async()=>({status:200,ok:true,json:async()=>({})});
    await assert.rejects(sessionExports.saveMeeting(payload({})),/save_uncertain/);
    response=async()=>({status:200,ok:true,json:async()=>{sessionExports.testSetSession({token:'different-account',user:{...user,id:2}});return{users:[]};}});
    await assert.rejects(sessionExports.meetingDirectory(),/authentication_required/);
    resetSession();response=async()=>({status:401,ok:false,json:async()=>({})});
    await assert.rejects(sessionExports.meetingDirectory(),/authentication_required/);
    assert.equal(await sessionExports.restoreSession(),null);

    const ui=uiFixture();let tree=await ui.flush();
    const search=nodes(tree).find(n=>n.props.accessibilityLabel==='搜索参会者');
    search.props.onChangeText('@lynn');tree=await ui.flush();
    let checks=nodes(tree).filter(n=>n.props.accessibilityRole==='checkbox');assert.equal(checks.length,1);
    checks[0].props.onPress();tree=await ui.flush();
    nodes(tree).find(n=>n.props.accessibilityLabel==='日期').props.onPress();tree=await ui.flush();assert.equal(ui.picks,1);
    const save=findTextButton(tree,'保存并同步日程');save.props.onPress();save.props.onPress();await ui.flush();
    assert.equal(ui.saved.length,1,'Double tap saves once');assert.deepEqual(Array.from(ui.saved[0].p.attendee_ids),[2]);
    assert.equal(ui.saved[0].p.date,'2026-10-10');assert.match(ui.saved[0].p.meeting_url,/\/Meeting[0-9]+$/);assert.equal(ui.closed,1);
    const event={id:10,can_edit:false,title:'Existing',meeting_room:'Room123',date:'2026-10-09',start_time:'09:00',end_time:'10:00',attendees:[{id:2,username:'lynn',display_name:'Lynn'}]};
    tree=await uiFixture(event).flush();assert.equal(findTextButton(tree,'保存并同步日程'),undefined);
    assert.equal(findTextButton(tree,'取消会议日程'),undefined);assert.ok(nodes(tree).filter(n=>n.type==='TextInput').every(n=>n.props.editable===false));
    const edit=uiFixture({...event,can_edit:true});tree=await edit.flush();findTextButton(tree,'保存并同步日程').props.onPress();await edit.flush();
    assert.equal(edit.saved[0].p.title,'Existing');assert.equal(edit.saved[0].e.id,10);
    const failure=uiFixture(undefined,true);tree=await failure.flush();findTextButton(tree,'保存并同步日程').props.onPress();tree=await failure.flush();
    assert.equal(findTextButton(tree,'保存并同步日程').props.disabled,true);assert.equal(failure.closed,0);
    const inCall=uiFixture(undefined,false,[{...event,can_edit:true,date:'2099-01-01'}]);
    tree=await inCall.flush();findTextButton(tree,'邀请账号 · 同步日程').props.onPress();tree=await inCall.flush();
    assert.equal(nodes(tree).find(n=>n.type?.name==='MeetingScheduleDialog').props.event.id,10,'Early join reuses upcoming reservation');

    const recentSource=ts.createSourceFile('recent.tsx',fs.readFileSync(path.join(root,'react/features/recent-list/components/RecentList.native.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const recentClass=recentSource.statements.find(n=>ts.isClassDeclaration(n)&&n.name.text==='RecentList');
    const refreshBody=recentClass.members.find(n=>n.name?.getText(recentSource)==='_onRefreshReservations').body.getText(recentSource);
    const pending=[];
    // Exercise the actual list refresh method, including out-of-order account responses.
    const recentExports={};
    vm.runInNewContext(compile(`export const refresh=async function()${refreshBody}`),
        {exports:recentExports,meetingReservations:()=>new Promise(resolve=>pending.push(resolve))});
    const recent={mounted:true,reservationGeneration:0,state:{},setState(value){Object.assign(this.state,value);}};
    const old=recentExports.refresh.call(recent), current=recentExports.refresh.call(recent);
    pending[1](['new-account-event']);await current;pending[0](['old-account-event']);await old;
    assert.equal(recent.state.reservations[0],'new-account-event');
    console.log('PASS: room/date/time validation; UTC+8; authenticated CRUD; permissions; stale sessions; uncertain writes; actual UI selection, native picker dispatch, duplicate submit, edit/read-only/error states');
})().catch(error=>{console.error(error);process.exitCode=1;});
