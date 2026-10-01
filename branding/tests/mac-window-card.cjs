const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

function load(relative, dependencies) {
    const exports = {};
    const source = fs.readFileSync(path.join(__dirname, '../../react/features', relative), 'utf8');
    const code = ts.transpileModule(source, {
        compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText;
    vm.runInNewContext(code, { exports, require: name => {
        assert.ok(name in dependencies, `Unexpected dependency ${name}`);
        return dependencies[name];
    } });
    return exports;
}

function fixture(props = {}) {
    let expanded;
    const react = {
        ...React,
        useState(initial) {
            expanded ??= initial;
            return [ expanded, value => { expanded = value; } ];
        },
        useCallback: fn => fn
    };
    const Card = load('internal-account/MacWindowCard.native.tsx', {
        react: { default: react, ...react },
        'react-i18next': { useTranslation: () => ({ i18n: { language: 'zh-CN' } }) },
        'react-native': { Pressable: 'Pressable', View: 'View', Text: 'Text', StyleSheet: { create: x => x, hairlineWidth: 0.5 } },
        'react-native-svg': { default: 'Svg', Path: 'Path' },
        './brandPalette.native': { brandPalette: {}, brandAlpha: {} }
    }).default;
    const render = () => Card({ title: '账号登录', children: 'FORM', ...props });
    const controls = tree => tree.props.children[0].props.children;
    return { render, controls };
}

let collapsed = 0;
const f = fixture({ onCollapse: () => collapsed++ });
let tree = f.render();
assert.equal(tree.props.children[1], 'FORM');
let [ close, title, spacer ] = f.controls(tree);
assert.equal(close.props.accessibilityLabel, '关闭 账号登录');
assert.equal(close.props.style.width, 44);
assert.equal(spacer.type, 'View'); // No minimize/maximize button placeholders.
close.props.onPress();
tree = f.render();
assert.equal(tree.props.children[1], false);
assert.equal(collapsed, 1);
[ close, title ] = f.controls(tree);
assert.equal(close.props.disabled, true);
assert.equal(title.props.accessibilityRole, 'button');
title.props.onPress();
assert.equal(f.render().props.children[1], 'FORM');

let dismissed = 0;
const modal = fixture({ onClose: () => dismissed++ });
modal.controls(modal.render())[0].props.onPress();
assert.equal(dismissed, 1);
assert.equal(modal.render().props.children[1], 'FORM'); // Dialog owner handles visibility/cancellation.
const busy = fixture({ disabled: true });
assert.equal(busy.controls(busy.render())[0].props.disabled, true);
const folded = fixture({ defaultExpanded: false });
assert.equal(folded.render().props.children[1], false);

const FormRow = () => null;
const mockReact = { ...React, useContext: () => true };
const Section = load('settings/components/native/FormSection.tsx', {
    react: { default: mockReact, ...mockReact },
    'react-native': { Text: 'Text', View: 'View' },
    'react-redux': { useSelector: () => true },
    '../../../base/i18n/functions': { translate: fn => fn },
    '../../../internal-account/MacWindowCard.native': { default: 'MacWindowCard' },
    '../../../welcome/functions': { isWelcomePageEnabled() {} },
    './FormRow': { default: FormRow },
    './styles': { default: { rowSeparator: {}, windowSection: {} } }
}).default;
const section = Section({ label: 'General', t: x => x,
    children: Array.from({ length: 5 }, (_, key) => React.createElement(FormRow, { key })) });
const rows = section.props.children;
assert.equal(rows.length, 5);
assert.equal(rows.filter(row => Boolean(row.props.children[0])).length, 4);
assert.ok(rows.every(row => row.props.children[1].type === FormRow)); // Separators precede rows, never trail the last.
console.log('PASS: close/reopen, modal dismissal, busy protection, initial collapse, single close control, 5 rows / 4 separators');
