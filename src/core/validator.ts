// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import { detectSeparator, identifyColumns, parseDateSafe, parseNumberSafe, splitCsvLine } from "./parser.ts";
import type { CsvDiagnostics } from "./types.ts";

/** Inspects CSV telemetry and validates structure, format presets and quality metrics */
export function diagnoseEnergyCsv(csvText: string): CsvDiagnostics {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const warnings: string[] = [];

  if (lines.length < 2) {
    return {
      isValid: false,
      detectedPreset: "generic",
      delimiter: ",",
      rowCount: 0,
      recognizedColumns: { timestamp: "" },
      samplingIntervalMinutes: 0,
      dateRange: { start: "", end: "", durationHours: 0 },
      quality: { missingTimestamps: 0, negativeValuesCount: 0, zeroGapsCount: 0 },
      warnings: ["File CSV vuoto o contenente solo intestazione."]
    };
  }

  const delimiter = detectSeparator(lines[0]!);
  const headers = splitCsvLine(lines[0]!, delimiter).map((h) => h.replace(/["']/g, "").trim());
  const headerLine = lines[0]!.toLowerCase();

  let preset: CsvDiagnostics["detectedPreset"] = "generic";
  if (headerLine.includes("portale consumi") || (headerLine.includes("giorno") && headerLine.includes("energia attiva"))) {
    preset = "portale-consumi";
  } else if (headerLine.includes("shelly") || (headerLine.includes("channel") && headerLine.includes("power (w)"))) {
    preset = "shelly-em";
  } else if (headerLine.includes("huawei") || headerLine.includes("fusionsolar")) {
    preset = "huawei";
  } else if (headerLine.includes("solaredge")) {
    preset = "solaredge";
  }

  const cols = identifyColumns(headers, false);
  if (!cols.timestampKey) {
    warnings.push("Nessuna colonna temporale riconosciuta (cercato: Date, Time, Data, Giorno, Timestamp).");
  }
  if (!cols.consumptionKey && !cols.generationKey) {
    warnings.push("Nessuna colonna energetica riconosciuta (cercato: Consumo, Prelievo, Produzione, Solar, Wh, kWh).");
  }

  let missingTimestamps = 0;
  let negativeValuesCount = 0;
  let zeroGapsCount = 0;

  const validDates: Date[] = [];
  const rows = lines.slice(1);

  for (let i = 0; i < rows.length; i++) {
    const rawCols = splitCsvLine(rows[i]!, delimiter);
    const rowObj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      rowObj[headers[j]!] = rawCols[j] ?? "";
    }

    let timeStr = rowObj[cols.timestampKey];
    if (!timeStr) {
      missingTimestamps++;
      continue;
    }

    if (rowObj["Ora"]) {
      timeStr = `${timeStr} ${rowObj["Ora"]}`;
    } else if (rowObj["ora"]) {
      timeStr = `${timeStr} ${rowObj["ora"]}`;
    }

    try {
      const d = parseDateSafe(timeStr);
      validDates.push(d);
    } catch {
      missingTimestamps++;
      continue;
    }

    if (cols.consumptionKey) {
      const c = parseNumberSafe(rowObj[cols.consumptionKey]);
      if (c < 0) negativeValuesCount++;
      if (c === 0) zeroGapsCount++;
    }
  }

  validDates.sort((a, b) => a.getTime() - b.getTime());

  let samplingMinutes = 60;
  if (validDates.length >= 2) {
    const diffs: number[] = [];
    for (let i = 1; i < Math.min(validDates.length, 25); i++) {
      const d = (validDates[i]!.getTime() - validDates[i - 1]!.getTime()) / 60000;
      if (d > 0 && d <= 1440) diffs.push(d);
    }
    if (diffs.length > 0) {
      diffs.sort((a, b) => a - b);
      samplingMinutes = diffs[Math.floor(diffs.length / 2)]!;
    }
  }

  const start = validDates.length > 0 ? validDates[0]!.toISOString() : "";
  const end = validDates.length > 0 ? validDates[validDates.length - 1]!.toISOString() : "";
  const durationHours = validDates.length > 1
    ? Math.round(((validDates[validDates.length - 1]!.getTime() - validDates[0]!.getTime()) / 3600000) * 10) / 10
    : 0;

  if (missingTimestamps > 0) {
    warnings.push(`${missingTimestamps} righe con timestamp mancante o non interpretabile.`);
  }
  if (negativeValuesCount > 0) {
    warnings.push(`Rilevati ${negativeValuesCount} valori negativi nei consumi.`);
  }

  return {
    isValid: warnings.length === 0 || (validDates.length > 0 && !!(cols.consumptionKey || cols.generationKey)),
    detectedPreset: preset,
    delimiter,
    rowCount: rows.length,
    recognizedColumns: {
      timestamp: cols.timestampKey,
      consumption: cols.consumptionKey,
      generation: cols.generationKey
    },
    samplingIntervalMinutes: samplingMinutes,
    dateRange: {
      start,
      end,
      durationHours
    },
    quality: {
      missingTimestamps,
      negativeValuesCount,
      zeroGapsCount
    },
    warnings
  };
}
