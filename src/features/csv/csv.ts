/**
 * Small RFC 4180 CSV reader/writer.
 * - Handles quoted fields, escaped quotes (""), CR/LF line endings and line
 *   breaks inside quotes, and a UTF-8 BOM.
 * - Auto-detects ";" (Excel with Uzbek/Russian regional settings) vs ",".
 */
export type Delimiter = ',' | ';';

export function detectDelimiter(text: string): Delimiter {
  const firstLine = stripBom(text).split(/\r?\n/, 1)[0] ?? '';
  let commas = 0;
  let semis = 0;
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch === ',') commas++;
    else if (!inQuotes && ch === ';') semis++;
  }
  return semis > commas ? ';' : ',';
}

const stripBom = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);

export function parseCsv(input: string, delimiter: Delimiter = detectDelimiter(input)): string[][] {
  const text = stripBom(input);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    if (row.some((f) => f.trim() !== '')) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        field += ch;
      }
      i++;
      continue;
    }
    if (ch === '"' && field === '') inQuotes = true;
    else if (ch === delimiter) endField();
    else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      endRow();
    } else if (ch === '\n') endRow();
    else field += ch;
    i++;
  }
  if (field !== '' || row.length) endRow();
  return rows;
}

/** Prevents spreadsheet formula injection when the file is opened in Excel. */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/** Reverses `neutralizeFormula` on import. */
export function restoreFormula(value: string): string {
  return /^'[=+\-@]/.test(value) ? value.slice(1) : value;
}

export function toCsv(rows: (string | number | boolean | null | undefined)[][], delimiter: Delimiter = ','): string {
  const escape = (v: string | number | boolean | null | undefined) => {
    const s = neutralizeFormula(v == null ? '' : String(v));
    return /["\r\n]/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM so Excel opens UTF-8 (Uzbek characters) correctly.
  return '﻿' + rows.map((r) => r.map(escape).join(delimiter)).join('\r\n') + '\r\n';
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
