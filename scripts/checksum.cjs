const fs = require('node:fs');
const { createHash } = require('node:crypto');
const { name, version } = require('../package.json');
const file = `${name}-${version}.vsix`;
const hash = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.writeFileSync(`${file}.sha256`, `${hash}  ${file}\n`);
console.log(`SHA-256 written to ${file}.sha256`);
