const assert = require('node:assert/strict');
const fs = require('node:fs');
const manifest = require('../package.json');
const lock = require('../package-lock.json');
assert.match(manifest.version, /^\d+\.\d+\.\d+$/, 'Use a stable release version.');
assert.equal(manifest.version, lock.version, 'Manifest and lockfile versions must match.');
assert.equal(manifest.version, lock.packages[''].version, 'Lockfile root version must match.');
assert.ok(manifest.publisher && manifest.publisher !== 'local', 'Set the Marketplace publisher ID.');
assert.ok(fs.readFileSync('CHANGELOG.md', 'utf8').includes(`## ${manifest.version}\n`), 'Add this release to CHANGELOG.md.');
for (const file of ['LICENSE', 'README.md', 'CONTRIBUTING.md', 'dist/extension.js', 'dist/csv.js', 'dist/webview/preview.js', 'dist/webview/preview.css']) {
  assert.ok(fs.statSync(file).size > 0, `Missing or empty release file: ${file}`);
}
assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0, 'Runtime dependencies require a packaging review before release.');
console.log(`Release metadata verified: ${manifest.publisher}.${manifest.name}@${manifest.version}`);
