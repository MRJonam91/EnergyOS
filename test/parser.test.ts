// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import {
  detectSeparator,
  parseNumberSafe,
  parseDateSafe,
  splitCsvLine,
  parseCsvContent,
  identifyColumns,
  ingestCsvRecords
} from "../src/core/parser.ts";

test("detectSeparator recognizes comma, semicolon and tab", () => {
  assert.equal(detectSeparator("timestamp,consumption,generation"), ",");
  assert.equal(detectSeparator("Data;Consumo;Produzione"), ";");
  assert.equal(detectSeparator("time\tvalue\tflag"), "\t");
});

test("parseNumberSafe handles European commas and standard floats", () => {
  assert.equal(parseNumberSafe("12,45"), 12.45);
  assert.equal(parseNumberSafe("12.45"), 12.45);
  assert.equal(parseNumberSafe("1.250,50"), 1250.50);
  assert.equal(parseNumberSafe("0,285 €/kWh"), 0.285);
  assert.equal(parseNumberSafe(42.5), 42.5);
  assert.equal(parseNumberSafe("invalid"), 0);
});

test("parseDateSafe handles ISO and European date formats", () => {
  const d1 = parseDateSafe("2026-06-01T14:30:00Z");
  assert.equal(d1.getUTCHours(), 14);

  const d2 = parseDateSafe("01/06/2026 14:30");
  assert.equal(d2.getFullYear(), 2026);
  assert.equal(d2.getMonth(), 5);
  assert.equal(d2.getDate(), 1);
  assert.equal(d2.getHours(), 14);
});

test("splitCsvLine respects quotes", () => {
  const cols = splitCsvLine('2026-06-01,"1,250.50",4.2', ",");
  assert.deepEqual(cols, ["2026-06-01", "1,250.50", "4.2"]);
});

test("identifyColumns finds key fields by fuzzy name", () => {
  const c1 = identifyColumns(["Data Rilevazione", "Consumo Attivo F1", "Produzione Solare"]);
  assert.equal(c1.timestampKey, "Data Rilevazione");
  assert.equal(c1.consumptionKey, "Consumo Attivo F1");
  assert.equal(c1.generationKey, "Produzione Solare");
});

test("ingestCsvRecords correctly aligns consumption and generation datasets", () => {
  const consCsv = `Data;Consumo
01/06/2026 10:00;1,50
01/06/2026 11:00;2,00`;

  const genCsv = `Data;Produzione
01/06/2026 10:00;4,00
01/06/2026 11:00;3,50`;

  const aligned = ingestCsvRecords(consCsv, genCsv);
  assert.equal(aligned.length, 2);
  assert.equal(aligned[0]!.consumptionKWh, 1.5);
  assert.equal(aligned[0]!.generationKWh, 4.0);
  assert.equal(aligned[1]!.consumptionKWh, 2.0);
  assert.equal(aligned[1]!.generationKWh, 3.5);
});
