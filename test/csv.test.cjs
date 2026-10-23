const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, locate } = require('../dist/csv');
const values = text => parseCsv(text).map(row => row.cells.map(cell => cell.value));
test('commas, CRLF, empty values and trailing newline', () => {
  assert.deepEqual(values('name,value\r\nhello,\r\n,a\r\n'), [['name','value'],['hello',''],['','a']]);
  assert.deepEqual(values('a,'), [['a','']]);
  assert.deepEqual(values(''), []);
  assert.deepEqual(values('\n'), [['']]);
});
test('quoted commas, escaped quotes, multiline fields and BOM', () => {
  assert.deepEqual(values('\uFEFF"a,b","say ""hello"""\r\n"x\r\ny",z'), [['a,b','say "hello"'],['x\r\ny','z']]);
});
test('source offsets identify multiline cells and separator boundaries', () => {
  const text = 'a,"b\nc",d\r\nx,y,z';
  const rows = parseCsv(text);
  for (const offset of [2,3,4,5,6]) assert.deepEqual(locate(rows,offset), {row:0,column:1});
  assert.deepEqual(locate(rows,1), {row:0,column:0});
  assert.deepEqual(locate(rows,7), {row:0,column:1});
  assert.deepEqual(locate(rows,8), {row:0,column:2});
  assert.deepEqual(locate(rows,11), {row:1,column:0});
  assert.deepEqual(locate(rows,text.length), {row:1,column:2});
  assert.deepEqual(locate([],0), {row:-1,column:-1});
});
test('unfinished quoted input remains previewable during edits', () => {
  assert.deepEqual(values('a,"unfinished\nvalue'), [['a','unfinished\nvalue']]);
});
test('CSV text is preserved as data, including markup', () => {
  assert.deepEqual(values('<script>alert(1)</script>,&hello'), [['<script>alert(1)</script>','&hello']]);
});
