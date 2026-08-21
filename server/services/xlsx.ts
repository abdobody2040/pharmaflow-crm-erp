import ExcelJS from "exceljs";

type ExportCell = string | number | boolean | Date | null | undefined;

export async function rowsToXlsxBase64(
  sheetName: string,
  headers: readonly string[],
  rows: Array<Record<string, ExportCell>>
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PharmaFlow";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = headers.map(header => ({
    header,
    key: header,
    width: Math.min(Math.max(header.length + 3, 14), 40),
  }));
  for (const row of rows) {
    sheet.addRow(
      Object.fromEntries(headers.map(header => [header, row[header] ?? ""]))
    );
  }
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };

  return Buffer.from(await workbook.xlsx.writeBuffer()).toString("base64");
}
