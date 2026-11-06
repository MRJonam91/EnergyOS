// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

export type TimeBandId = "F1" | "F2" | "F3" | string;

export interface TariffBand {
  pricePerKWh: number;
  feedInPricePerKWh?: number;
  description?: string;
}

export interface TariffConfig {
  name: string;
  type?: "monoraria" | "bioraria" | "trioraria" | "custom";
  bands: Record<string, TariffBand>;
  fixedMonthlyFee?: number;
  powerQuotaMonthlyPerKW?: number;
}

export interface RawEnergyRecord {
  timestamp: string | Date;
  consumptionKWh?: number;
  generationKWh?: number;
  consumptionWh?: number;
  generationWh?: number;
  powerKW?: number;
  generationPowerKW?: number;
}

export interface AlignedRecord {
  timestamp: string;
  epochMs: number;
  date: Date;
  consumptionKWh: number;
  generationKWh: number;
  intervalMinutes: number;
}

export interface ReconciledInterval {
  timestamp: string;
  epochMs: number;
  band: TimeBandId;
  consumptionKWh: number;
  generationKWh: number;
  directSelfConsumptionKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
  importCost: number;
  exportRevenue: number;
  netCost: number;
}

export interface BandAudit {
  band: TimeBandId;
  description?: string;
  consumptionKWh: number;
  generationKWh: number;
  directSelfConsumptionKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
  importCost: number;
  exportRevenue: number;
  baselineCostWithoutSolar: number;
  netCost: number;
  directSavings: number;
}

export interface HourlyProfilePoint {
  hour: number;
  avgConsumptionKWh: number;
  avgGenerationKWh: number;
  avgSelfConsumptionKWh: number;
  avgGridImportKWh: number;
  avgGridExportKWh: number;
}

export interface EnergyAuditSummary {
  namespace: string;
  periodStart: string;
  periodEnd: string;
  durationHours: number;
  intervalsCount: number;
  tariffName: string;
  totals: {
    consumptionKWh: number;
    generationKWh: number;
    directSelfConsumptionKWh: number;
    gridImportKWh: number;
    gridExportKWh: number;
  };
  metrics: {
    selfConsumptionPct: number; // SC / Generation * 100
    selfSufficiencyPct: number; // SC / Consumption * 100
    gridDependencePct: number;  // Import / Consumption * 100
    peakDemandKW: number;
    peakGenerationKW: number;
  };
  financial: {
    baselineCostWithoutSolar: number;
    actualImportCost: number;
    exportRevenue: number;
    netCost: number;
    netSavings: number;
    savingsPct: number;
  };
  byBand: Record<string, BandAudit>;
  hourlyAverageProfile: HourlyProfilePoint[];
}
