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

const Card = load('internal-account/MacWindowCard.native.tsx', {
    react: { default: React, ...React },
    'react-native': { View: 'View', StyleSheet: { create: x => x } },
    './brandPalette.native': { brandPalette: {}, brandAlpha: {} }
}).default;
const tree = Card({ title: '账号登录', children: 'FORM', glass: true });
assert.equal(tree.type, 'View');
assert.equal(tree.props.children, 'FORM');
assert.equal(tree.props.accessibilityLabel, '账号登录');
assert.equal(tree.props.onPress, undefined); // No close, collapse or header controls.

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
console.log('PASS: headerless card, content always visible, no close control, 5 rows / 4 separators');
