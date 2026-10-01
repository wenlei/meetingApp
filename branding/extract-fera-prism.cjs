/** Extract the original Prism renderer without React or unrelated effects. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const types = require('@babel/types');

const input = process.argv[2];
if (!input) throw new Error('Provide the original Fera JSX export path.');
const source = fs.readFileSync(input, 'utf8');
const ast = parser.parse(source, { sourceType: 'module' });
let program;
traverse(ast, { Program(p) { program = p; } });
const bindings = program.scope.bindings;
const selected = new Set();
const roots = ['nr', 'ir', 'lr', 'ae', 'Ul'];

function include(name) {
    if (selected.has(name)) return;
    const binding = bindings[name];
    if (!binding) throw new Error(`Missing engine binding: ${name}`);
    selected.add(name);
    const p = binding.path;
    const reference = q => {
        const dependency = q.scope.getBinding(q.node.name);
        if (dependency && dependency.scope === program.scope) include(q.node.name);
    };
    if (p.isReferencedIdentifier()) reference(p);
    p.traverse({ ReferencedIdentifier: reference });
}
roots.forEach(include);
const body = [];
for (const statement of ast.program.body) {
    if (types.isFunctionDeclaration(statement) && selected.has(statement.id.name)) {
        body.push(statement);
    } else if (types.isVariableDeclaration(statement)) {
        const declarations = statement.declarations.filter(d => selected.has(d.id.name));
        if (declarations.length) body.push(types.variableDeclaration(statement.kind, declarations));
    }
}
const engine = generate(types.program(body), { compact: true }).code
    + ';return {paint:nr,noise:ir,noiseOpacity:lr,initialTime:ae,clockScale:Ul};';
const hash = crypto.createHash('sha256').update(source).digest('hex');
const output = path.resolve(__dirname, '../react/features/internal-account/feraPrismEngine.generated.ts');
fs.writeFileSync(output, `/* eslint-disable */\n// Generated from the user-provided Fera export. Do not hand-edit.\n// Source SHA-256: ${hash}\nexport const feraPrismEngineSource = ${JSON.stringify(engine)};\n`);
console.log(`Extracted ${selected.size} original bindings (${engine.length} bytes). Source: ${hash}`);
