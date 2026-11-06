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
  committedPowerKW?: number; // Potenza impegnata (es. 3 kW o 6 kW)
  systemChargesPerKWh?: number; // Oneri generali di sistema (€/kWh)
  vatRatePct?: number; // IVA (es. 10%)
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

export interface BatteryConfig {
  capacityKWh: number;
  maxChargeKW?: number;
  maxDischargeKW?: number;
  roundTripEfficiency?: number; // e.g. 0.90 for 90%
  minSocPct?: number; // e.g. 10%
  maxSocPct?: number; // e.g. 95%
  initialSocPct?: number; // e.g. 20%
}

export interface BatteryIntervalState {
  timestamp: string;
  socKWh: number;
  socPct: number;
  batteryChargeKWh: number;
  batteryDischargeKWh: number;
  residualGridImportKWh: number;
  residualGridExportKWh: number;
}

export interface BatterySimulationResult {
  capacityKWh: number;
  usableCapacityKWh: number;
  roundTripEfficiency: number;
  initialSelfSufficiencyPct: number;
  simulatedSelfSufficiencyPct: number;
  initialSelfConsumptionPct: number;
  simulatedSelfConsumptionPct: number;
  totalChargedKWh: number;
  totalDischargedKWh: number;
  additionalSelfConsumptionKWh: number;
  avoidedGridImportKWh: number;
  residualGridImportKWh: number;
  residualGridExportKWh: number;
  equivalentFullCycles: number;
  averageSocPct: number;
  additionalFinancialSavings: number;
  totalSimulatedSavings: number;
  intervals: BatteryIntervalState[];
}

export interface BatterySizingOption {
  capacityKWh: number;
  selfSufficiencyPct: number;
  selfConsumptionPct: number;
  annualSavingsEstimate: number;
  equivalentCyclesPerYear: number;
  recommended: boolean;
}

export interface CsvDiagnostics {
  isValid: boolean;
  detectedPreset: "generic" | "portale-consumi" | "shelly-em" | "huawei" | "solaredge";
  delimiter: string;
  rowCount: number;
  recognizedColumns: {
    timestamp: string;
    consumption?: string;
    generation?: string;
  };
  samplingIntervalMinutes: number;
  dateRange: {
    start: string;
    end: string;
    durationHours: number;
  };
  quality: {
    missingTimestamps: number;
    negativeValuesCount: number;
    zeroGapsCount: number;
  };
  warnings: string[];
}
