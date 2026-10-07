const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

const code = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,
    '../../react/features/internal-account/InternalWelcomePage.native.tsx'), 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;

function fixture(enabled) {
    const cells = [], effects = [];
    let cursor = 0, dirty = true, tree, prompts = 0, updates = 0, resolvePrompt, rejectPrompt;
    const changed = (a, b) => !a || a.length !== b.length || a.some((v, i) => v !== b[i]);
    const react = { ...React,
        useState(initial) {
            const i = cursor++;
            if (!(i in cells)) cells[i] = initial;
            return [ cells[i], value => {
                const next = typeof value === 'function' ? value(cells[i]) : value;
                if (next !== cells[i]) { cells[i] = next; dirty = true; }
            } ];
        },
        useRef(initial) { const i = cursor++; return cells[i] ||= { current: initial }; },
        useCallback(fn, deps) {
            const i = cursor++;
            if (changed(cells[i]?.deps, deps)) cells[i] = { deps, fn };
            return cells[i].fn;
        },
        useEffect(fn, deps) {
            const i = cursor++;
            if (changed(cells[i], deps)) { cells[i] = deps; effects.push(fn); }
        }
    };
    const native = Object.fromEntries(['ActivityIndicator', 'Image', 'KeyboardAvoidingView', 'Pressable', 'ScrollView',
        'Text', 'TextInput', 'View'].map(name => [name, name]));
    Object.assign(native, { StyleSheet: {create: value => value}, Platform: {OS:'android'},
        AccessibilityInfo: {isReduceMotionEnabled: async()=>false} });
    const session = { takeAccountError:()=>'', takePendingRoom:()=>null,
        restoreSession:async()=>null, subscribeAccountSession:()=>()=>{},
        biometricLoginState:async()=>({type:'Fingerprint',enabled}),
        signIn:async()=>{throw Error('Not part of biometric gate test');},
        signInWithBiometrics:()=>{ prompts++; return new Promise((resolve,reject)=>{resolvePrompt=resolve;rejectPrompt=reject;}); }
    };
    const dispatch = ()=>{};
    const exports = {};
    vm.runInNewContext(code, {exports, require:name=>{
        if(name==='react') return {default:react,...react};
        if(name==='react-native') return native;
        if(name==='react-i18next') return {useTranslation:()=>({i18n:{language:'zh-CN'}})};
        if(name==='react-native-safe-area-context') return {SafeAreaView:'SafeAreaView'};
        if(name==='react-redux') return {useDispatch:()=>dispatch};
        if(name==='../app/actions.native') return {appNavigate:()=>{}};
        if(name==='../base/settings/actions') return {updateSettings:()=>{}};
        if(name==='../app/logger') return {default:{warn(){},error(){}}};
        if(name==='./mobileSession.native') return session;
        if(name==='./appUpdate.native') return {promptAppUpdate:()=>updates++};
        if(name==='./brandPalette.native') return {brandPalette:{},brandAlpha:{}};
        if(name.endsWith('.png')) return 1;
        if(['../welcome/components/WelcomePage','./LoginPrismBackground.native','./MacWindowCard.native','./ActiveDeviceHandoff.native'].includes(name)) return {default:name};
        throw Error('Unexpected dependency '+name);
    }});
    async function flush() {
        for(let n=0;n<8;n++) {
            if(dirty) {dirty=false;cursor=0;tree=exports.default({navigation:{setOptions(){}}});effects.splice(0).forEach(fn=>fn());}
            await new Promise(resolve=>setImmediate(resolve));
        }
        return tree;
    }
    return {flush, get prompts(){return prompts;}, get updates(){return updates;},
        cancel:()=>rejectPrompt(Error('用户取消验证')), success:()=>resolvePrompt({id:1,username:'alice',display_name:'Alice'})};
}
function nodes(tree) {
    if(Array.isArray(tree)) return tree.flatMap(nodes);
    if(!tree || typeof tree!=='object') return [];
    return [tree,...nodes(tree.props?.children)];
}
(async()=>{
    const f=fixture(true);
    let tree=await f.flush();
    assert.equal(f.prompts,1);
    assert.equal(f.updates,0);
    assert.equal(nodes(tree).filter(n=>n.type==='TextInput').length,0,'Password hidden while biometric prompt is pending');
    f.cancel(); tree=await f.flush();
    assert.equal(nodes(tree).filter(n=>n.type==='TextInput').length,2);
    assert.equal(f.prompts,1,'Cancellation must not immediately reopen the native prompt');
    const retry=nodes(tree).find(n=>n.type==='Pressable' && nodes(n).some(c=>c.type==='Text' && String(c.props.children).includes('重试指纹')));
    assert.ok(retry);
    retry.props.onPress(); tree=await f.flush();
    assert.equal(nodes(tree).filter(n=>n.type==='TextInput').length,0);
    assert.equal(f.prompts,2);
    f.success(); tree=await f.flush();
    assert.ok(nodes(tree).some(n=>n.type==='../welcome/components/WelcomePage'));
    assert.equal(f.updates,1);
    const g=fixture(false);
    tree=await g.flush();
    assert.equal(g.prompts,0);
    assert.equal(nodes(tree).filter(n=>n.type==='TextInput').length,2);
    console.log('PASS: biometric-first, hidden password, cancellation fallback, no prompt loop, retry, success, disabled preference');
})().catch(error=>{console.error(error);process.exitCode=1;});
