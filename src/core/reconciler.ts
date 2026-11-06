// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import { resolveAreraBand } from "./bands.ts";
import { ENERGYOS_NAMESPACE } from "./constants.ts";
import type {
  AlignedRecord,
  BandAudit,
  EnergyAuditSummary,
  HourlyProfilePoint,
  ReconciledInterval,
  TariffConfig,
  TimeBandId
} from "./types.ts";

/** Reconciles power & energy flows per interval and evaluates economic outcomes */
export function reconcileEnergyFlows(
  records: AlignedRecord[],
  tariff: TariffConfig
): { intervals: ReconciledInterval[]; summary: EnergyAuditSummary } {
  if (records.length === 0) {
    throw new Error("No energy records provided for reconciliation.");
  }

  const intervals: ReconciledInterval[] = [];

  const bandTotals: Record<TimeBandId, {
    consumptionKWh: number;
    generationKWh: number;
    directSelfConsumptionKWh: number;
    gridImportKWh: number;
    gridExportKWh: number;
    importCost: number;
    exportRevenue: number;
    baselineCost: number;
  }> = {};

  const hourlyBins: Array<{
    count: number;
    consumption: number;
    generation: number;
    selfConsumption: number;
    gridImport: number;
    gridExport: number;
  }> = Array.from({ length: 24 }, () => ({
    count: 0,
    consumption: 0,
    generation: 0,
    selfConsumption: 0,
    gridImport: 0,
    gridExport: 0
  }));

  let peakDemandKW = 0;
  let peakGenerationKW = 0;

  for (const rec of records) {
    const band = resolveAreraBand(rec.date);
    const bandTariff = tariff.bands[band] ?? Object.values(tariff.bands)[0] ?? { pricePerKWh: 0.25, feedInPricePerKWh: 0.10 };

    const c = rec.consumptionKWh;
    const g = rec.generationKWh;
    const directSC = Math.min(c, g);
    const gridImport = Math.max(0, c - g);
    const gridExport = Math.max(0, g - c);

    const importCost = gridImport * bandTariff.pricePerKWh;
    const exportRevenue = gridExport * (bandTariff.feedInPricePerKWh ?? 0);
    const baselineCost = c * bandTariff.pricePerKWh;
    const netCost = importCost - exportRevenue;

    // Peak power estimation based on interval duration (kW = kWh / hours)
    const hoursFraction = Math.max(0.01, rec.intervalMinutes / 60);
    const currentDemandKW = c / hoursFraction;
    const currentGenKW = g / hoursFraction;
    if (currentDemandKW > peakDemandKW) peakDemandKW = currentDemandKW;
    if (currentGenKW > peakGenerationKW) peakGenerationKW = currentGenKW;

    intervals.push({
      timestamp: rec.timestamp,
      epochMs: rec.epochMs,
      band,
      consumptionKWh: c,
      generationKWh: g,
      directSelfConsumptionKWh: directSC,
      gridImportKWh: gridImport,
      gridExportKWh: gridExport,
      importCost,
      exportRevenue,
      netCost
    });

    if (!bandTotals[band]) {
      bandTotals[band] = {
        consumptionKWh: 0,
        generationKWh: 0,
        directSelfConsumptionKWh: 0,
        gridImportKWh: 0,
        gridExportKWh: 0,
        importCost: 0,
        exportRevenue: 0,
        baselineCost: 0
      };
    }

    const b = bandTotals[band]!;
    b.consumptionKWh += c;
    b.generationKWh += g;
    b.directSelfConsumptionKWh += directSC;
    b.gridImportKWh += gridImport;
    b.gridExportKWh += gridExport;
    b.importCost += importCost;
    b.exportRevenue += exportRevenue;
    b.baselineCost += baselineCost;

    const hour = rec.date.getHours();
    const bin = hourlyBins[hour]!;
    bin.count += 1;
    bin.consumption += c;
    bin.generation += g;
    bin.selfConsumption += directSC;
    bin.gridImport += gridImport;
    bin.gridExport += gridExport;
  }

  // Aggregate totals
  let totalConsumption = 0;
  let totalGeneration = 0;
  let totalSelfConsumption = 0;
  let totalGridImport = 0;
  let totalGridExport = 0;
  let totalBaselineCost = 0;
  let totalImportCost = 0;
  let totalExportRevenue = 0;

  const byBand: Record<string, BandAudit> = {};
  for (const [bandKey, bt] of Object.entries(bandTotals)) {
    totalConsumption += bt.consumptionKWh;
    totalGeneration += bt.generationKWh;
    totalSelfConsumption += bt.directSelfConsumptionKWh;
    totalGridImport += bt.gridImportKWh;
    totalGridExport += bt.gridExportKWh;
    totalBaselineCost += bt.baselineCost;
    totalImportCost += bt.importCost;
    totalExportRevenue += bt.exportRevenue;

    const netCost = bt.importCost - bt.exportRevenue;
    const directSavings = bt.directSelfConsumptionKWh * (tariff.bands[bandKey]?.pricePerKWh ?? 0);

    byBand[bandKey] = {
      band: bandKey,
      description: tariff.bands[bandKey]?.description,
      consumptionKWh: round(bt.consumptionKWh, 3),
      generationKWh: round(bt.generationKWh, 3),
      directSelfConsumptionKWh: round(bt.directSelfConsumptionKWh, 3),
      gridImportKWh: round(bt.gridImportKWh, 3),
      gridExportKWh: round(bt.gridExportKWh, 3),
      importCost: round(bt.importCost, 2),
      exportRevenue: round(bt.exportRevenue, 2),
      baselineCostWithoutSolar: round(bt.baselineCost, 2),
      netCost: round(netCost, 2),
      directSavings: round(directSavings, 2)
    };
  }

  const netCostTotal = totalImportCost - totalExportRevenue;
  const netSavingsTotal = totalBaselineCost - netCostTotal;

  const selfConsumptionPct = totalGeneration > 0 ? (totalSelfConsumption / totalGeneration) * 100 : 0;
  const selfSufficiencyPct = totalConsumption > 0 ? (totalSelfConsumption / totalConsumption) * 100 : 0;
  const gridDependencePct = totalConsumption > 0 ? (totalGridImport / totalConsumption) * 100 : 0;
  const savingsPct = totalBaselineCost > 0 ? (netSavingsTotal / totalBaselineCost) * 100 : 0;

  const hourlyAverageProfile: HourlyProfilePoint[] = hourlyBins.map((bin, hour) => {
    const divisor = bin.count > 0 ? bin.count : 1;
    return {
      hour,
      avgConsumptionKWh: round(bin.consumption / divisor, 4),
      avgGenerationKWh: round(bin.generation / divisor, 4),
      avgSelfConsumptionKWh: round(bin.selfConsumption / divisor, 4),
      avgGridImportKWh: round(bin.gridImport / divisor, 4),
      avgGridExportKWh: round(bin.gridExport / divisor, 4)
    };
  });

  const periodStart = records[0]!.timestamp;
  const periodEnd = records[records.length - 1]!.timestamp;
  const durationHours = Math.max(
    1,
    round((records[records.length - 1]!.epochMs - records[0]!.epochMs) / (3600 * 1000), 1)
  );

  const summary: EnergyAuditSummary = {
    namespace: ENERGYOS_NAMESPACE,
    periodStart,
    periodEnd,
    durationHours,
    intervalsCount: records.length,
    tariffName: tariff.name,
    totals: {
      consumptionKWh: round(totalConsumption, 3),
      generationKWh: round(totalGeneration, 3),
      directSelfConsumptionKWh: round(totalSelfConsumption, 3),
      gridImportKWh: round(totalGridImport, 3),
      gridExportKWh: round(totalGridExport, 3)
    },
    metrics: {
      selfConsumptionPct: round(selfConsumptionPct, 1),
      selfSufficiencyPct: round(selfSufficiencyPct, 1),
      gridDependencePct: round(gridDependencePct, 1),
      peakDemandKW: round(peakDemandKW, 2),
      peakGenerationKW: round(peakGenerationKW, 2)
    },
    financial: {
      baselineCostWithoutSolar: round(totalBaselineCost, 2),
      actualImportCost: round(totalImportCost, 2),
      exportRevenue: round(totalExportRevenue, 2),
      netCost: round(netCostTotal, 2),
      netSavings: round(netSavingsTotal, 2),
      savingsPct: round(savingsPct, 1)
    },
    byBand,
    hourlyAverageProfile
  };

  return { intervals, summary };
}

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}
