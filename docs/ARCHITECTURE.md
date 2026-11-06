# Architettura / Architecture — EnergyOS

```
                 ┌──────────────────────────────────────────────────┐
                 │                 Input Telemetry                  │
                 │  • Smart Meter CSV (2G / Open-Meter / Arera)     │
                 │  • Inverter PV Generation CSV (SolarEdge/Huawei) │
                 │  • Custom Tariffs (JSON / Monoraria / Bioraria)  │
                 └─────────────────────────┬────────────────────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                               EnergyOS Core Pipeline                             │
│                                                                                  │
│  1. Ingest & Telemetry Alignment (`src/core/parser.ts`):                         │
│     ├── Delimiter Auto-Detection (',', ';', '\t')                                │
│     ├── European Comma/Dot Float Sanitization ('0,285 €/kWh' -> 0.285)           │
│     ├── Robust Datetime Parsing (ISO 8601, European DD/MM/YYYY, Epoch Ms)        │
│     └── Temporal Interval Alignment (Interpolation / 15m / 60m buckets)          │
│                                                                                  │
│  2. ARERA Time Band Classification (`src/core/bands.ts`):                        │
│     ├── F1 (Peak): Monday-Friday 08:00 - 19:00                                   │
│     ├── F2 (Mid): Monday-Friday 07:00-08:00 & 19:00-23:00; Saturday 07:00-23:00  │
│     ├── F3 (Off-Peak): Night 23:00-07:00; All-day Sunday                         │
│     └── Italian National Holidays & Astronomical Easter Monday Resolution        │
│                                                                                  │
│  3. Energy Flow Reconciliation Engine (`src/core/reconciler.ts`):                │
│     ├── Direct Self-Consumption: SC = min(Generation, Consumption)               │
│     ├── Grid Import:             Import = max(0, Consumption - Generation)       │
│     ├── Grid Export:             Export = max(0, Generation - Consumption)       │
│     ├── Rates:                   Self-Consumption % & Self-Sufficiency %         │
│     └── Baseline vs Actual Financial Balance & Feed-in Credit (RID GSE)          │
│                                                                                  │
│  4. Reporting & Visualization Engine:                                            │
│     ├── Terminal Visual Gauges & ASCII Tables (`src/report/terminal.ts`)         │
│     ├── Standalone Zero-CDN HTML Dashboard & SVG Charts (`src/report/html.ts`)   │
│     └── JSON Machine-Readable Stream for Automation (`src/cli/index.ts`)         │
└──────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
                 ┌──────────────────────────────────────────────────┐
                 │               Verified Deliverables              │
                 │  • Terminal Bill Breakdown & Savings Report      │
                 │  • Standalone Interactive HTML Dashboard         │
                 │  • JSON Energy Audit Stream                      │
                 └──────────────────────────────────────────────────┘
```

## Estendibilità / How to Extend
- **Nuovi protocolli inverter / contatori**: I connettori possono invocare `ingestCsvRecords` o mappare direttamente su `AlignedRecord[]`.
- **Regole tariffarie internazionali**: `resolveAreraBand` può essere esteso con mappe per la Francia (Heures Pleines / Heures Creuses) o la Germania (variable spot tariffs).
- **Core Guard**: Il codice in `src/core/` deve rigorosamente rimanere sotto le **1.500 righe** di codice non vuote.
