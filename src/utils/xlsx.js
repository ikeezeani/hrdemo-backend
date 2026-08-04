const ExcelJS = require('exceljs');

/**
 * Builds a worksheet with a bold header row and appends the given rows.
 * columns: [{ header, key, width }]
 * rows: array of plain objects keyed by column `key`
 */
function buildSheet(workbook, sheetName, columns, rows) {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns;
  rows.forEach(r => sheet.addRow(r));
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return sheet;
}

/** Streams an ExcelJS workbook to the response as a downloadable .xlsx file. */
async function sendWorkbook(res, workbook, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

/**
 * Reads the first worksheet of an uploaded .xlsx buffer and returns an array
 * of plain objects, one per data row, keyed by the header row's cell values
 * (trimmed, as-is — so template headers like "employee_code" map directly).
 * Fully blank rows are skipped.
 */
async function parseFirstSheetRows(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headers = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '').trim();
  });

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber];
      if (!key) return;
      let value = cell.value;
      if (value && typeof value === 'object' && value.text !== undefined) value = value.text; // rich text
      obj[key] = value === null || value === undefined ? '' : value;
    });
    const hasData = Object.values(obj).some(v => v !== '' && v !== null && v !== undefined);
    if (hasData) rows.push(obj);
  });

  return rows;
}

module.exports = { buildSheet, sendWorkbook, parseFirstSheetRows };
