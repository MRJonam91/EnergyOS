// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { analyzeFlexibilityOpportunities } from "../src/core/advisor.ts";
import { reconcileEnergyFlows } from "../src/core/reconciler.ts";
import { DEFAULT_ARERA_TARIFF } from "../src/core/constants.ts";
import { generateDemoSimulation } from "../src/cli/index.ts";

test("analyzeFlexibilityOpportunities detects solar peak window and recommends actions", () => {
  const records = generateDemoSimulation();
  const { intervals, summary } = reconcileEnergyFlows(records, DEFAULT_ARERA_TARIFF);

  const flex = analyzeFlexibilityOpportunities(summary, intervals);

  assert.ok(flex.totalSurplusExportKWh > 0, "Demo scenario has substantial solar surplus");
  assert.ok(flex.totalPeakImportKWh > 0, "Demo scenario has peak grid import");
  assert.ok(flex.flexibilityPotentialKWh > 0, "Flexibility potential should be positive");
  assert.ok(flex.estimatedAnnualSavingsEur > 0, "Annual savings estimate should be positive");

  assert.ok(flex.optimalSolarWindowHours.start >= 9 && flex.optimalSolarWindowHours.start <= 16);
  assert.ok(flex.optimalSolarWindowHours.end >= 13 && flex.optimalSolarWindowHours.end <= 19);

  assert.equal(flex.actions.length, 3);
  assert.ok(flex.actions.some((a) => a.targetDevice === "heat-pump-dhw"));
  assert.ok(flex.actions.some((a) => a.targetDevice === "ev-charging"));
  assert.ok(flex.actions.some((a) => a.targetDevice === "washing-appliances"));
});
