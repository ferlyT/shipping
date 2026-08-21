import ExcelJS from "exceljs";

/**
 * Parser untuk file price list (contoh: pl.xlsx, sheet "CS" & "MKT").
 *
 * Dibuat FLEKSIBEL karena kategori barang & tujuan bisa berubah tiap upload.
 * Asumsi yang TETAP dipertahankan (pola umum di file contoh):
 *   - Tiap sheet punya 1+ "blok mode", ditandai baris yang sel kolom A-nya
 *     diawali "BY " (mis. "BY SEA*", "BY AIR*"). Kalau suatu saat nama blok
 *     berubah total (tidak diawali "BY "), parser akan menandainya sebagai
 *     warning, bukan error, dan tetap mencoba jalan.
 *   - Kode cabang (branch: GZ, HK, SG, SH, SZ, YW) ada di baris YANG SAMA
 *     dengan label mode ("BY SEA*"), mulai kolom B dst.
 *   - Baris berikutnya BOLEH berisi transit time (mengandung "±" atau
 *     "day"/"hari") — kalau terdeteksi, disimpan sebagai transitTime.
 *   - Baris-baris berikutnya adalah kategori barang + harga per tujuan,
 *     berhenti begitu kolom A kosong (baris pemisah) atau ketemu blok
 *     "BY " berikutnya.
 *   - Judul di A1 dibaca untuk tanggal price list, format "... yyyy.mm.dd".
 */

export interface ParsedItem {
  sheetType: string;
  mode: string;
  branch: string;
  transitTime: string | null;
  category: string;
  price: number;
}

export interface ParseResult {
  priceDate: Date | null;
  items: ParsedItem[];
  warnings: string[];
  rawSnapshot: Record<string, (string | number | null)[][]>;
  status: "PARSED" | "PARTIAL" | "FAILED";
}

const SHEET_SKIP_PATTERN = /agent/i; // lewati sheet semacam "Agent List (Not Updated)"
const MODE_HEADER_PATTERN = /^BY\s+/i;
const TRANSIT_PATTERN = /(±|hari|day)/i;

function cellText(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v !== null && "text" in (v as any)) {
    return String((v as any).text ?? "");
  }
  if (typeof v === "object" && v !== null && "result" in (v as any)) {
    return String((v as any).result ?? "");
  }
  return String(v).trim();
}

function cellNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const t = cellText(v);
  const n = Number(t.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function tryParsePriceDate(title: string): Date | null {
  // contoh: "Price List 2026.01.25"
  const m = title.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

function rowToArray(worksheet: ExcelJS.Worksheet, rowNum: number, maxCol: number): (string | number | null)[] {
  const row = worksheet.getRow(rowNum);
  const out: (string | number | null)[] = [];
  for (let c = 1; c <= maxCol; c++) {
    const cell = row.getCell(c);
    const num = cellNumber(cell.value);
    const text = cellText(cell.value);
    out.push(text === "" ? null : num !== null && typeof cell.value !== "string" ? num : text);
  }
  return out;
}

export async function parsePriceListWorkbook(buffer: Buffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  const items: ParsedItem[] = [];
  const warnings: string[] = [];
  const rawSnapshot: Record<string, (string | number | null)[][]> = {};
  let priceDate: Date | null = null;
  let anySheetParsed = false;
  let anySheetHadIssue = false;

  for (const worksheet of workbook.worksheets) {
    if (SHEET_SKIP_PATTERN.test(worksheet.name)) continue;

    const maxCol = Math.max(worksheet.columnCount, 12);
    const maxRow = worksheet.rowCount;

    // simpan raw snapshot per sheet dulu, apapun hasil parsing berikutnya
    const rawRows: (string | number | null)[][] = [];
    for (let r = 1; r <= maxRow; r++) {
      rawRows.push(rowToArray(worksheet, r, maxCol));
    }
    rawSnapshot[worksheet.name] = rawRows;

    // cari tanggal price list dari beberapa baris pertama, kolom A
    if (!priceDate) {
      for (let r = 1; r <= Math.min(5, maxRow); r++) {
        const t = cellText(worksheet.getCell(r, 1).value);
        if (t) {
          const d = tryParsePriceDate(t);
          if (d) {
            priceDate = d;
            break;
          }
        }
      }
    }

    const sheetType = worksheet.name.trim();
    let sheetHadBlock = false;

    let r = 1;
    while (r <= maxRow) {
      const colAText = cellText(worksheet.getCell(r, 1).value);

      if (MODE_HEADER_PATTERN.test(colAText)) {
        sheetHadBlock = true;
        const mode = colAText.replace(/\*$/, "").trim();

        // kode tujuan (SG, HK, GZ, ...) ada di baris YANG SAMA dengan label mode,
        // di kolom B dst — bukan di baris berikutnya.
        const modeRow = worksheet.getRow(r);
        const branches: { col: number; code: string }[] = [];
        for (let c = 2; c <= maxCol; c++) {
          const t = cellText(modeRow.getCell(c).value);
          if (t) branches.push({ col: c, code: t });
        }
        if (branches.length === 0) {
          warnings.push(`[${sheetType}] Blok "${mode}" di baris ${r}: tidak ada kode cabang di baris yang sama, blok dilewati.`);
          r += 1;
          continue;
        }

        // baris transit time (opsional) = baris tepat di bawah label mode
        let nextRowNum = r + 1;
        let transitMap: Record<number, string> = {};
        if (nextRowNum <= maxRow) {
          const candidate = worksheet.getRow(nextRowNum);
          const candidateColA = cellText(candidate.getCell(1).value);
          const looksLikeTransitRow =
            !colAHasCategoryShape(candidateColA) &&
            branches.some((d) => TRANSIT_PATTERN.test(cellText(candidate.getCell(d.col).value)));
          if (looksLikeTransitRow) {
            for (const d of branches) {
              const t = cellText(candidate.getCell(d.col).value);
              if (t) transitMap[d.col] = t;
            }
            nextRowNum += 1;
          }
        }

        // baris kategori + harga, sampai baris kosong atau blok "BY " berikutnya
        let cur = nextRowNum;
        let categoryCount = 0;
        while (cur <= maxRow) {
          const rowColA = cellText(worksheet.getCell(cur, 1).value);
          if (!rowColA) break; // baris kosong = akhir blok
          if (MODE_HEADER_PATTERN.test(rowColA)) break; // blok baru mulai

          const category = rowColA;
          const dataRow = worksheet.getRow(cur);
          let gotAny = false;
          for (const d of branches) {
            const price = cellNumber(dataRow.getCell(d.col).value);
            // Harga 0 di file sumber biasanya berarti "rute belum/tidak
            // ditawarkan", bukan harga beneran Rp 0 — jadi dilewati supaya
            // tidak mencemari trend/KPI dashboard
            if (price !== null && price !== 0) {
              items.push({
                sheetType,
                mode,
                branch: d.code,
                transitTime: transitMap[d.col] ?? null,
                category,
                price,
              });
              gotAny = true;
            }
          }
          if (gotAny) categoryCount += 1;
          cur += 1;
        }

        if (categoryCount === 0) {
          warnings.push(`[${sheetType}] Blok "${mode}" di baris ${r}: tidak ada baris kategori dengan harga ditemukan.`);
        }
        r = cur;
      } else {
        r += 1;
      }
    }

    if (sheetHadBlock) anySheetParsed = true;
    else {
      anySheetHadIssue = true;
      warnings.push(`Sheet "${worksheet.name}" tidak ditemukan blok mode (baris yang diawali "BY ..."). Data mentah tetap disimpan di rawSnapshot.`);
    }
  }

  let status: ParseResult["status"] = "PARSED";
  if (!anySheetParsed) status = "FAILED";
  else if (anySheetHadIssue || warnings.length > 0) status = "PARTIAL";

  return { priceDate, items, warnings, rawSnapshot, status };
}

function colAHasCategoryShape(text: string): boolean {
  return text.length > 15 && !TRANSIT_PATTERN.test(text);
}
