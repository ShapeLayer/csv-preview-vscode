const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { version } = require('../package.json');
const script = path.resolve(__dirname, '../scripts/check-release.cjs');

function checkChangelog(content) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'csv-preview-release-'));
  try {
    fs.writeFileSync(path.join(directory, 'CHANGELOG.md'), content);
    for (const file of ['LICENSE', 'README.md', 'CONTRIBUTING.md', 'dist/extension.js', 'dist/csv.js', 'dist/webview/preview.js', 'dist/webview/preview.css']) {
      const target = path.join(directory, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.resolve(__dirname, '..', file), target);
    }
    return spawnSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

for (const [name, newline] of [['LF', '\n'], ['CRLF', '\r\n'], ['CR', '\r']]) {
  test(`release check accepts ${name} changelog line endings`, () => {
    const result = checkChangelog(['# Changelog', '', `## ${version}`, '', '- Initial release.', ''].join(newline));
    assert.equal(result.status, 0, result.stderr);
  });
}

test('release check accepts a version heading at end of file', () => {
  const result = checkChangelog(`# Changelog\n\n## ${version}`);
  assert.equal(result.status, 0, result.stderr);
});

test('release check rejects text that is not the exact release heading', () => {
  for (const heading of [`### ${version}`, `## ${version}.1`, `Mention ## ${version}`]) {
    const result = checkChangelog(`# Changelog\r\n\r\n${heading}\r\n`);
    assert.notEqual(result.status, 0, heading);
    assert.match(result.stderr, /Add this release to CHANGELOG\.md\./);
  }
});
