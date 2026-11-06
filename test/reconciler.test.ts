// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { reconcileEnergyFlows } from "../src/core/reconciler.ts";
import { DEFAULT_ARERA_TARIFF } from "../src/core/constants.ts";
import type { AlignedRecord } from "../src/core/types.ts";

test("reconcileEnergyFlows computes exact flows and financial balance", () => {
  const records: AlignedRecord[] = [
    {
      timestamp: "2026-06-01T10:00:00Z",
      epochMs: new Date("2026-06-01T10:00:00Z").getTime(),
      date: new Date("2026-06-01T10:00:00Z"),
      consumptionKWh: 2.0,
      generationKWh: 5.0, // Surplus solar
      intervalMinutes: 60
    },
    {
      timestamp: "2026-06-01T20:00:00Z",
      epochMs: new Date("2026-06-01T20:00:00Z").getTime(),
      date: new Date("2026-06-01T20:00:00Z"),
      consumptionKWh: 3.0,
      generationKWh: 0.0, // Night time, 100% grid import
      intervalMinutes: 60
    }
  ];

  const { intervals, summary } = reconcileEnergyFlows(records, DEFAULT_ARERA_TARIFF);

  assert.equal(intervals.length, 2);

  // Interval 1: C=2, G=5 -> SC=2, Import=0, Export=3
  assert.equal(intervals[0]!.directSelfConsumptionKWh, 2.0);
  assert.equal(intervals[0]!.gridImportKWh, 0.0);
  assert.equal(intervals[0]!.gridExportKWh, 3.0);

  // Interval 2: C=3, G=0 -> SC=0, Import=3, Export=0
  assert.equal(intervals[1]!.directSelfConsumptionKWh, 0.0);
  assert.equal(intervals[1]!.gridImportKWh, 3.0);
  assert.equal(intervals[1]!.gridExportKWh, 0.0);

  // Totals
  assert.equal(summary.totals.consumptionKWh, 5.0);
  assert.equal(summary.totals.generationKWh, 5.0);
  assert.equal(summary.totals.directSelfConsumptionKWh, 2.0);
  assert.equal(summary.totals.gridImportKWh, 3.0);
  assert.equal(summary.totals.gridExportKWh, 3.0);

  // Rates: Self-consumption = 2/5 * 100 = 40%
  assert.equal(summary.metrics.selfConsumptionPct, 40.0);
  // Self-sufficiency = 2/5 * 100 = 40%
  assert.equal(summary.metrics.selfSufficiencyPct, 40.0);
  // Grid dependence = 3/5 * 100 = 60%
  assert.equal(summary.metrics.gridDependencePct, 60.0);

  // Financial verification
  assert.ok(summary.financial.netSavings > 0);
  assert.ok(summary.financial.actualImportCost < summary.financial.baselineCostWithoutSolar);
});

test("reconcileEnergyFlows handles scenario with zero solar generation", () => {
  const records: AlignedRecord[] = [
    {
      timestamp: "2026-06-01T12:00:00Z",
      epochMs: new Date("2026-06-01T12:00:00Z").getTime(),
      date: new Date("2026-06-01T12:00:00Z"),
      consumptionKWh: 4.0,
      generationKWh: 0.0,
      intervalMinutes: 60
    }
  ];

  const { summary } = reconcileEnergyFlows(records, DEFAULT_ARERA_TARIFF);
  assert.equal(summary.totals.directSelfConsumptionKWh, 0);
  assert.equal(summary.totals.gridImportKWh, 4.0);
  assert.equal(summary.totals.gridExportKWh, 0);
  assert.equal(summary.metrics.selfConsumptionPct, 0);
  assert.equal(summary.metrics.selfSufficiencyPct, 0);
  assert.equal(summary.metrics.gridDependencePct, 100);
  assert.equal(summary.financial.netSavings, 0);
});
