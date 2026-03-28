import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

const PRIMARY_COLOR = [108, 92, 231];

export async function captureChartAsImage(element) {
  if (!element) return null;
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: 2,
    logging: false,
    useCORS: true,
  });
  return canvas.toDataURL('image/png');
}

export function exportToPDF({ title, subtitle, tables = [], chartImages = [], filename }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 16;

  doc.setFontSize(18);
  doc.setTextColor(...PRIMARY_COLOR);
  doc.text(title || 'SpendTrak Report', 14, y);
  y += 7;

  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(subtitle, 14, y);
    y += 6;
  }

  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(`Exported ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, 14, y);
  y += 10;

  for (const img of chartImages) {
    if (!img.data) continue;
    if (y + img.height + 10 > doc.internal.pageSize.getHeight() - 10) {
      doc.addPage();
      y = 14;
    }
    if (img.label) {
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(img.label, 14, y);
      y += 6;
    }
    const imgW = Math.min(pageW - 28, img.width || pageW - 28);
    const imgH = img.height || 60;
    doc.addImage(img.data, 'PNG', 14, y, imgW, imgH);
    y += imgH + 8;
  }

  for (const table of tables) {
    if (y + 20 > doc.internal.pageSize.getHeight() - 10) {
      doc.addPage();
      y = 14;
    }
    if (table.title) {
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text(table.title, 14, y);
      y += 6;
    }
    autoTable(doc, {
      startY: y,
      head: [table.headers],
      body: table.rows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: PRIMARY_COLOR, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 250] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  doc.save(filename || `spendtrak-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportToXLSX({ sheets, filename }) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    const colWidths = sheet.headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...sheet.rows.map((r) => String(r[i] ?? '').length)
      );
      return { wch: Math.min(maxLen + 2, 30) };
    });
    ws['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename || `spendtrak-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportToXLSXWithCharts({ sheets, chartImages = [], filename }) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SpendTrak';
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31));
    ws.addRow(sheet.headers);
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C5CE7' } };
    for (const row of sheet.rows) ws.addRow(row);
    ws.columns.forEach((col) => { col.width = 16; });
  }

  if (chartImages.length > 0) {
    const ws = wb.addWorksheet('Charts');
    let rowOffset = 1;
    for (const img of chartImages) {
      if (!img.data) continue;
      if (img.label) {
        ws.getCell(`A${rowOffset}`).value = img.label;
        ws.getCell(`A${rowOffset}`).font = { bold: true, size: 12 };
        rowOffset += 1;
      }
      const imageId = wb.addImage({ base64: img.data.split(',')[1], extension: 'png' });
      ws.addImage(imageId, {
        tl: { col: 0, row: rowOffset - 1 },
        ext: { width: 600, height: 300 },
      });
      rowOffset += 18;
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `spendtrak-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
