const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
test('preview commands, editor sync, options and disposal', async () => {
  const handlers = {}, commands = {}, panels = [], configs = { highlightActiveCell: true, followEditor: true };
  const listen = name => callback => { handlers[name] = callback; return { dispose() { delete handlers[name]; } }; };
  const uri = { path: '/sample.csv', toString: () => 'file:///sample.csv' };
  const document = { uri, languageId: 'csv', version: 1, positionAt: offset => ({ line: Math.floor(offset / 4), character: offset % 4 }), getText: () => 'a,b\nx,y', offsetAt: p => p.line * 4 + p.character };
  const editor = { document, selection: { active: { line: 1, character: 2 } }, visibleRanges: [{ start: { line: 1, character: 0 } }] };
  editor.viewColumn = 1; editor.revealRange = range => { editor.revealedRange = range; };
  const mock = {
    Uri: { joinPath: (_base, ...parts) => parts.join('/') },
    Position: class { constructor(line, character) { this.line = line; this.character = character; } },
    Selection: class { constructor(anchor, active) { this.anchor = anchor; this.active = active; } },
    Range: class { constructor(start, end) { this.start = start; this.end = end; } },
    TextEditorRevealType: { InCenterIfOutsideViewport: 2 },
    ViewColumn: { Beside: -2, Active: -1 }, ConfigurationTarget: { Global: 1 },
    commands: { registerCommand(name, handler) { commands[name] = handler; return { dispose() {} }; } },
    workspace: {
      getConfiguration: () => ({ get: (key, fallback) => configs[key] ?? fallback, update: async (key, value) => { configs[key] = value; } }),
      openTextDocument: async () => document,
      onDidChangeTextDocument: listen('edit'), onDidChangeConfiguration: listen('config')
    },
    window: {
      activeTextEditor: editor, visibleTextEditors: [editor],
      onDidChangeActiveTextEditor: listen('active'), onDidChangeTextEditorSelection: listen('selection'), onDidChangeTextEditorVisibleRanges: listen('scroll'),
      showInformationMessage() {},
      async showTextDocument(doc, options) { assert.equal(doc, document); editor.shown = options; return editor; },
      createWebviewPanel(type, title, options, security) {
        const panel = { type, title, options, security, messages: [], active: true,
          webview: { cspSource: 'vscode-webview:', asWebviewUri: x => x, onDidReceiveMessage: listen('message'), postMessage: message => { panel.messages.push(message); return Promise.resolve(true); } },
          onDidChangeViewState: listen('viewState'),
          onDidDispose: handler => { panel.dispose = handler; }, reveal: (...args) => { panel.revealed = args; }
        };
        panels.push(panel); return panel;
      }
    }
  };
  const original = Module._load;
  Module._load = function(name, ...args) { return name === 'vscode' ? mock : original.call(this, name, ...args); };
  let activate;
  try { ({ activate } = require('../dist/extension')); } finally { Module._load = original; }
  const context = { extensionUri: '/extension', subscriptions: [] };
  activate(context);
  await commands['csvPreview.openSide']();
  assert.equal(panels[0].options.viewColumn, -2);
  assert.equal(panels[0].security.enableScripts, true);
  assert.equal(panels[0].security.retainContextWhenHidden, undefined);
  handlers.message({ type: 'ready' });
  assert.deepEqual(panels[0].messages[0].rows, [['a','b'],['x','y']]);
  assert.deepEqual(panels[0].messages.at(-1).active, { row: 1, column: 1 });
  handlers.scroll({ textEditor: editor });
  assert.equal(panels[0].messages.at(-1).reason, 'scroll');
  assert.equal(panels[0].messages.at(-1).top, 1);
  await commands['csvPreview.toggleHighlight'](); handlers.config({ affectsConfiguration: () => true });
  assert.equal(panels[0].messages.at(-3).highlight, false);
  await commands['csvPreview.open']();
  assert.equal(panels.length, 1); assert.deepEqual(panels[0].revealed, [-1, false]);
  await handlers.message({ type: 'selectCell', row: 1, column: 0, version: 1 });
  assert.deepEqual(editor.selection.active, { line: 1, character: 0 });
  assert.equal(editor.shown.viewColumn, 1);
  assert.deepEqual(editor.revealedRange.start, editor.selection.active);
  await handlers.message({ type: 'selectCell', row: 1, column: 1, version: 0 });
  assert.deepEqual(editor.selection.active, { line: 1, character: 0 }, 'stale selection rejected');
  await handlers.message({ type: 'selectCell', row: 999, column: 0, version: 1 });
  assert.deepEqual(editor.selection.active, { line: 1, character: 0 }, 'invalid cell ignored');
  mock.window.visibleTextEditors = [];
  await handlers.message({ type: 'selectCell', row: 1, column: 1, version: 1 });
  assert.equal(editor.shown.viewColumn, -2, 'hidden source opens beside preview');
  panels[0].active = false; // Editor title menu has taken focus away.
  await commands['csvPreview.resetColumnWidths']();
  assert.equal(panels[0].messages.at(-1).type, 'resetColumnWidths');
  assert.equal(panels[0].messages.at(-1).widthResetVersion, 1);
  await handlers.message({ type: 'ready' });
  assert.equal(panels[0].messages.at(-3).widthResetVersion, 1, 'reset survives a hidden webview');
  panels[0].dispose();
  assert.equal(handlers.selection, undefined); assert.equal(handlers.scroll, undefined);
  await commands['csvPreview.open'](); assert.equal(panels.length, 2);
  context.subscriptions.at(-1).dispose();
});
