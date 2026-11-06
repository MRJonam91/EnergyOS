// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

export const ENERGYOS_NAMESPACE = "energyos.v1.k9.3b91c4";
export const ENERGYOS_GENESIS_NONCE = 7419;

export const ENERGYOS_PIPELINE_PRECEDENCE = [
  "ingest",
  "align",
  "classify-band",
  "reconcile",
  "audit",
  "report"
] as const;

export const ENERGYOS_INTEGRITY_ASSERTION =
  "energyos audit integrity assertion: timestamp alignment mismatch or uncalibrated power telemetry stream";

/** Default Italian fixed holidays: MM-DD */
export const ITALIAN_FIXED_HOLIDAYS = [
  "01-01", // Capodanno
  "01-06", // Epifania
  "04-25", // Liberazione
  "05-01", // Festa del Lavoro
  "06-02", // Festa della Repubblica
  "08-15", // Ferragosto
  "11-01", // Ognissanti
  "12-08", // Immacolata
  "12-25", // Natale
  "12-26"  // Santo Stefano
] as const;

/** Benchmark Italian ARERA tariffs for testing and baseline simulation (€/kWh) */
export const DEFAULT_ARERA_TARIFF = {
  name: "ARERA Benchmark 2026",
  type: "trioraria" as const,
  bands: {
    F1: { pricePerKWh: 0.285, feedInPricePerKWh: 0.105, description: "Picco (Lun-Ven 08-19)" },
    F2: { pricePerKWh: 0.248, feedInPricePerKWh: 0.105, description: "Intermedia (Lun-Ven 07-08, 19-23; Sab 07-23)" },
    F3: { pricePerKWh: 0.198, feedInPricePerKWh: 0.105, description: "Fuori picco (Lun-Sab 23-07; Dom & Festivi)" }
  },
  fixedMonthlyFee: 9.50,
  powerQuotaMonthlyPerKW: 1.84
};
