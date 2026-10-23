export interface Cell {
  value: string;
  start: number;
  end: number
}

export interface RecordRow {
  cells: Cell[];
  start: number;
  end: number
}

export function parseCsv(text: string): RecordRow[] {
  if (!text.length) return [];

  const rows: RecordRow[] = [];

  let cells: Cell[] = [], value = '', start = 0, rowStart = 0, quoted = false;

  const cell = (end: number) => {
    cells.push({ value, start, end });
    value = '';
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (i === 0 && ch === '\uFEFF') { start = 1; continue; }

    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else if (quoted) quoted = false;
      else if (i === start) quoted = true;
      else value += ch;
    } else if (!quoted && ch === ',') {
      cell(i);
      start = i + 1;
    } else if (!quoted && (ch === '\r' || ch === '\n')) {
      cell(i);
      rows.push({ cells, start: rowStart, end: i });
      cells = [];

      if (ch === '\r' && text[i + 1] === '\n') i++;
      start = rowStart = i + 1;
    } else {
      value += ch;
    }
  }
  if (rowStart < text.length) {
    cell(text.length);
    rows.push({ cells, start: rowStart, end: text.length });
  }
  return rows;
}

export function locate(rows: RecordRow[], offset: number): { row: number; column: number } {
  if (!rows.length) return { row: -1, column: -1 };
  
  let lo = 0, hi = rows.length - 1;
  
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);

    if (rows[mid].start <= offset) lo = mid;
    else hi = mid - 1;
  }

  const cells = rows[lo].cells;
  let column = 0;
  
  while (column + 1 < cells.length && cells[column + 1].start <= offset) column++;
  return { row: lo, column };
}
