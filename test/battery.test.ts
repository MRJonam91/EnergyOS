// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { simulateBatteryStorage, recommendOptimalBatterySizes } from "../src/core/battery.ts";
import { DEFAULT_ARERA_TARIFF } from "../src/core/constants.ts";
import type { ReconciledInterval } from "../src/core/types.ts";

test("simulateBatteryStorage charges from solar surplus and discharges during deficit", () => {
  const intervals: ReconciledInterval[] = [
    {
      timestamp: "2026-06-01T12:00:00Z",
      epochMs: new Date("2026-06-01T12:00:00Z").getTime(),
      band: "F1",
      consumptionKWh: 1.0,
      generationKWh: 4.0, // Surplus: 3.0 kWh
      directSelfConsumptionKWh: 1.0,
      gridImportKWh: 0.0,
      gridExportKWh: 3.0,
      importCost: 0,
      exportRevenue: 0.30,
      netCost: -0.30
    },
    {
      timestamp: "2026-06-01T21:00:00Z",
      epochMs: new Date("2026-06-01T21:00:00Z").getTime(),
      band: "F2",
      consumptionKWh: 2.5,
      generationKWh: 0.0, // Deficit: 2.5 kWh needed
      directSelfConsumptionKWh: 0.0,
      gridImportKWh: 2.5,
      gridExportKWh: 0.0,
      importCost: 0.62,
      exportRevenue: 0,
      netCost: 0.62
    }
  ];

  const result = simulateBatteryStorage(
    intervals,
    { capacityKWh: 5.0, initialSocPct: 20, roundTripEfficiency: 0.90 },
    DEFAULT_ARERA_TARIFF
  );

  assert.equal(result.capacityKWh, 5.0);
  assert.ok(result.totalChargedKWh > 0, "Battery should have charged during solar surplus");
  assert.ok(result.totalDischargedKWh > 0, "Battery should have discharged during deficit");
  assert.ok(result.avoidedGridImportKWh > 0, "Should have avoided grid import");
  assert.ok(result.simulatedSelfSufficiencyPct > result.initialSelfSufficiencyPct);
  assert.equal(result.intervals.length, 2);
});

test("simulateBatteryStorage respects min and max SoC limits", () => {
  const surplusInterval: ReconciledInterval = {
    timestamp: "2026-06-01T12:00:00Z",
    epochMs: new Date("2026-06-01T12:00:00Z").getTime(),
    band: "F1",
    consumptionKWh: 0.0,
    generationKWh: 50.0, // Massive solar surplus
    directSelfConsumptionKWh: 0.0,
    gridImportKWh: 0.0,
    gridExportKWh: 50.0,
    importCost: 0,
    exportRevenue: 5.0,
    netCost: -5.0
  };

  const result = simulateBatteryStorage(
    [surplusInterval],
    { capacityKWh: 10.0, maxSocPct: 90, roundTripEfficiency: 1.0 },
    DEFAULT_ARERA_TARIFF
  );

  const finalSoc = result.intervals[0]!.socKWh;
  // Max SoC is 90% of 10kWh = 9.0 kWh
  assert.ok(finalSoc <= 9.001, `Final SoC (${finalSoc}) should not exceed 90% (9.0 kWh)`);
  assert.ok(result.residualGridExportKWh > 40, "Excess solar beyond battery capacity must be exported to grid");
});

test("recommendOptimalBatterySizes returns ranked capacities", () => {
  const intervals: ReconciledInterval[] = [
    {
      timestamp: "2026-06-01T10:00:00Z",
      epochMs: new Date("2026-06-01T10:00:00Z").getTime(),
      band: "F1",
      consumptionKWh: 1.0,
      generationKWh: 6.0,
      directSelfConsumptionKWh: 1.0,
      gridImportKWh: 0.0,
      gridExportKWh: 5.0,
      importCost: 0,
      exportRevenue: 0.5,
      netCost: -0.5
    },
    {
      timestamp: "2026-06-01T20:00:00Z",
      epochMs: new Date("2026-06-01T20:00:00Z").getTime(),
      band: "F2",
      consumptionKWh: 4.0,
      generationKWh: 0.0,
      directSelfConsumptionKWh: 0.0,
      gridImportKWh: 4.0,
      gridExportKWh: 0.0,
      importCost: 1.0,
      exportRevenue: 0,
      netCost: 1.0
    }
  ];

  const recommendations = recommendOptimalBatterySizes(intervals, DEFAULT_ARERA_TARIFF);
  assert.ok(recommendations.length > 0);
  assert.ok(recommendations.some((r) => r.recommended), "At least one sizing option should be tagged as recommended");
});
