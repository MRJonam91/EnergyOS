// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import type { EnergyAuditSummary } from "../core/types.ts";

/** Generates a visual ASCII/Unicode progress gauge */
export function renderGauge(pct: number, width = 20): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  return "█".repeat(filled) + "░".repeat(empty) + ` ${clamped.toFixed(1)}%`;
}

/** Formats currency amount in EUR */
export function formatCurrency(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}€${Math.abs(amount).toFixed(2)}`;
}

/** Formats energy quantity in kWh */
export function formatKWh(val: number): string {
  return `${val.toFixed(2)} kWh`;
}

/** Builds rich terminal output string */
export function renderTerminalReport(summary: EnergyAuditSummary, showSponsor = false): string {
  const lines: string[] = [];

  const sep = "─".repeat(68);
  lines.push("┌" + sep + "┐");
  lines.push(`│  ⚡ EnergyOS — Household Energy & Solar Reconciliation Audit        │`);
  lines.push(`│  Tariff: ${summary.tariffName.padEnd(58)}│`);
  lines.push(`│  Period: ${summary.periodStart.slice(0, 16)} → ${summary.periodEnd.slice(0, 16)} (${summary.durationHours}h / ${summary.intervalsCount} slots) │`);
  lines.push("├" + sep + "┤");

  lines.push("│  ENERGY FLOWS BALANCE                                              │");
  lines.push(`│  • Gross Consumption:     ${formatKWh(summary.totals.consumptionKWh).padStart(12)}  (from appliances & home)   │`);
  lines.push(`│  • Solar Generation:      ${formatKWh(summary.totals.generationKWh).padStart(12)}  (from local PV array)      │`);
  lines.push(`│  • Direct Self-Consumed:  ${formatKWh(summary.totals.directSelfConsumptionKWh).padStart(12)}  (instantaneous on-site)    │`);
  lines.push(`│  • Grid Import (Bought):  ${formatKWh(summary.totals.gridImportKWh).padStart(12)}  (withdrawn from supplier)  │`);
  lines.push(`│  • Grid Export (Sold):    ${formatKWh(summary.totals.gridExportKWh).padStart(12)}  (fed into national grid)   │`);
  lines.push("├" + sep + "┤");

  lines.push("│  PERFORMANCE INDICATORS                                            │");
  lines.push(`│  • Self-Consumption Rate:  ${renderGauge(summary.metrics.selfConsumptionPct, 22).padEnd(41)}│`);
  lines.push(`│    (share of solar production consumed on-site without export)     │`);
  lines.push(`│  • Self-Sufficiency Rate:  ${renderGauge(summary.metrics.selfSufficiencyPct, 22).padEnd(41)}│`);
  lines.push(`│    (share of total home energy covered directly by your solar)     │`);
  lines.push(`│  • Grid Dependence:        ${renderGauge(summary.metrics.gridDependencePct, 22).padEnd(41)}│`);
  lines.push(`│  • Peak Demand / Gen:      ${summary.metrics.peakDemandKW.toFixed(2)} kW max load / ${summary.metrics.peakGenerationKW.toFixed(2)} kW max solar │`);
  lines.push("├" + sep + "┤");

  lines.push("│  ARERA TIME BAND AUDIT (F1 / F2 / F3)                              │");
  lines.push("│  Band  Description       Gross C.   Import     Export   Net Cost   │");
  lines.push("│  ────  ────────────────  ─────────  ─────────  ───────  ─────────  │");

  for (const b of Object.values(summary.byBand)) {
    const desc = (b.description ?? b.band).slice(0, 16).padEnd(16);
    const bandCol = b.band.padEnd(4);
    const consCol = b.consumptionKWh.toFixed(1).padStart(7) + "k";
    const impCol = b.gridImportKWh.toFixed(1).padStart(7) + "k";
    const expCol = b.gridExportKWh.toFixed(1).padStart(5) + "k";
    const netCol = formatCurrency(b.netCost).padStart(9);
    lines.push(`│  ${bandCol}  ${desc}  ${consCol}  ${impCol}  ${expCol}  ${netCol}  │`);
  }

  lines.push("├" + sep + "┤");
  lines.push("│  FINANCIAL IMPACT & SAVINGS                                        │");
  lines.push(`│  • Baseline Cost (without PV):  ${formatCurrency(summary.financial.baselineCostWithoutSolar).padStart(10)}  (expected full grid bill)  │`);
  lines.push(`│  • Actual Grid Import Cost:     ${formatCurrency(summary.financial.actualImportCost).padStart(10)}  (residual bill amount)     │`);
  lines.push(`│  • Grid Feed-in Revenue (RID): -${formatCurrency(summary.financial.exportRevenue).padStart(10)}  (credited by GSE/distrib.) │`);
  lines.push(`│  • Net Energy Cost:             ${formatCurrency(summary.financial.netCost).padStart(10)}                             │`);
  lines.push(`│  ═══════════════════════════════════════════════════════════════  │`);
  lines.push(`│  💰 TOTAL NET SAVINGS:          ${formatCurrency(summary.financial.netSavings).padStart(10)}  (${summary.financial.savingsPct.toFixed(1)}% bill reduction)  │`);
  lines.push("└" + sep + "┘");

  if (showSponsor && !process.env.NO_SPONSOR && !process.env.CI) {
    lines.push("");
    lines.push("♥ Ti piace EnergyOS? Sostieni lo sviluppo indipendente: https://github.com/sponsors/MRJonam91");
  }

  return lines.join("\n");
}
