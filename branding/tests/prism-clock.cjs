const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname,'../..');
const recipe = JSON.parse(fs.readFileSync(path.join(root,'branding/login-prism-recipe.json'),'utf8'));
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root,'react/features/internal-account/loginPrismHTML.ts'),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
}).outputText, {exports:exportsObject,require:name=>name.includes('recipe')?recipe:{feraPrismEngineSource:'return {paint(){},noise(){return ""},clockScale:1.2};'}});
const script=exportsObject.loginPrismHTML(false).match(/<script>([\s\S]*?)<\/script>/)[1];
let callback, next=0;
const context={window:{devicePixelRatio:1,addEventListener(){}},document:{hidden:false,addEventListener(){},
    getElementById:()=>({style:{},getContext:()=>({})})},innerWidth:400,innerHeight:800,
    requestAnimationFrame:fn=>{callback=fn;return ++next;},cancelAnimationFrame:()=>{callback=null;}};
vm.runInNewContext(script,context);
callback(1000);callback(1100);callback(1400);
assert.equal(context.window.__guangyuPrism.elapsed,.4,'Dropped frames still count elapsed foreground time');
assert.equal(recipe.speed,768);
context.window.setPrismActive(false);
assert.equal(callback,null);
context.window.setPrismActive(true);
callback(100000);callback(100100);
assert.equal(context.window.__guangyuPrism.elapsed,.5,'Do not include time spent in background');
console.log('PASS: faster app recipe, frame-independent clock, pause and resume');
