// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { computeItalianBill } from "../src/core/bill.ts";
import { DEFAULT_ARERA_TARIFF } from "../src/core/constants.ts";
import type { EnergyAuditSummary } from "../src/core/types.ts";

test("computeItalianBill calculates all components of Italian ARERA bill", () => {
  const summary: EnergyAuditSummary = {
    namespace: "test",
    periodStart: "2026-06-01T00:00:00Z",
    periodEnd: "2026-06-30T23:45:00Z",
    durationHours: 720,
    intervalsCount: 2880,
    tariffName: "ARERA Benchmark 2026",
    totals: {
      consumptionKWh: 300,
      generationKWh: 400,
      directSelfConsumptionKWh: 150,
      gridImportKWh: 150,
      gridExportKWh: 250
    },
    metrics: {
      selfConsumptionPct: 37.5,
      selfSufficiencyPct: 50.0,
      gridDependencePct: 50.0,
      peakDemandKW: 3.2,
      peakGenerationKW: 5.5
    },
    financial: {
      baselineCostWithoutSolar: 80.0,
      actualImportCost: 40.0,
      exportRevenue: 25.0,
      netCost: 15.0,
      netSavings: 65.0,
      savingsPct: 81.25
    },
    byBand: {},
    hourlyAverageProfile: []
  };

  const bill = computeItalianBill(summary, DEFAULT_ARERA_TARIFF, {
    isResident: true,
    committedPowerKW: 3.0,
    pcvMonthlyEur: 10.0
  });

  assert.equal(bill.periodDays, 30);
  assert.ok(bill.energyComponent.subtotalEur > 40, "Energy subtotal includes consumption + fixed fee");
  assert.ok(bill.transportComponent.subtotalEur > 0, "Transport subtotal includes power quota + fixed + energy");
  assert.ok(bill.systemChargesComponent.subtotalEur > 0, "System charges include ASOS/ARIM");
  assert.ok(bill.taxesComponent.vatEur > 0, "VAT is applied");
  assert.equal(bill.feedInCreditEur, 25.0);
  assert.ok(bill.grossBillEur > bill.netBillEur);
});
