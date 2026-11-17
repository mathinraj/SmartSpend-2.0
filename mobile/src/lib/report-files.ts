import { strToU8, zipSync } from 'fflate';

import { PDF_TRANSACTION_LIMIT, type Cell, type Report, type ReportTable } from '@/db/reports';
import { formatCurrency } from '@/lib/format';

/** Escapes text for HTML and XML, dropping control characters XML 1.0 can't hold. */
function escape(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- PDF (HTML for expo-print) ----------------------------------------------------------------

function pdfCell(value: Cell, money: boolean, currency: string): string {
  if (value === null || value === '') return '';
  if (money && typeof value === 'number') return escape(formatCurrency(value, currency));
  return escape(String(value));
}

function pdfTable(table: ReportTable, currency: string): string {
  const columns = table.pdfColumns ?? table.headers.map((_, i) => i);
  const rows = table.name === 'Transactions' ? table.rows.slice(0, PDF_TRANSACTION_LIMIT) : table.rows;
  const note =
    rows.length < table.rows.length
      ? `<p class="note">Showing the latest ${rows.length} of ${table.rows.length}. The Excel export has all of them.</p>`
      : '';
  const head = columns.map((c) => `<th class="${table.moneyColumns.includes(c) ? 'num' : ''}">${escape(table.headers[c])}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((c) => {
            const money = table.moneyColumns.includes(c);
            return `<td class="${money ? 'num' : ''}">${pdfCell(row[c], money, currency)}</td>`;
          })
          .join('')}</tr>`
    )
    .join('');
  return `<h2>${escape(table.name)}</h2>${note}<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/** An A4-friendly HTML document of the report, styled like the app. */
export function renderReportHtml(report: Report): string {
  const exported = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: sans-serif; color: #2D3436; font-size: 10px; margin: 0; padding: 24px; }
  h1 { color: #6C5CE7; font-size: 20px; margin: 0 0 2px; }
  h2 { font-size: 13px; margin: 18px 0 6px; }
  .meta { color: #636E72; margin: 0; }
  .note { color: #636E72; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { background: #6C5CE7; color: #FFFFFF; text-align: left; padding: 4px 6px; }
  td { padding: 4px 6px; border-bottom: 1px solid #E8ECF4; }
  tbody tr:nth-child(even) td { background: #F5F5FA; }
  .num { text-align: right; white-space: nowrap; }
</style>
</head>
<body>
<h1>${escape(report.title)}</h1>
<p class="meta">${escape(report.subtitle)}</p>
<p class="meta">Exported ${escape(exported)}</p>
${report.tables.map((t) => pdfTable(t, report.currency)).join('\n')}
</body>
</html>`;
}

// ---- Excel (.xlsx, Office Open XML) --------------------------------------------------------------

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const STYLE_HEADER = 1;
const STYLE_MONEY = 2;

function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

function xlsxCell(ref: string, value: Cell, style: number): string {
  const s = style ? ` s="${style}"` : '';
  if (value === null || value === '') return style ? `<c r="${ref}"${s}/>` : '';
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${s}><v>${value}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escape(String(value))}</t></is></c>`;
}

function sheetXml(table: ReportTable): string {
  const widths = table.headers.map((header, c) =>
    Math.min(40, Math.max(header.length, ...table.rows.map((r) => String(r[c] ?? '').length)) + 2)
  );
  const cols = widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join('');
  const header = `<row r="1">${table.headers.map((h, c) => xlsxCell(`${columnName(c)}1`, h, STYLE_HEADER)).join('')}</row>`;
  const rows = table.rows
    .map((row, r) => {
      const n = r + 2;
      const cells = row.map((v, c) => xlsxCell(`${columnName(c)}${n}`, v, table.moneyColumns.includes(c) ? STYLE_MONEY : 0));
      return `<row r="${n}">${cells.join('')}</row>`;
    })
    .join('');
  return `${XML_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${header}${rows}</sheetData></worksheet>`;
}

/** Excel limits sheet names to 31 characters and forbids a few symbols. */
function sheetName(name: string): string {
  return name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31);
}

/** A minimal .xlsx workbook with one sheet per report table. */
export function buildXlsx(report: Report): Uint8Array {
  const sheets = report.tables;
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
        .map(
          (_, i) =>
            `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        )
        .join('')}</Types>`
    ),
    '_rels/.rels': strToU8(
      `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
    ),
    'xl/workbook.xml': strToU8(
      `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map((t, i) => `<sheet name="${escape(sheetName(t.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets></workbook>`
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map(
          (_, i) =>
            `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
        )
        .join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
    ),
    'xl/styles.xml': strToU8(
      `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF6C5CE7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`
    ),
  };
  sheets.forEach((table, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(table));
  });
  return zipSync(files);
}
