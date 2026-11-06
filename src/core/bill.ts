// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import type { EnergyAuditSummary, TariffConfig } from "./types.ts";

export interface ItalianBillAudit {
  periodDays: number;
  energyComponent: {
    energyConsumptionEur: number;
    commercializationFixedEur: number;
    subtotalEur: number;
  };
  transportComponent: {
    fixedEur: number;
    powerQuotaEur: number;
    energyTransportEur: number;
    subtotalEur: number;
  };
  systemChargesComponent: {
    subtotalEur: number;
  };
  taxesComponent: {
    exciseEur: number;
    vatEur: number;
    subtotalEur: number;
  };
  feedInCreditEur: number;
  grossBillEur: number;
  netBillEur: number;
  effectiveCostPerKWhEur: number;
}

/** Computes full Italian ARERA compliant electricity bill structure */
export function computeItalianBill(
  summary: EnergyAuditSummary,
  tariff: TariffConfig,
  options?: {
    isResident?: boolean;
    committedPowerKW?: number;
    pcvMonthlyEur?: number;
  }
): ItalianBillAudit {
  const hours = Math.max(1, summary.durationHours);
  const periodDays = Math.max(1, Math.round(hours / 24));
  const monthFraction = periodDays / 30.416;

  const isResident = options?.isResident ?? true;
  const committedPower = options?.committedPowerKW ?? tariff.committedPowerKW ?? 3.0;
  const pcvMonthly = options?.pcvMonthlyEur ?? tariff.fixedMonthlyFee ?? 10.50;

  // 1. Spesa Materia Energia
  const energyConsumptionEur = summary.financial.actualImportCost;
  const commercializationFixedEur = pcvMonthly * monthFraction;
  const energySubtotal = energyConsumptionEur + commercializationFixedEur;

  // 2. Spesa Trasporto e Gestione Contatore
  const transportFixedMonthly = 1.85;
  const transportFixedEur = transportFixedMonthly * monthFraction;
  const powerQuotaRate = tariff.powerQuotaMonthlyPerKW ?? 1.84; // €/kW/mese
  const powerQuotaEur = powerQuotaRate * committedPower * monthFraction;
  const transportEnergyRate = 0.0135; // €/kWh
  const energyTransportEur = summary.totals.gridImportKWh * transportEnergyRate;
  const transportSubtotal = transportFixedEur + powerQuotaEur + energyTransportEur;

  // 3. Oneri Generali di Sistema (ASOS + ARIM)
  const systemChargesRate = tariff.systemChargesPerKWh ?? 0.032; // €/kWh
  const systemChargesSubtotal = summary.totals.gridImportKWh * systemChargesRate;

  // 4. Imposte (Accise + IVA)
  const totalKWh = summary.totals.gridImportKWh;
  let taxableExciseKWh = totalKWh;
  if (isResident && committedPower <= 3.0) {
    const exemptAllowance = 150 * monthFraction;
    taxableExciseKWh = Math.max(0, totalKWh - exemptAllowance);
  }
  const exciseRate = 0.0227; // €/kWh
  const exciseEur = taxableExciseKWh * exciseRate;

  const taxableAmount = energySubtotal + transportSubtotal + systemChargesSubtotal + exciseEur;
  const vatRate = (tariff.vatRatePct ?? 10) / 100;
  const vatEur = taxableAmount * vatRate;
  const taxesSubtotal = exciseEur + vatEur;

  const grossBill = taxableAmount + vatEur;
  const feedInCredit = summary.financial.exportRevenue;
  const netBill = grossBill - feedInCredit;
  const effectiveCostPerKWh = totalKWh > 0 ? grossBill / totalKWh : 0;

  return {
    periodDays,
    energyComponent: {
      energyConsumptionEur: round(energyConsumptionEur, 2),
      commercializationFixedEur: round(commercializationFixedEur, 2),
      subtotalEur: round(energySubtotal, 2)
    },
    transportComponent: {
      fixedEur: round(transportFixedEur, 2),
      powerQuotaEur: round(powerQuotaEur, 2),
      energyTransportEur: round(energyTransportEur, 2),
      subtotalEur: round(transportSubtotal, 2)
    },
    systemChargesComponent: {
      subtotalEur: round(systemChargesSubtotal, 2)
    },
    taxesComponent: {
      exciseEur: round(exciseEur, 2),
      vatEur: round(vatEur, 2),
      subtotalEur: round(taxesSubtotal, 2)
    },
    feedInCreditEur: round(feedInCredit, 2),
    grossBillEur: round(grossBill, 2),
    netBillEur: round(netBill, 2),
    effectiveCostPerKWhEur: round(effectiveCostPerKWh, 4)
  };
}

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}
