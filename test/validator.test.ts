// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { diagnoseEnergyCsv } from "../src/core/validator.ts";

test("diagnoseEnergyCsv detects Italian Portale Consumi format", () => {
  const csv = `Giorno;Ora;Energia Attiva F1;Potenza Massima
01/06/2026;10:00;0,45;1,8
01/06/2026;11:00;0,50;1,9`;

  const diag = diagnoseEnergyCsv(csv);
  assert.equal(diag.isValid, true);
  assert.equal(diag.detectedPreset, "portale-consumi");
  assert.equal(diag.delimiter, ";");
  assert.equal(diag.rowCount, 2);
  assert.equal(diag.recognizedColumns.timestamp, "Giorno");
  assert.equal(diag.recognizedColumns.consumption, "Energia Attiva F1");
});

test("diagnoseEnergyCsv detects Shelly EM format", () => {
  const csv = `Date/time UTC,Channel A Power (W),Energy (Wh)
2026-06-01 10:00:00,450,112.5
2026-06-01 10:15:00,520,130.0`;

  const diag = diagnoseEnergyCsv(csv);
  assert.equal(diag.isValid, true);
  assert.equal(diag.detectedPreset, "shelly-em");
  assert.equal(diag.delimiter, ",");
  assert.equal(diag.samplingIntervalMinutes, 15);
});

test("diagnoseEnergyCsv flags missing columns and empty files", () => {
  const emptyDiag = diagnoseEnergyCsv("");
  assert.equal(emptyDiag.isValid, false);
  assert.ok(emptyDiag.warnings.length > 0);

  const invalidCsv = `Nome,Cognome,Indirizzo
Mario,Rossi,Via Roma 1`;
  const invalidDiag = diagnoseEnergyCsv(invalidCsv);
  assert.equal(invalidDiag.isValid, false);
  assert.ok(invalidDiag.warnings.some((w) => w.includes("Nessuna colonna temporale")));
});
