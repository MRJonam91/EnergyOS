// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { exportIntervalsToCsv, generateDemoSimulation } from "../src/cli/index.ts";
import { reconcileEnergyFlows } from "../src/core/reconciler.ts";
import { DEFAULT_ARERA_TARIFF } from "../src/core/constants.ts";
import { generateHtmlReport } from "../src/report/html.ts";
import { renderTerminalReport } from "../src/report/terminal.ts";

test("generateDemoSimulation produces 7 days of 15-minute data with solar curves", () => {
  const records = generateDemoSimulation();
  // 7 days * 96 slots/day = 672
  assert.equal(records.length, 672);

  const totalSolar = records.reduce((acc, r) => acc + r.generationKWh, 0);
  const totalLoad = records.reduce((acc, r) => acc + r.consumptionKWh, 0);

  assert.ok(totalSolar > 50, "Expected significant solar production in 7 days");
  assert.ok(totalLoad > 30, "Expected realistic household consumption");
});

test("demo simulation generates valid terminal and HTML reports", () => {
  const records = generateDemoSimulation();
  const { summary } = reconcileEnergyFlows(records, DEFAULT_ARERA_TARIFF);

  const termReport = renderTerminalReport(summary, false);
  assert.ok(termReport.includes("EnergyOS"));
  assert.ok(termReport.includes("ARERA TIME BAND AUDIT"));
  assert.ok(termReport.includes("TOTAL NET SAVINGS"));

  const html = generateHtmlReport(summary);
  assert.ok(html.includes("<!DOCTYPE html>"));
  assert.ok(html.includes("EnergyOS Audit Report"));
  assert.ok(html.includes("<svg"));
  assert.ok(html.includes("Autoconsumo Solare"));
});

test("exportIntervalsToCsv produces valid RFC 4180 CSV rows", () => {
  const records = generateDemoSimulation().slice(0, 4);
  const { intervals } = reconcileEnergyFlows(records, DEFAULT_ARERA_TARIFF);

  const csv = exportIntervalsToCsv(intervals);
  const lines = csv.split("\n");
  assert.equal(lines.length, 5); // 1 header + 4 rows
  assert.ok(lines[0]!.includes("timestamp,band,consumption_kwh"));
});
