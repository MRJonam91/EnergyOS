// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCerIncentives } from "../src/core/cer.ts";
import type { ReconciledInterval } from "../src/core/types.ts";

test("evaluateCerIncentives calculates shared energy and GSE TIP + TIAC restitution", () => {
  const intervals: ReconciledInterval[] = [
    {
      timestamp: "2026-06-01T12:00:00Z",
      epochMs: new Date("2026-06-01T12:00:00Z").getTime(),
      band: "F1",
      consumptionKWh: 0.5,
      generationKWh: 4.5,
      directSelfConsumptionKWh: 0.5,
      gridImportKWh: 0.0,
      gridExportKWh: 4.0, // Injected into grid
      importCost: 0,
      exportRevenue: 0.40,
      netCost: -0.40
    },
    {
      timestamp: "2026-06-01T13:00:00Z",
      epochMs: new Date("2026-06-01T13:00:00Z").getTime(),
      band: "F1",
      consumptionKWh: 1.0,
      generationKWh: 3.0,
      directSelfConsumptionKWh: 1.0,
      gridImportKWh: 0.0,
      gridExportKWh: 2.0, // Injected into grid
      importCost: 0,
      exportRevenue: 0.20,
      netCost: -0.20
    }
  ];

  // Community consumption: 3.0 kWh in slot 1, 2.5 kWh in slot 2
  // Shared slot 1: min(4.0, 3.0) = 3.0 kWh
  // Shared slot 2: min(2.0, 2.5) = 2.0 kWh
  // Total shared = 5.0 kWh
  const cer = evaluateCerIncentives(intervals, [3.0, 2.5], {
    incentivePerKWh: 0.110,
    transmissionRestitutionPerKWh: 0.0085,
    producerSharePct: 45,
    consumerSharePct: 50,
    managementSharePct: 5
  });

  assert.equal(cer.totalSharedEnergyKWh, 5.0);
  const expectedTotalIncentive = 5.0 * (0.110 + 0.0085); // 5.0 * 0.1185 = 0.5925 -> 0.59
  assert.equal(cer.totalIncentiveEur, Math.round(expectedTotalIncentive * 100) / 100);
  assert.ok(cer.producerIncentiveEur > 0);
  assert.ok(cer.consumersIncentiveEur > 0);
  assert.ok(cer.cerManagementEur > 0);
  // Shared rate = 5 / 6 * 100 = 83.3%
  assert.equal(cer.cerSelfConsumptionRatePct, 83.3);
});
