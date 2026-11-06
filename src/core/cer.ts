// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import type { ReconciledInterval } from "./types.ts";

export interface CerConfig {
  name?: string;
  incentivePerKWh?: number; // TIP GSE (€/kWh, default ~0.110)
  transmissionRestitutionPerKWh?: number; // ARERA TIAC restituzione (€/kWh, default ~0.0085)
  producerSharePct?: number; // e.g. 45% to producer
  consumerSharePct?: number; // e.g. 50% to consumers
  managementSharePct?: number; // e.g. 5% for CER administration
}

export interface CerEvaluationResult {
  totalSharedEnergyKWh: number;
  totalIncentiveEur: number;
  producerIncentiveEur: number;
  consumersIncentiveEur: number;
  cerManagementEur: number;
  cerSelfConsumptionRatePct: number;
  intervalsCount: number;
}

/** Evaluates Renewable Energy Community (CER) shared energy and GSE/ARERA incentives */
export function evaluateCerIncentives(
  producerIntervals: ReconciledInterval[],
  communityConsumptionKWh: number[] | number,
  config?: CerConfig
): CerEvaluationResult {
  const tip = config?.incentivePerKWh ?? 0.110;
  const tiac = config?.transmissionRestitutionPerKWh ?? 0.0085;
  const totalRatePerKWh = tip + tiac;

  const producerShare = (config?.producerSharePct ?? 45) / 100;
  const consumerShare = (config?.consumerSharePct ?? 50) / 100;
  const mgmtShare = (config?.managementSharePct ?? 5) / 100;

  let totalSharedKWh = 0;
  let totalInjectedKWh = 0;

  for (let i = 0; i < producerIntervals.length; i++) {
    const inter = producerIntervals[i]!;
    const injected = inter.gridExportKWh;
    totalInjectedKWh += injected;

    // External community load during this interval
    const extLoad = Array.isArray(communityConsumptionKWh)
      ? (communityConsumptionKWh[i] ?? communityConsumptionKWh[0] ?? 1.5)
      : communityConsumptionKWh;

    // Shared energy = min(injected into grid, consumed by community members)
    const sharedThisInterval = Math.min(injected, Math.max(0, extLoad));
    totalSharedKWh += sharedThisInterval;
  }

  const totalIncentive = totalSharedKWh * totalRatePerKWh;
  const producerIncentive = totalIncentive * producerShare;
  const consumersIncentive = totalIncentive * consumerShare;
  const cerManagement = totalIncentive * mgmtShare;
  const cerSelfConsumptionRatePct = totalInjectedKWh > 0 ? (totalSharedKWh / totalInjectedKWh) * 100 : 0;

  return {
    totalSharedEnergyKWh: round(totalSharedKWh, 3),
    totalIncentiveEur: round(totalIncentive, 2),
    producerIncentiveEur: round(producerIncentive, 2),
    consumersIncentiveEur: round(consumersIncentive, 2),
    cerManagementEur: round(cerManagement, 2),
    cerSelfConsumptionRatePct: round(cerSelfConsumptionRatePct, 1),
    intervalsCount: producerIntervals.length
  };
}

function round(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}
