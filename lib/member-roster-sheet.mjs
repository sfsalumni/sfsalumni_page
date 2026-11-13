/**
 * Read the Unique Records sheet from sfs1.xlsx (or compatible workbook).
 * Reuses the same zip/xml approach as alumni-import (no openpyxl).
 */
import { inflateRawSync } from 'node:zlib';

function decodeXml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');
}

function unzip(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error('Choose an .xlsx workbook');
  const count = buf.readUInt16LE(eocd + 10);
  let cursor = buf.readUInt32LE(eocd + 16);
  const files = new Map();
  for (let index = 0; index < count; index += 1) {
    if (buf.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Choose an .xlsx workbook');
    const method = buf.readUInt16LE(cursor + 10);
    const size = buf.readUInt32LE(cursor + 20);
    const nameLength = buf.readUInt16LE(cursor + 28);
    const extraLength = buf.readUInt16LE(cursor + 30);
    const commentLength = buf.readUInt16LE(cursor + 32);
    const localOffset = buf.readUInt32LE(cursor + 42);
    const name = buf.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    const localNameLength = buf.readUInt16LE(localOffset + 26);
    const localExtraLength = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buf.subarray(start, start + size);
    files.set(name, method === 0 ? compressed : inflateRawSync(compressed));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function sharedStrings(xml) {
  const strings = [];
  for (const item of xml.match(/<si\b[^>]*>[\s\S]*?<\/si>/g) || []) {
    const parts = [...item.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1]));
    strings.push(parts.join(''));
  }
  return strings;
}

function sheetCells(xml, strings) {
  const rows = [];
  for (const row of xml.match(/<row\b[^>]*>[\s\S]*?<\/row>/g) || []) {
    const cells = {};
    for (const match of row.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /r="([A-Z]+)\d+"/.exec(match[1]);
      if (!ref) continue;
      const type = /t="([^"]+)"/.exec(match[1])?.[1] || '';
      const body = match[2] || '';
      if (type === 'inlineStr') {
        const text = /<t\b[^>]*>([\s\S]*?)<\/t>/.exec(body);
        cells[ref[1]] = text ? decodeXml(text[1]) : '';
        continue;
      }
      const value = /<v>([\s\S]*?)<\/v>/.exec(body);
      if (!value) {
        cells[ref[1]] = '';
        continue;
      }
      cells[ref[1]] = type === 's' ? strings[Number(value[1])] || '' : decodeXml(value[1]);
    }
    rows.push(cells);
  }
  return rows;
}

function colLetters(index) {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Locate Unique Records sheet path via workbook.xml. */
function uniqueRecordsSheetPath(files) {
  const workbookXml = files.get('xl/workbook.xml')?.toString('utf8') || '';
  const relsXml = files.get('xl/_rels/workbook.xml.rels')?.toString('utf8') || '';
  const sheetMatch = [...workbookXml.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)];
  const target = sheetMatch.find((m) => /unique\s*records/i.test(m[1]));
  if (!target) throw new Error('Workbook has no "Unique Records" sheet');
  const rid = target[2];
  const rel = new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`).exec(relsXml);
  if (!rel) throw new Error('Could not resolve Unique Records sheet path');
  const targetPath = rel[1].replace(/^\//, '');
  return targetPath.startsWith('xl/') ? targetPath : `xl/${targetPath}`;
}

/**
 * Returns objects keyed by Unique Records header names.
 * @param {Buffer} buffer
 */
export function readUniqueRecordsSheet(buffer) {
  const files = unzip(buffer);
  const sheetPath = uniqueRecordsSheetPath(files);
  const sharedName = [...files.keys()].find((name) => name.endsWith('sharedStrings.xml'));
  const strings = sharedName ? sharedStrings(files.get(sharedName).toString('utf8')) : [];
  const rows = sheetCells(files.get(sheetPath).toString('utf8'), strings);
  if (!rows.length) return [];

  const headerRow = rows[0];
  const headers = [];
  for (let i = 0; i < 40; i += 1) {
    const letter = colLetters(i);
    const title = String(headerRow[letter] || '').trim();
    if (!title && i > 5) break;
    headers.push({ letter, title });
  }
  if (!headers.some((h) => /record\s*id/i.test(h.title))) {
    throw new Error('Unique Records sheet is missing a Record ID column');
  }

  return rows.slice(1).flatMap((row) => {
    const record = {};
    let blank = true;
    for (const { letter, title } of headers) {
      if (!title) continue;
      const value = row[letter] ?? '';
      record[title] = value;
      if (String(value).trim() !== '') blank = false;
    }
    return blank ? [] : [record];
  });
}
