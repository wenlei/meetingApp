const fs = require('node:fs');
const http = require('node:http');
const babel = require('@babel/core');
require.extensions['.ts'] = (module, filename) => {
    const output = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
        filename, configFile: false, babelrc: false,
        presets: ['@babel/preset-typescript'],
        plugins: ['@babel/plugin-transform-modules-commonjs']
    });
    module._compile(output.code, filename);
};
const { loginPrismHTML } = require('../react/features/internal-account/loginPrismHTML.ts');
const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(loginPrismHTML(req.url === '/still'));
});
server.listen(18190, '127.0.0.1', () => console.log('Prism preview http://127.0.0.1:18190'));
