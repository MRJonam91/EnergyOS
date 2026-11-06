// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import type { CerEvaluationResult } from "../core/cer.ts";
import type { FlexibilityReport } from "../core/advisor.ts";
import type { ItalianBillAudit } from "../core/bill.ts";
import type { BatterySimulationResult, BatterySizingOption, CsvDiagnostics, EnergyAuditSummary } from "../core/types.ts";

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

/** Renders terminal report for battery storage simulation */
export function renderBatteryReport(sim: BatterySimulationResult, sizingOptions?: BatterySizingOption[]): string {
  const lines: string[] = [];
  const sep = "─".repeat(68);
  lines.push("┌" + sep + "┐");
  lines.push(`│  🔋 EnergyOS — Battery Storage System (BSS) Simulation              │`);
  lines.push(`│  Capacity: ${sim.capacityKWh.toFixed(1)} kWh nominal (${sim.usableCapacityKWh.toFixed(1)} kWh usable) | Round-Trip: ${(sim.roundTripEfficiency * 100).toFixed(0)}% │`.padEnd(69) + "│");
  lines.push("├" + sep + "┤");

  lines.push("│  SIMULATED SELF-SUFFICIENCY & IMPACT                               │");
  lines.push(`│  • Self-Sufficiency Boost: ${sim.initialSelfSufficiencyPct.toFixed(1)}% ──▶ ${sim.simulatedSelfSufficiencyPct.toFixed(1)}% (+${(sim.simulatedSelfSufficiencyPct - sim.initialSelfSufficiencyPct).toFixed(1)}%)`.padEnd(69) + "│");
  lines.push(`│  • Self-Consumption Boost: ${sim.initialSelfConsumptionPct.toFixed(1)}% ──▶ ${sim.simulatedSelfConsumptionPct.toFixed(1)}% (+${(sim.simulatedSelfConsumptionPct - sim.initialSelfConsumptionPct).toFixed(1)}%)`.padEnd(69) + "│");
  lines.push(`│  • Additional Stored Energy: ${formatKWh(sim.totalDischargedKWh).padStart(10)} directly supplied to home`.padEnd(69) + "│");
  lines.push(`│  • Avoided Grid Import:      ${formatKWh(sim.avoidedGridImportKWh).padStart(10)} withdrawn less from grid`.padEnd(69) + "│");
  lines.push(`│  • Equivalent Full Cycles:   ${sim.equivalentFullCycles.toFixed(1)} cycles (Avg SoC: ${sim.averageSocPct.toFixed(1)}%)`.padEnd(69) + "│");
  lines.push("├" + sep + "┤");

  lines.push("│  FINANCIAL GAIN FROM STORAGE                                       │");
  lines.push(`│  • Additional Net Savings:   +${formatCurrency(sim.additionalFinancialSavings).padStart(9)} (period delta)`.padEnd(69) + "│");

  if (sizingOptions && sizingOptions.length > 0) {
    lines.push("├" + sep + "┤");
    lines.push("│  BATTERY SIZING RECOMMENDATIONS                                    │");
    lines.push("│  Cap. (kWh)   Self-Suff.   Annual Est.    Cycles/yr   Recommendation│");
    lines.push("│  ──────────   ──────────   ───────────    ─────────   ──────────────│");
    for (const opt of sizingOptions) {
      const capCol = (opt.capacityKWh.toFixed(1) + " kWh").padEnd(10);
      const suffCol = (opt.selfSufficiencyPct.toFixed(1) + "%").padEnd(10);
      const savCol = (formatCurrency(opt.annualSavingsEstimate) + "/yr").padEnd(11);
      const cycCol = (opt.equivalentCyclesPerYear + " cyc").padEnd(9);
      const tag = opt.recommended ? "★ SWEET SPOT" : "";
      lines.push(`│  ${capCol}   ${suffCol}   ${savCol}    ${cycCol}   ${tag.padEnd(14)}│`);
    }
  }

  lines.push("└" + sep + "┘");
  return lines.join("\n");
}

/** Renders terminal diagnostic report for a CSV telemetry file */
export function renderDiagnosticsReport(diag: CsvDiagnostics): string {
  const lines: string[] = [];
  const sep = "─".repeat(68);
  lines.push("┌" + sep + "┐");
  lines.push(`│  🩺 EnergyOS — Telemetry Pre-Flight & Diagnostics                  │`);
  lines.push(`│  Status: ${diag.isValid ? "✔ VALID DATASET" : "✖ ISSUES DETECTED"} | Preset: ${diag.detectedPreset}`.padEnd(69) + "│");
  lines.push("├" + sep + "┤");
  lines.push(`│  • Detected Delimiter:      "${diag.delimiter}"`.padEnd(69) + "│");
  lines.push(`│  • Row Count:               ${diag.rowCount} records`.padEnd(69) + "│");
  lines.push(`│  • Recognized Columns:`.padEnd(69) + "│");
  lines.push(`│    - Timestamp:             ${diag.recognizedColumns.timestamp || "[NONE]"}`.padEnd(69) + "│");
  lines.push(`│    - Consumption:           ${diag.recognizedColumns.consumption || "[NONE]"}`.padEnd(69) + "│");
  lines.push(`│    - Generation:            ${diag.recognizedColumns.generation || "[NONE]"}`.padEnd(69) + "│");
  lines.push(`│  • Sampling Interval:       ${diag.samplingIntervalMinutes} minutes`.padEnd(69) + "│");
  lines.push(`│  • Date Range:              ${diag.dateRange.start.slice(0, 16)} → ${diag.dateRange.end.slice(0, 16)} (${diag.dateRange.durationHours}h)`.padEnd(69) + "│");

  if (diag.warnings.length > 0) {
    lines.push("├" + sep + "┤");
    lines.push("│  ⚠ WARNINGS & ADVISORIES:                                          │");
    for (const w of diag.warnings) {
      lines.push(`│  - ${w.slice(0, 63).padEnd(65)}│`);
    }
  }

  lines.push("└" + sep + "┘");
  return lines.join("\n");
}

/** Renders terminal report for Renewable Energy Community (CER) evaluation */
export function renderCerReport(cer: CerEvaluationResult): string {
  const lines: string[] = [];
  const sep = "─".repeat(68);
  lines.push("┌" + sep + "┐");
  lines.push(`│  👥 EnergyOS — Comunità Energetica Rinnovabile (CER) Simulation     │`);
  lines.push("├" + sep + "┤");
  lines.push(`│  • Shared Energy (Condivisa):   ${formatKWh(cer.totalSharedEnergyKWh).padStart(12)}`.padEnd(69) + "│");
  lines.push(`│  • CER Self-Consumption Share:  ${renderGauge(cer.cerSelfConsumptionRatePct, 20).padEnd(41)}│`);
  lines.push("├" + sep + "┤");
  lines.push(`│  GSE & ARERA INCENTIVE VALUATION (TIP + TIAC Restituzione)         │`);
  lines.push(`│  • Total CER Incentive Pool:    +${formatCurrency(cer.totalIncentiveEur).padStart(10)}`.padEnd(69) + "│");
  lines.push(`│  • Producer Share (Prosumer):   +${formatCurrency(cer.producerIncentiveEur).padStart(10)} (accreditato al produttore)`.padEnd(69) + "│");
  lines.push(`│  • Consumers Share (Membri):    +${formatCurrency(cer.consumersIncentiveEur).padStart(10)} (distribuito ai consumatori)`.padEnd(69) + "│");
  lines.push(`│  • CER Management & Operational: +${formatCurrency(cer.cerManagementEur).padStart(10)}`.padEnd(69) + "│");
  lines.push("└" + sep + "┘");
  return lines.join("\n");
}

/** Renders terminal report for Heat Pump & EV load shifting advisor */
export function renderFlexibilityReport(flex: FlexibilityReport): string {
  const lines: string[] = [];
  const sep = "─".repeat(68);
  lines.push("┌" + sep + "┐");
  lines.push(`│  💡 EnergyOS — Heat Pump & EV Flexibility & Load Shifting Advisor │`);
  lines.push(`│  Optimal Solar Surplus Window: ${flex.optimalSolarWindowHours.start}:00 – ${flex.optimalSolarWindowHours.end}:00`.padEnd(69) + "│");
  lines.push("├" + sep + "┤");
  lines.push(`│  • Flexible Potential:          ${formatKWh(flex.flexibilityPotentialKWh).padStart(12)} shiftable to solar`.padEnd(69) + "│");
  lines.push(`│  • Estimated Annual Bill Gain:  +${formatCurrency(flex.estimatedAnnualSavingsEur).padStart(10)} / anno`.padEnd(69) + "│");
  lines.push("├" + sep + "┤");
  lines.push("│  RECOMMENDED SCHEDULING ACTIONS:                                   │");
  for (const act of flex.actions) {
    lines.push(`│  ▶ ${act.title.slice(0, 64)}`.padEnd(69) + "│");
    lines.push(`│    Orario: ${act.recommendedTimeWindow} | Delta: +${formatCurrency(act.expectedAnnualSavingsEur)}/anno`.padEnd(69) + "│");
  }
  lines.push("└" + sep + "┘");
  return lines.join("\n");
}

/** Renders detailed Italian ARERA Bill Decomposition */
export function renderItalianBillReport(bill: ItalianBillAudit): string {
  const lines: string[] = [];
  const sep = "─".repeat(68);
  lines.push("┌" + sep + "┐");
  lines.push(`│  🧾 EnergyOS — Decomposizione Bolletta Elettrica ARERA (${bill.periodDays} giorni)   │`);
  lines.push("├" + sep + "┤");
  lines.push(`│  1. Spesa Materia Energia:                ${formatCurrency(bill.energyComponent.subtotalEur).padStart(10)}`.padEnd(69) + "│");
  lines.push(`│     - Quota Consumo Energia:              ${formatCurrency(bill.energyComponent.energyConsumptionEur).padStart(10)}`.padEnd(69) + "│");
  lines.push(`│     - Quota Fissa Commercializzazione:    ${formatCurrency(bill.energyComponent.commercializationFixedEur).padStart(10)}`.padEnd(69) + "│");
  lines.push(`│  2. Spesa Trasporto e Gestione Contatore: ${formatCurrency(bill.transportComponent.subtotalEur).padStart(10)}`.padEnd(69) + "│");
  lines.push(`│     - Quota Fissa Trasporto:              ${formatCurrency(bill.transportComponent.fixedEur).padStart(10)}`.padEnd(69) + "│");
  lines.push(`│     - Quota Potenza Contatore:            ${formatCurrency(bill.transportComponent.powerQuotaEur).padStart(10)}`.padEnd(69) + "│");
  lines.push(`│     - Quota Energia Trasporto:            ${formatCurrency(bill.transportComponent.energyTransportEur).padStart(10)}`.padEnd(69) + "│");
  lines.push(`│  3. Oneri Generali di Sistema (ASOS/ARIM):${formatCurrency(bill.systemChargesComponent.subtotalEur).padStart(10)}`.padEnd(69) + "│");
  lines.push(`│  4. Imposte (Accise + IVA 10%):           ${formatCurrency(bill.taxesComponent.subtotalEur).padStart(10)}`.padEnd(69) + "│");
  lines.push(`│     - Accisa Erariale:                    ${formatCurrency(bill.taxesComponent.exciseEur).padStart(10)}`.padEnd(69) + "│");
  lines.push(`│     - IVA (Imposta Valore Aggiunto):      ${formatCurrency(bill.taxesComponent.vatEur).padStart(10)}`.padEnd(69) + "│");
  lines.push("├" + sep + "┤");
  lines.push(`│  • TOTALE BOLLETTA LORDA:                 ${formatCurrency(bill.grossBillEur).padStart(10)}`.padEnd(69) + "│");
  lines.push(`│  • Accredito Immissione GSE (RID):       -${formatCurrency(bill.feedInCreditEur).padStart(10)}`.padEnd(69) + "│");
  lines.push(`│  ═══════════════════════════════════════════════════════════════  │`);
  lines.push(`│  💶 TOTALE NETTO A CARICO:                ${formatCurrency(bill.netBillEur).padStart(10)} (costo eff. €${bill.effectiveCostPerKWhEur.toFixed(3)}/kWh) │`.padEnd(69) + "│");
  lines.push("└" + sep + "┘");
  return lines.join("\n");
}
