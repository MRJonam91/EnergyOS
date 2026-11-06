// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import type { EnergyAuditSummary, ReconciledInterval } from "./types.ts";

export interface LoadShiftAdvice {
  targetDevice: "heat-pump-dhw" | "ev-charging" | "washing-appliances";
  title: string;
  recommendedTimeWindow: string;
  shiftableKWhPerEvent: number;
  expectedAnnualSavingsEur: number;
  reason: string;
}

export interface FlexibilityReport {
  totalSurplusExportKWh: number;
  totalPeakImportKWh: number;
  flexibilityPotentialKWh: number;
  estimatedAnnualSavingsEur: number;
  optimalSolarWindowHours: { start: number; end: number };
  actions: LoadShiftAdvice[];
}

/** Analyzes load curves and evaluates optimal load-shifting opportunities for heat pump and EV */
export function analyzeFlexibilityOpportunities(
  summary: EnergyAuditSummary,
  intervals: ReconciledInterval[]
): FlexibilityReport {
  const durationHours = Math.max(1, summary.durationHours);
  const annualFactor = 8760 / durationHours;

  const totalSurplus = summary.totals.gridExportKWh;
  const totalPeakImport = (summary.byBand["F1"]?.gridImportKWh ?? 0) + (summary.byBand["F2"]?.gridImportKWh ?? 0);

  // Find best solar surplus window from hourly profile
  let bestWindowStart = 11;
  let bestWindowEnd = 15;
  let maxWindowSurplus = 0;

  for (let h = 9; h <= 15; h++) {
    const p1 = summary.hourlyAverageProfile[h];
    const p2 = summary.hourlyAverageProfile[h + 1];
    const p3 = summary.hourlyAverageProfile[h + 2];
    const currentWindowExport = (p1?.avgGridExportKWh ?? 0) + (p2?.avgGridExportKWh ?? 0) + (p3?.avgGridExportKWh ?? 0);
    if (currentWindowExport > maxWindowSurplus) {
      maxWindowSurplus = currentWindowExport;
      bestWindowStart = h;
      bestWindowEnd = h + 3;
    }
  }

  // Realistic shiftable potential is min(surplus exported, peak import) * 0.50
  const flexibilityPotential = Math.min(totalSurplus, totalPeakImport) * 0.50;
  // Cost difference between peak import (~€0.28/kWh) and feed-in value (~€0.10/kWh) = ~€0.18/kWh saved
  const estimatedSavingsPeriod = flexibilityPotential * 0.18;
  const estimatedAnnualSavings = estimatedSavingsPeriod * annualFactor;

  const actions: LoadShiftAdvice[] = [
    {
      targetDevice: "heat-pump-dhw",
      title: "Pre-riscaldamento Acqua Calda Sanitaria (ACS)",
      recommendedTimeWindow: `${bestWindowStart}:00 – ${bestWindowEnd}:00`,
      shiftableKWhPerEvent: 2.5,
      expectedAnnualSavingsEur: round(2.5 * 365 * 0.18 * 0.7, 2),
      reason: `Concentra il ciclo di produzione ACS della pompa di calore tra le ${bestWindowStart}:00 e le ${bestWindowEnd}:00 quando la produzione fotovoltaica è in surplus.`
    },
    {
      targetDevice: "washing-appliances",
      title: "Programmazione Elettrodomestici (Lavatrice/Lavastoviglie)",
      recommendedTimeWindow: `${bestWindowStart}:30 – ${bestWindowEnd}:00`,
      shiftableKWhPerEvent: 1.4,
      expectedAnnualSavingsEur: round(1.4 * 250 * 0.18 * 0.8, 2),
      reason: "Usa la partenza ritardata per avviare i cicli di lavaggio nelle ore centrali della giornata anziché nella fascia serale F2."
    },
    {
      targetDevice: "ev-charging",
      title: "Ricarica Veicolo Elettrico / Wallbox Intelligente",
      recommendedTimeWindow: `Solare: ${bestWindowStart}:00–${bestWindowEnd}:00 | Notte F3: 23:00–07:00`,
      shiftableKWhPerEvent: 7.0,
      expectedAnnualSavingsEur: round(7.0 * 120 * 0.18, 2),
      reason: "Ricarica l'auto con solar curtailment di giorno oppure imposta la ricarica programmata dopo le 23:00 in fascia F3 fuori picco."
    }
  ];

  return {
    totalSurplusExportKWh: round(totalSurplus, 2),
    totalPeakImportKWh: round(totalPeakImport, 2),
    flexibilityPotentialKWh: round(flexibilityPotential, 2),
    estimatedAnnualSavingsEur: round(estimatedAnnualSavings, 2),
    optimalSolarWindowHours: { start: bestWindowStart, end: bestWindowEnd },
    actions
  };
}

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}
