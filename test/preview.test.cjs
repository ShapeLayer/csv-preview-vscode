const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

function preview(saved) {
  class Element {
    constructor(tag) { this.tag = tag; this.dataset = {}; this.children = []; this.events = {}; this.scrollTop = this.scrollLeft = 0; this.clientHeight = 300; this.clientWidth = 600; this.classList = { add() {}, remove() {} }; }
    append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
    replaceChildren(...children) { this.children = []; this.append(...children); }
    setAttribute() {}
    addEventListener(type, handler) { this.events[type] = handler; }
    setPointerCapture() {}
    closest(selector) { if (selector === '.resize' && this.className === 'resize' || selector === '[data-row]' && this.dataset.row !== undefined) return this; return this.parent?.closest(selector) ?? null; }
    getContext() { return { measureText: text => ({ width: text.length * 10 }), font: '' }; }
  }
  const names = ['viewport','canvas','thead','tbody','status','layout','colgroup'];
  const elements = Object.fromEntries(names.map(name => [name, new Element(name)]));
  const messages = [], events = {};
  let state = saved, frames = [];
  const context = vm.createContext({
    document: { getElementById: id => elements[id], querySelector: name => elements[name], createElement: tag => new Element(tag), body: new Element('body'), fonts: { ready: Promise.resolve() } },
    window: { addEventListener: (type, handler) => { events[type] = handler; } },
    acquireVsCodeApi: () => ({ getState: () => state, setState: value => { state = JSON.parse(JSON.stringify(value)); }, postMessage: message => messages.push(message) }),
    getComputedStyle: () => ({ fontSize: '13px', fontFamily: 'sans-serif' }),
    ResizeObserver: class { observe() {} }, MutationObserver: class { observe() {} },
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; }
  });
  vm.runInContext(fs.readFileSync('dist/webview/preview.js', 'utf8'), context);
  return { elements, messages, state: () => state,
    data: rows => events.message({ data: { type: 'data', rows, version: 4, header: true, highlight: true, follow: true } }),
    message: data => events.message({ data }), flush: () => { const pending = frames; frames = []; pending.forEach(fn => fn()); }
  };
}
test('auto widths include all records and cell clicks retain source coordinates', () => {
  const p = preview();
  p.data([['short','b'], ...Array.from({length:100}, () => ['x','y']), ['longest value outside viewport','z']]);
  assert.match(p.elements.layout.textContent, /col:nth-child\(2\)\{width:325px\}/);
  assert.ok(p.elements.tbody.children.length < 40, 'row virtualization stays enabled');
  const row = p.elements.tbody.children[1];
  p.elements.viewport.events.click({ target: row.children[1].children[0] });
  assert.deepEqual(JSON.parse(JSON.stringify(p.messages.at(-1))), { type:'selectCell', row:1, column:0, version:4 });
});
test('drag widths persist across hidden webviews and reset restores auto', () => {
  const p = preview(); p.data([['title'],['long data']]);
  const viewport = p.elements.viewport;
  const handle = p.elements.thead.children[0].children[1].children[1];
  viewport.events.pointerdown({ button:0, target:handle, pointerId:1, clientX:100, preventDefault() {} });
  viewport.events.pointermove({ clientX:200 }); p.flush();
  viewport.events.pointerup({});
  assert.equal(p.state().widths[0], 215);
  viewport.events.click({ target:viewport });
  assert.equal(p.messages.length, 1, 'drag must not select a cell');
  const restored = preview(p.state()); restored.data([['title'],['long data']]);
  assert.match(restored.elements.layout.textContent, /col:nth-child\(2\)\{width:215px\}/);
  restored.message({ type:'resetColumnWidths' });
  assert.match(restored.elements.layout.textContent, /col:nth-child\(2\)\{width:115px\}/);
  assert.deepEqual(restored.state().widths, {});
});

test('hover and drag highlight the full visible column boundary through scrolling', () => {
  const p = preview(); p.data([['title'], ...Array.from({length:100}, () => ['long data'])]);
  const viewport = p.elements.viewport;
  const handle = p.elements.thead.children[0].children[1].children[1];
  viewport.events.pointermove({ target:handle }); p.flush();
  assert.match(p.elements.layout.textContent, /#column-guide\{display:block;left:166px;height:300px\}/);
  viewport.scrollLeft = 20; viewport.events.scroll(); p.flush();
  assert.match(p.elements.layout.textContent, /#column-guide\{display:block;left:146px;height:300px\}/);
  viewport.events.pointerdown({ button:0, target:handle, pointerId:1, clientX:100, preventDefault() {} });
  viewport.events.pointerleave();
  viewport.events.pointermove({ clientX:130 }); p.flush();
  assert.match(p.elements.layout.textContent, /#column-guide\{display:block;left:176px;height:300px\}/);
  viewport.events.pointerup(); viewport.events.pointerleave(); p.flush();
  assert.match(p.elements.layout.textContent, /#column-guide\{display:none\}/);
});
test('reset during a drag cancels the drag and does not restore manual width', () => {
  const p = preview(); p.data([['title'],['long data']]);
  const viewport = p.elements.viewport;
  const handle = p.elements.thead.children[0].children[1].children[1];
  viewport.events.pointerdown({ button:0, target:handle, pointerId:1, clientX:100, preventDefault() {} });
  viewport.events.pointermove({ clientX:200 }); p.flush();
  p.message({ type:'resetColumnWidths', widthResetVersion:1 });
  viewport.events.pointermove({ target:viewport, clientX:300 }); p.flush();
  assert.match(p.elements.layout.textContent, /col:nth-child\(2\)\{width:115px\}/);
  assert.deepEqual(p.state().widths, {});
  assert.equal(p.state().widthResetVersion, 1);
});
test('a missed reset is applied on the next data handshake after a hidden panel returns', () => {
  const p = preview({ top:30, left:10, widths:{0:500}, widthResetVersion:0 });
  p.message({ type:'data', rows:[['title'],['long data']], version:5, widthResetVersion:1, header:true, highlight:true, follow:true });
  assert.match(p.elements.layout.textContent, /col:nth-child\(2\)\{width:115px\}/);
  assert.deepEqual(p.state().widths, {});
  assert.equal(p.state().widthResetVersion, 1);
});
