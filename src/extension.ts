import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import { parseCsv, locate, RecordRow } from './csv';

export function activate(context: vscode.ExtensionContext): void {
  const previews = new Map<string, { panel: vscode.WebviewPanel; document: vscode.TextDocument; refresh: () => void; resetWidths: () => void }>();
  let lastPreviewKey: string | undefined;
  let lastEditor = vscode.window.activeTextEditor;
  const isCsv = (doc: vscode.TextDocument) => doc.languageId === 'csv' || /\.csv$/i.test(doc.uri.path);
  const config = (uri?: vscode.Uri) => vscode.workspace.getConfiguration('csvPreview', uri);
  const open = async (side: boolean, uri?: vscode.Uri) => {
    const document = uri ? await vscode.workspace.openTextDocument(uri) : (vscode.window.activeTextEditor ?? lastEditor)?.document;
    if (!document || !isCsv(document)) { void vscode.window.showInformationMessage('Open a CSV file first.'); return; }
    const key = document.uri.toString();
    const existing = previews.get(key);
    const column = side ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active;
    if (existing) { existing.panel.reveal(column, side); return; }
    const panel = vscode.window.createWebviewPanel('csvPreview', `Preview: ${document.uri.path.split('/').pop()}`, { viewColumn: column, preserveFocus: side }, { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')] });
    let widthResetVersion = 0;
    lastPreviewKey = key;
    let rows: RecordRow[] = [], timer: ReturnType<typeof setTimeout> | undefined;
    let editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === key) ?? (lastEditor?.document.uri.toString() === key ? lastEditor : undefined);
    const sync = (reason: 'cursor' | 'scroll') => {
      if (!editor) return;
      const active = locate(rows, document.offsetAt(editor.selection.active));
      const top = locate(rows, document.offsetAt(editor.visibleRanges[0]?.start ?? new vscode.Position(0, 0)));
      void panel.webview.postMessage({ type: 'position', active, top: top.row, reason });
    };
    const refresh = () => {
      rows = parseCsv(document.getText());
      const settings = config(document.uri);
      void panel.webview.postMessage({ type: 'data', widthResetVersion, version: document.version, rows: rows.map(r => r.cells.map(c => c.value)), highlight: settings.get('highlightActiveCell', true), follow: settings.get('followEditor', true), header: settings.get('firstRowAsHeader', true) });
      sync('scroll');
      sync('cursor');
    };
    const resetWidths = () => {
      widthResetVersion++;
      // The next ready/data handshake carries this revision even if the panel is hidden.
      void panel.webview.postMessage({ type: 'resetColumnWidths', widthResetVersion });
    };
    previews.set(key, { panel, document, refresh, resetWidths });
    const disposables = [
      panel.onDidChangeViewState(event => { if (event.webviewPanel.active) lastPreviewKey = key; }),
      panel.webview.onDidReceiveMessage(async message => {
        if (message?.type === 'ready') { refresh(); return; }
        if (message?.type !== 'selectCell' || !Number.isInteger(message.row) || !Number.isInteger(message.column)) return;
        // Do not apply coordinates from an outdated preview while an edit is debounced.
        if (message.version !== document.version) { refresh(); return; }
        const cell = rows[message.row]?.cells[message.column];
        if (!cell) return;
        const position = document.positionAt(cell.start);
        const visible = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === key);
        editor = await vscode.window.showTextDocument(document, { viewColumn: visible?.viewColumn ?? vscode.ViewColumn.Beside, preserveFocus: false, preview: false });
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        sync('cursor');
      }),
      vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.uri.toString() !== key) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(refresh, 120);
      }),
      vscode.window.onDidChangeTextEditorSelection(event => { if (event.textEditor.document.uri.toString() === key) { editor = event.textEditor; sync('cursor'); } }),
      vscode.window.onDidChangeTextEditorVisibleRanges(event => { if (event.textEditor.document.uri.toString() === key) { editor = event.textEditor; sync('scroll'); } })
    ];
    panel.onDidDispose(() => { if (timer) clearTimeout(timer); disposables.forEach(d => d.dispose()); previews.delete(key); });
    const nonce = randomBytes(16).toString('hex');
    const script = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview', 'preview.js'));
    const style = panel.webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview', 'preview.css'));
    // Styles are copied as part of compilation; CSV values are inserted only with textContent.
    panel.webview.html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';"><link rel="stylesheet" href="${style}"></head><body><div id="status" role="status"></div><div id="viewport" tabindex="0" aria-label="CSV preview"><div id="canvas"><table aria-label="CSV data"><colgroup></colgroup><thead></thead><tbody></tbody></table></div></div><div id="column-guide" aria-hidden="true"></div><style nonce="${nonce}" id="layout"></style><script nonce="${nonce}" src="${script}"></script></body></html>`;
  };
  context.subscriptions.push(
    vscode.commands.registerCommand('csvPreview.openSide', (uri?: vscode.Uri) => open(true, uri)),
    vscode.commands.registerCommand('csvPreview.open', (uri?: vscode.Uri) => open(false, uri)),
    vscode.commands.registerCommand('csvPreview.resetColumnWidths', () => {
      // Opening the editor title menu can move focus away from the webview.
      const preview = [...previews.values()].find(p => p.panel.active) ?? (lastPreviewKey ? previews.get(lastPreviewKey) : undefined);
      preview?.resetWidths();
    }),
    vscode.commands.registerCommand('csvPreview.toggleHighlight', async () => {
      const uri = [...previews.values()].find(p => p.panel.active)?.document.uri ?? (vscode.window.activeTextEditor ?? lastEditor)?.document.uri;
      const settings = config(uri);
      await settings.update('highlightActiveCell', !settings.get('highlightActiveCell', true), vscode.ConfigurationTarget.Global);
    }),
    vscode.window.onDidChangeActiveTextEditor(editor => { if (editor && isCsv(editor.document)) lastEditor = editor; }),
    vscode.workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration('csvPreview')) previews.forEach(p => p.refresh()); }),
    { dispose: () => previews.forEach(p => p.panel.dispose()) }
  );
}
