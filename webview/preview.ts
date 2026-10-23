declare function acquireVsCodeApi(): { postMessage(message: unknown): void; getState(): { top: number; left: number; widths?: Record<string, number>; widthResetVersion?: number } | undefined; setState(state: unknown): void };
const api = acquireVsCodeApi();
const viewport = document.getElementById('viewport')!;
const canvas = document.getElementById('canvas')!;
const head = document.querySelector('thead')!;
const body = document.querySelector('tbody')!;
const statusElement = document.getElementById('status')!;
const layout = document.getElementById('layout')!;
let rows: string[][] = [], highlight = true, follow = true, header = true;
let active = { row: -1, column: -1 }, columns = 0, frame = 0;
const height = 30;
let version = 0;
let widthResetVersion = api.getState()?.widthResetVersion ?? 0;
let hoveredColumn: number | undefined;
let manualWidths: Record<string, number> = api.getState()?.widths ?? {};
let autoWidths: number[] = [];
let drag: { column: number; x: number; width: number } | undefined;
let suppressClick = false;
const measure = document.createElement('canvas').getContext('2d')!;
function save(): void { api.setState({ top: viewport.scrollTop, left: viewport.scrollLeft, widths: manualWidths, widthResetVersion }); }
function width(column: number): number { return manualWidths[column] ?? autoWidths[column] ?? 40; }
function calculateWidths(): void {
  const style = getComputedStyle(document.body);
  const font = `${style.fontSize} ${style.fontFamily}`;
  autoWidths = Array(columns).fill(40);
  rows.forEach((row, index) => {
    measure.font = `${header && index === 0 ? '600' : '400'} ${font}`;
    row.forEach((value, column) => {
      // Match the table's collapsed whitespace, including multiline CSV fields.
      const pixels = measure.measureText(value.replace(/[ \t\r\n\f]+/g, ' ')).width;
      autoWidths[column] = Math.max(autoWidths[column], Math.ceil(pixels) + 25);
    });
  });
}
function guideLayout(): string {
  const column = drag?.column ?? hoveredColumn;
  if (column === undefined) return '#column-guide{display:none}';
  const x = 52 + Array.from({ length: column + 1 }, (_, col) => width(col)).reduce((a, b) => a + b, 0) - viewport.scrollLeft;
  const visible = x > 52 && x <= viewport.clientWidth;
  const guideHeight = Math.max(0, Math.min(viewport.clientHeight, rows.length * height - viewport.scrollTop));
  return `#column-guide{display:${visible ? 'block' : 'none'};left:${x - 1}px;height:${guideHeight}px}`;
}
function resetWidths(revision: number): void {
  // A reset during a drag must also stop future pointermove events restoring its width.
  endDrag();
  hoveredColumn = undefined;
  widthResetVersion = revision;
  manualWidths = {};
  calculateWidths(); render(); save();
}
function columnLayout(): string {
  return `table{width:${52 + Array.from({ length: columns }, (_, col) => width(col)).reduce((a, b) => a + b, 0)}px}col:first-child{width:52px}` +
    Array.from({ length: columns }, (_, col) => `col:nth-child(${col + 2}){width:${width(col)}px}`).join('');
}

function render(): void {
  frame = 0;
  const first = header && rows.length ? 1 : 0;
  const start = Math.min(rows.length, Math.max(first, Math.floor(viewport.scrollTop / height) + first - 8));
  const end = Math.min(rows.length, start + Math.ceil(viewport.clientHeight / height) + 18);
  const colgroup = document.querySelector('colgroup')!;
  colgroup.replaceChildren(...Array.from({ length: columns + 1 }, () => document.createElement('col')));
  head.replaceChildren();
  body.replaceChildren();
  const makeRow = (index: number, heading: boolean) => {
    const tr = document.createElement('tr');
    const number = document.createElement('th');
    number.className = 'number'; number.scope = 'row'; number.textContent = String(index + 1); tr.append(number);
    for (let col = 0; col < columns; col++) {
      const cell = document.createElement(heading ? 'th' : 'td');
      if (heading) (cell as HTMLTableCellElement).scope = 'col';
      cell.dataset.row = String(index); cell.dataset.column = String(col);
      const content = document.createElement('span'); content.className = 'content';
      content.textContent = rows[index][col] ?? ''; cell.append(content);
      const handle = document.createElement('span'); handle.className = 'resize';
      handle.dataset.column = String(col); handle.setAttribute('aria-hidden', 'true'); cell.append(handle);
      cell.title = rows[index][col] ?? '';
      if (highlight && active.row === index && active.column === col) { cell.className = 'active'; cell.setAttribute('aria-current', 'true'); }
      tr.append(cell);
    }
    return tr;
  };
  if (first) head.append(makeRow(0, true));
  const spacer = (className: string) => {
    const tr = document.createElement('tr'); tr.className = className; tr.setAttribute('aria-hidden', 'true');
    const td = document.createElement('td'); td.colSpan = columns + 1; tr.append(td); return tr;
  };
  body.append(spacer('before'));
  for (let row = start; row < end; row++) body.append(makeRow(row, false));
  body.append(spacer('after'));
  layout.textContent = `.before,.before td{height:${Math.max(0, start - first) * height}px!important}.after,.after td{height:${Math.max(0, rows.length - end) * height}px!important}${columnLayout()}${guideLayout()}`;
  canvas.setAttribute('aria-rowcount', String(rows.length));
}
function schedule(): void { if (!frame) frame = requestAnimationFrame(render); }
viewport.addEventListener('scroll', () => { schedule(); save(); }, { passive: true });
new ResizeObserver(schedule).observe(viewport);
window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data;
  if (message.type === 'data') {
    rows = message.rows; highlight = message.highlight; follow = message.follow; header = message.header;
    version = message.version;
    columns = rows.reduce((max, row) => Math.max(max, row.length), 0);
    if ((message.widthResetVersion ?? 0) !== widthResetVersion) {
      endDrag(); manualWidths = {}; widthResetVersion = message.widthResetVersion ?? 0;
    }
    calculateWidths();
    statusElement.textContent = rows.length ? `${rows.length.toLocaleString()} rows · ${columns.toLocaleString()} columns` : 'This CSV file is empty.';
    render();
    const saved = api.getState();
    if (saved) { viewport.scrollTop = saved.top; viewport.scrollLeft = saved.left; }
    save();
  } else if (message.type === 'resetColumnWidths') {
    resetWidths(message.widthResetVersion ?? widthResetVersion + 1);
  } else if (message.type === 'position') {
    active = message.active;
    if (follow) {
      const first = header && rows.length ? 1 : 0;
      if (message.reason === 'scroll') viewport.scrollTop = Math.max(0, message.top - first) * height;
      else if (active.row >= first) {
        const y = (active.row - first) * height;
        const visibleHeight = Math.max(height, viewport.clientHeight - first * height);
        if (y < viewport.scrollTop) viewport.scrollTop = y;
        else if (y + height > viewport.scrollTop + visibleHeight) viewport.scrollTop = y + height - visibleHeight;
      }
      if (message.reason === 'cursor' && highlight && active.column >= 0) {
        const x = 52 + Array.from({ length: active.column }, (_, col) => width(col)).reduce((a, b) => a + b, 0);
        if (x < viewport.scrollLeft + 52) viewport.scrollLeft = x - 52;
        else if (x + width(active.column) > viewport.scrollLeft + viewport.clientWidth) viewport.scrollLeft = x + width(active.column) - viewport.clientWidth;
      }
    }
    schedule();
  }
});
viewport.addEventListener('click', event => {
  if (suppressClick) { suppressClick = false; return; }
  const target = event.target as HTMLElement;
  if (target.closest('.resize')) return;
  const cell = target.closest<HTMLElement>('[data-row]');
  if (!cell) return;
  const row = Number(cell.dataset.row), column = Number(cell.dataset.column);
  if (rows[row]?.[column] === undefined) return;
  api.postMessage({ type: 'selectCell', row, column, version });
});
viewport.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  const handle = (event.target as HTMLElement).closest<HTMLElement>('.resize');
  if (!handle) { suppressClick = false; return; }
  const column = Number(handle.dataset.column);
  drag = { column, x: event.clientX, width: width(column) };
  suppressClick = true;
  viewport.setPointerCapture(event.pointerId);
  document.body.classList.add('resizing');
  schedule();
  event.preventDefault();
});
viewport.addEventListener('pointermove', event => {
  if (!drag) {
    const handle = (event.target as HTMLElement).closest<HTMLElement>('.resize');
    const next = handle ? Number(handle.dataset.column) : undefined;
    if (next !== hoveredColumn) { hoveredColumn = next; schedule(); }
    return;
  }
  manualWidths[drag.column] = Math.max(40, Math.round(drag.width + event.clientX - drag.x));
  schedule();
});
function endDrag(): void { if (!drag) return; drag = undefined; document.body.classList.remove('resizing'); save(); schedule(); }
viewport.addEventListener('pointerleave', () => { hoveredColumn = undefined; schedule(); });
viewport.addEventListener('pointerup', endDrag);
viewport.addEventListener('pointercancel', endDrag);
viewport.addEventListener('lostpointercapture', endDrag);
// VS Code can change font metrics when the theme or accessibility settings change.
new MutationObserver(() => { calculateWidths(); schedule(); }).observe(document.body, { attributes: true, attributeFilter: ['style'] });
void document.fonts.ready.then(() => { calculateWidths(); schedule(); });
api.postMessage({ type: 'ready' });
