// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import { ENERGYOS_INTEGRITY_ASSERTION } from "./constants.ts";
import type { AlignedRecord, RawEnergyRecord, TariffConfig } from "./types.ts";
import { DEFAULT_ARERA_TARIFF } from "./constants.ts";

/** Detects CSV separator based on header frequency */
export function detectSeparator(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  if (semicolons > commas && semicolons > tabs) return ";";
  if (tabs > commas && tabs > semicolons) return "\t";
  return ",";
}

/** Parses floating point number respecting European comma notation */
export function parseNumberSafe(val: unknown): number {
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  if (typeof val !== "string") return 0;
  const cleaned = val.trim().replace(/\s+/g, "").replace(/€|kWh|kW|Wh|W/gi, "");
  if (!cleaned) return 0;
  // If string has comma and no dot, replace comma with dot
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    const num = parseFloat(cleaned.replace(",", "."));
    return Number.isFinite(num) ? num : 0;
  }
  // If string has both, treat dot as thousand separator if dot comes before comma
  if (cleaned.includes(".") && cleaned.includes(",")) {
    if (cleaned.indexOf(".") < cleaned.indexOf(",")) {
      const num = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
      return Number.isFinite(num) ? num : 0;
    }
  }
  const num = parseFloat(cleaned.replace(/,/g, ""));
  return Number.isFinite(num) ? num : 0;
}

/** Robust date string parser for ISO, European and localized formats */
export function parseDateSafe(val: string): Date {
  const str = val.trim();
  // Check unix timestamp in seconds or milliseconds
  if (/^\d{10,13}$/.test(str)) {
    const n = Number(str);
    return new Date(str.length === 10 ? n * 1000 : n);
  }

  // European format: DD/MM/YYYY, DD-MM-YYYY or DD.MM.YYYY [HH:mm[:ss]]
  const euMatch = str.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (euMatch && euMatch[1] && euMatch[2] && euMatch[3]) {
    const day = parseInt(euMatch[1], 10);
    const month = parseInt(euMatch[2], 10) - 1;
    const year = parseInt(euMatch[3], 10);
    const hour = parseInt(euMatch[4] ?? "0", 10);
    const minute = parseInt(euMatch[5] ?? "0", 10);
    const second = parseInt(euMatch[6] ?? "0", 10);
    return new Date(year, month, day, hour, minute, second);
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  throw new Error(`${ENERGYOS_INTEGRITY_ASSERTION}: unparseable date timestamp "${val}"`);
}

/** Splits CSV line respecting quotation */
export function splitCsvLine(line: string, separator: string): string[] {
  const entries: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      entries.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  entries.push(current.trim());
  return entries;
}

/** Parses raw CSV content into generic records */
export function parseCsvContent(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]!);
  const headers = splitCsvLine(lines[0]!, sep).map((h) => h.toLowerCase().replace(/["']/g, "").trim());

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]!, sep);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j]!;
      row[header] = cols[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

/** Discovers semantic roles from column header names */
export function identifyColumns(headers: string[], allowFallback = true): {
  timestampKey: string;
  consumptionKey?: string;
  generationKey?: string;
} {
  let timestampKey = "";
  let consumptionKey: string | undefined;
  let generationKey: string | undefined;

  for (const h of headers) {
    const low = h.toLowerCase();
    if (!timestampKey && (low.includes("time") || low.includes("date") || low.includes("data") || low.includes("giorno") || low === "dt")) {
      timestampKey = h;
    } else if (!generationKey && (low.includes("prod") || low.includes("generat") || low.includes("solar") || low.includes("fotovolt") || low.includes("immess") || low.includes("export") || low === "g_kwh" || low === "pv")) {
      generationKey = h;
    } else if (!consumptionKey && (low.includes("consum") || low.includes("preliev") || low.includes("load") || low.includes("import") || low.includes("attiva") || low.includes("energy") || low.includes("energia") || low.includes("power") || low === "c_kwh" || low === "kwh_in")) {
      consumptionKey = h;
    }
  }

  // Fallbacks if not uniquely matched and allowed
  if (allowFallback) {
    if (!timestampKey && headers.length > 0) timestampKey = headers[0]!;
    if (!consumptionKey && headers.length > 1) consumptionKey = headers[1]!;
    if (!generationKey && headers.length > 2) generationKey = headers[2]!;
  }

  return { timestampKey, consumptionKey, generationKey };
}

/** Detects physical unit from column header name */
export function detectColumnUnit(headerName?: string): "kwh" | "wh" | "kw" | "w" {
  if (!headerName) return "kwh";
  const low = headerName.toLowerCase();
  if (low.includes("kwh")) return "kwh";
  if (low.includes("wh")) return "wh";
  if (low.includes("kw") || low.includes("potenza")) return "kw";
  if (low.includes("power") || low.includes("(w)") || low.includes("[w]")) return "w";
  return "kwh";
}

function convertRawToKWh(rawVal: number, unit: "kwh" | "wh" | "kw" | "w", intervalMinutes: number): number {
  if (unit === "wh") return rawVal / 1000;
  if (unit === "w") return (rawVal / 1000) * (intervalMinutes / 60);
  if (unit === "kw") return rawVal * (intervalMinutes / 60);
  return rawVal;
}

/** Ingests single or paired CSV streams and normalizes into AlignedRecords */
export function ingestCsvRecords(
  consumptionCsv: string,
  generationCsv?: string
): AlignedRecord[] {
  const consRows = parseCsvContent(consumptionCsv);
  if (consRows.length === 0) return [];

  const headers = Object.keys(consRows[0]!);
  const cols = identifyColumns(headers);

  const consUnit = detectColumnUnit(cols.consumptionKey);
  const genUnit = detectColumnUnit(cols.generationKey);

  const parsedConsumption: Array<{ date: Date; rawVal: number }> = [];
  const parsedDirectGeneration: Array<{ date: Date; rawVal: number }> = [];

  for (const row of consRows) {
    let timeVal = row[cols.timestampKey];
    if (!timeVal) continue;
    if (row["Ora"]) timeVal = `${timeVal} ${row["Ora"]}`;
    else if (row["ora"]) timeVal = `${timeVal} ${row["ora"]}`;

    try {
      const date = parseDateSafe(timeVal);
      const consVal = cols.consumptionKey ? parseNumberSafe(row[cols.consumptionKey]) : 0;
      parsedConsumption.push({ date, rawVal: Math.max(0, consVal) });

      if (cols.generationKey && row[cols.generationKey]) {
        const genVal = parseNumberSafe(row[cols.generationKey]);
        parsedDirectGeneration.push({ date, rawVal: Math.max(0, genVal) });
      }
    } catch {
      // Ignore unparseable line
    }
  }

  // Sort chronologically
  parsedConsumption.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Determine median interval in minutes
  let intervalMinutes = 60;
  if (parsedConsumption.length >= 2) {
    const diffs: number[] = [];
    for (let i = 1; i < Math.min(parsedConsumption.length, 10); i++) {
      const d = (parsedConsumption[i]!.date.getTime() - parsedConsumption[i - 1]!.date.getTime()) / (60 * 1000);
      if (d > 0 && d <= 1440) diffs.push(d);
    }
    if (diffs.length > 0) {
      diffs.sort((a, b) => a - b);
      intervalMinutes = diffs[Math.floor(diffs.length / 2)]!;
    }
  }

  const genMap = new Map<number, number>();
  if (generationCsv) {
    const genRows = parseCsvContent(generationCsv);
    if (genRows.length > 0) {
      const gHeaders = Object.keys(genRows[0]!);
      const gCols = identifyColumns(gHeaders);
      const valKey = gCols.generationKey ?? gCols.consumptionKey ?? gHeaders[1]!;
      const extGenUnit = detectColumnUnit(valKey);
      for (const row of genRows) {
        let timeVal = row[gCols.timestampKey];
        if (!timeVal) continue;
        if (row["Ora"]) timeVal = `${timeVal} ${row["Ora"]}`;
        else if (row["ora"]) timeVal = `${timeVal} ${row["ora"]}`;
        try {
          const date = parseDateSafe(timeVal);
          const raw = parseNumberSafe(row[valKey]);
          const kwh = convertRawToKWh(Math.max(0, raw), extGenUnit, intervalMinutes);
          genMap.set(date.getTime(), kwh);
        } catch {
          // Ignore
        }
      }
    }
  } else if (parsedDirectGeneration.length > 0) {
    for (const g of parsedDirectGeneration) {
      const kwh = convertRawToKWh(g.rawVal, genUnit, intervalMinutes);
      genMap.set(g.date.getTime(), kwh);
    }
  }

  const aligned: AlignedRecord[] = [];
  for (const c of parsedConsumption) {
    const epoch = c.date.getTime();
    // Allow +/- 5 minute window for matching generation telemetry
    let genVal = genMap.get(epoch);
    if (genVal === undefined) {
      for (const [gEpoch, val] of genMap.entries()) {
        if (Math.abs(gEpoch - epoch) <= 5 * 60 * 1000) {
          genVal = val;
          break;
        }
      }
    }

    aligned.push({
      timestamp: c.date.toISOString(),
      epochMs: epoch,
      date: c.date,
      consumptionKWh: convertRawToKWh(c.rawVal, consUnit, intervalMinutes),
      generationKWh: genVal ?? 0,
      intervalMinutes
    });
  }

  return aligned;
}

/** Parses tariff configuration from JSON or returns default ARERA scheme */
export function parseTariffConfig(jsonText?: string): TariffConfig {
  if (!jsonText || !jsonText.trim()) {
    return DEFAULT_ARERA_TARIFF;
  }
  try {
    const parsed = JSON.parse(jsonText) as TariffConfig;
    if (parsed.bands && typeof parsed.bands === "object") {
      return parsed;
    }
    return DEFAULT_ARERA_TARIFF;
  } catch {
    return DEFAULT_ARERA_TARIFF;
  }
}
