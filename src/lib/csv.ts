/**
 * CSV pensado para abrir con doble click en Excel en español (Argentina):
 * separador ";" (Excel AR usa la coma como decimal), BOM UTF-8 para los acentos, y CRLF.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Evita "CSV injection": Excel ejecuta celdas que empiezan con = + - @ como fórmulas.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[";\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(";"));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
