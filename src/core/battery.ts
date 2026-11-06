// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import type {
  BatteryConfig,
  BatteryIntervalState,
  BatterySimulationResult,
  BatterySizingOption,
  ReconciledInterval,
  TariffConfig
} from "./types.ts";

/** Simulates physical electrochemical battery storage operation on reconciled flows */
export function simulateBatteryStorage(
  intervals: ReconciledInterval[],
  battery: BatteryConfig,
  tariff: TariffConfig
): BatterySimulationResult {
  if (intervals.length === 0) {
    throw new Error("No reconciled intervals available for battery simulation.");
  }

  const capacityKWh = Math.max(0.1, battery.capacityKWh);
  const minSocPct = Math.max(0, Math.min(50, battery.minSocPct ?? 10));
  const maxSocPct = Math.max(minSocPct + 10, Math.min(100, battery.maxSocPct ?? 95));
  const efficiency = Math.max(0.7, Math.min(1.0, battery.roundTripEfficiency ?? 0.90));
  const chgEff = Math.sqrt(efficiency);
  const disEff = Math.sqrt(efficiency);

  const minKWh = (capacityKWh * minSocPct) / 100;
  const maxKWh = (capacityKWh * maxSocPct) / 100;
  const usableCapacity = maxKWh - minKWh;

  const maxChargeKW = battery.maxChargeKW ?? capacityKWh * 0.7; // default 0.7C
  const maxDischargeKW = battery.maxDischargeKW ?? capacityKWh * 0.7;

  let currentSocKWh = (capacityKWh * Math.max(minSocPct, Math.min(maxSocPct, battery.initialSocPct ?? 20))) / 100;

  const states: BatteryIntervalState[] = [];
  let totalCharged = 0;
  let totalDischarged = 0;
  let socAccumulator = 0;

  let initialConsumption = 0;
  let initialGeneration = 0;
  let initialSelfConsumption = 0;
  let initialGridImport = 0;
  let simulatedGridImport = 0;
  let simulatedGridExport = 0;
  let financialSavingsDelta = 0;

  for (let i = 0; i < intervals.length; i++) {
    const inter = intervals[i]!;
    initialConsumption += inter.consumptionKWh;
    initialGeneration += inter.generationKWh;
    initialSelfConsumption += inter.directSelfConsumptionKWh;
    initialGridImport += inter.gridImportKWh;

    const rawExport = inter.gridExportKWh;
    const rawImport = inter.gridImportKWh;
    const bandPrice = tariff.bands[inter.band]?.pricePerKWh ?? 0.25;
    const feedInPrice = tariff.bands[inter.band]?.feedInPricePerKWh ?? 0.10;

    // Estimate interval fraction in hours (15m -> 0.25)
    let hours = 0.25;
    if (i > 0) {
      const dtMs = inter.epochMs - intervals[i - 1]!.epochMs;
      if (dtMs > 0 && dtMs <= 86400000) hours = dtMs / 3600000;
    }

    let chargedKWh = 0;
    let dischargedKWh = 0;
    let residualImport = rawImport;
    let residualExport = rawExport;

    if (rawExport > 0 && currentSocKWh < maxKWh) {
      // Charge battery from surplus solar
      const maxEnergyCanAccept = (maxKWh - currentSocKWh) / chgEff;
      const rateLimitEnergy = maxChargeKW * hours;
      const energyTaken = Math.min(rawExport, maxEnergyCanAccept, rateLimitEnergy);

      const energyStored = energyTaken * chgEff;
      currentSocKWh += energyStored;
      chargedKWh = energyStored;
      totalCharged += energyStored;
      residualExport = Math.max(0, rawExport - energyTaken);
    } else if (rawImport > 0 && currentSocKWh > minKWh) {
      // Discharge battery into home deficit
      const maxEnergyCanProvide = (currentSocKWh - minKWh) * disEff;
      const rateLimitEnergy = maxDischargeKW * hours;
      const energyNeeded = rawImport;
      const energyDelivered = Math.min(energyNeeded, maxEnergyCanProvide, rateLimitEnergy);

      const energyDrawnFromBattery = energyDelivered / disEff;
      currentSocKWh -= energyDrawnFromBattery;
      dischargedKWh = energyDelivered;
      totalDischarged += energyDelivered;
      residualImport = Math.max(0, rawImport - energyDelivered);
    }

    simulatedGridImport += residualImport;
    simulatedGridExport += residualExport;

    // Financial difference: avoided import cost minus sacrificed export feed-in
    const avoidedImportKWh = rawImport - residualImport;
    const lostExportKWh = rawExport - residualExport;
    financialSavingsDelta += (avoidedImportKWh * bandPrice) - (lostExportKWh * feedInPrice);

    const socPct = (currentSocKWh / capacityKWh) * 100;
    socAccumulator += socPct;

    states.push({
      timestamp: inter.timestamp,
      socKWh: round(currentSocKWh, 3),
      socPct: round(socPct, 1),
      batteryChargeKWh: round(chargedKWh, 3),
      batteryDischargeKWh: round(dischargedKWh, 3),
      residualGridImportKWh: round(residualImport, 3),
      residualGridExportKWh: round(residualExport, 3)
    });
  }

  const initialSelfSufficiencyPct = initialConsumption > 0 ? (initialSelfConsumption / initialConsumption) * 100 : 0;
  const initialSelfConsumptionPct = initialGeneration > 0 ? (initialSelfConsumption / initialGeneration) * 100 : 0;

  const totalSimulatedSelfConsumption = initialSelfConsumption + totalDischarged;
  const simulatedSelfSufficiencyPct = initialConsumption > 0 ? (totalSimulatedSelfConsumption / initialConsumption) * 100 : 0;
  const simulatedSelfConsumptionPct = initialGeneration > 0 ? (totalSimulatedSelfConsumption / initialGeneration) * 100 : 0;

  const equivalentFullCycles = usableCapacity > 0 ? totalDischarged / usableCapacity : 0;
  const averageSocPct = states.length > 0 ? socAccumulator / states.length : 0;

  return {
    capacityKWh,
    usableCapacityKWh: round(usableCapacity, 2),
    roundTripEfficiency: efficiency,
    initialSelfSufficiencyPct: round(initialSelfSufficiencyPct, 1),
    simulatedSelfSufficiencyPct: round(simulatedSelfSufficiencyPct, 1),
    initialSelfConsumptionPct: round(initialSelfConsumptionPct, 1),
    simulatedSelfConsumptionPct: round(simulatedSelfConsumptionPct, 1),
    totalChargedKWh: round(totalCharged, 2),
    totalDischargedKWh: round(totalDischarged, 2),
    additionalSelfConsumptionKWh: round(totalDischarged, 2),
    avoidedGridImportKWh: round(initialGridImport - simulatedGridImport, 2),
    residualGridImportKWh: round(simulatedGridImport, 2),
    residualGridExportKWh: round(simulatedGridExport, 2),
    equivalentFullCycles: round(equivalentFullCycles, 1),
    averageSocPct: round(averageSocPct, 1),
    additionalFinancialSavings: round(financialSavingsDelta, 2),
    totalSimulatedSavings: round(financialSavingsDelta, 2),
    intervals: states
  };
}

/** Evaluates optimal battery storage capacities and returns sizing recommendation curve */
export function recommendOptimalBatterySizes(
  intervals: ReconciledInterval[],
  tariff: TariffConfig
): BatterySizingOption[] {
  const testCapacities = [3, 5, 7.5, 10, 15, 20];
  const durationHours = intervals.length > 1
    ? (intervals[intervals.length - 1]!.epochMs - intervals[0]!.epochMs) / (3600 * 1000)
    : 24;
  const annualMultiplier = Math.max(1, 8760 / Math.max(1, durationHours));

  const options: BatterySizingOption[] = [];
  let bestCapacity = 5;
  let maxMarginalGain = -1;

  for (let i = 0; i < testCapacities.length; i++) {
    const cap = testCapacities[i]!;
    const sim = simulateBatteryStorage(intervals, { capacityKWh: cap }, tariff);
    const annualSavings = sim.additionalFinancialSavings * annualMultiplier;
    const annualCycles = sim.equivalentFullCycles * annualMultiplier;

    // Marginal gain per kWh of capacity added
    const prevCap = i > 0 ? testCapacities[i - 1]! : 0;
    const prevSim = i > 0 ? simulateBatteryStorage(intervals, { capacityKWh: prevCap }, tariff) : null;
    const marginalSavings = prevSim ? (sim.additionalFinancialSavings - prevSim.additionalFinancialSavings) / (cap - prevCap) : sim.additionalFinancialSavings / cap;

    if (marginalSavings > maxMarginalGain && cap <= 10) {
      maxMarginalGain = marginalSavings;
      bestCapacity = cap;
    }

    options.push({
      capacityKWh: cap,
      selfSufficiencyPct: sim.simulatedSelfSufficiencyPct,
      selfConsumptionPct: sim.simulatedSelfConsumptionPct,
      annualSavingsEstimate: round(annualSavings, 2),
      equivalentCyclesPerYear: Math.round(annualCycles),
      recommended: false
    });
  }

  // Tag optimal sweet spot
  const opt = options.find((o) => o.capacityKWh === bestCapacity) ?? options[1];
  if (opt) opt.recommended = true;

  return options;
}

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}
