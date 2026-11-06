# Changelog — EnergyOS

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-06 — General Availability (GA)

### Added
- **Core Energy Reconciliation Engine**:
  - Reconciles smart meter consumption and local generation (solar PV) time series at 15-minute and hourly resolutions.
  - Mathematical calculation of direct self-consumption ($SC = \min(G, C)$), grid import ($I = \max(0, C - G)$), and grid feed-in / export ($E = \max(0, G - C)$).
  - Metrics computation: self-consumption percentage (quota autoconsumo), self-sufficiency percentage (autosufficienza energetica), and peak power demand.
- **ARERA Time Band Classifier**:
  - Full implementation of Italian ARERA multioraria time bands (F1, F2, F3).
  - Handles Italian national holidays (Capodanno, Epifania, Pasquetta, 25 Aprile, 1 Maggio, 2 Giugno, Ferragosto, Ognissanti, Immacolata, Natale, Santo Stefano).
  - Flexible support for custom time band schedules, flat rate (monoraria), and bioraria (F1 / F23).
- **Battery Storage Simulation & Sizing Engine (`src/core/battery.ts`)**:
  - Full electrochemical simulation of battery charging from excess solar and discharging during household deficits.
  - Honors min/max SoC limits, C-rate charge/discharge power limits, and roundtrip efficiency losses ($\eta$).
  - Computes additional self-consumption, avoided grid imports, equivalent full cycles, and financial delta.
  - Optimal battery sizing curve (`recommendOptimalBatterySizes`) recommending capacity sweet spots (3 to 20 kWh).
  - CLI command `energyos battery --capacity <kWh>` and `--battery <kWh>` flag in `compare` and `demo`.
- **Renewable Energy Community (CER) Simulation Engine (`src/core/cer.ts`)**:
  - Models shared energy flows ($E_{\text{shared}} = \min(\sum \text{inject}, \sum \text{withdraw})$) for primary electrical substations (cabina primaria).
  - Calculates cumulative GSE TIP tariff incentive and ARERA TIAC transmission tariff restitution.
  - Automatic quota redistribution between prosumers (solar producers), consumer members, and CER administrative fund.
  - CLI subcommand `energyos cer` and flag `--cer`.
- **Heat Pump & EV Load Shifting Advisor (`src/core/advisor.ts`)**:
  - Flexibility analysis detecting optimal solar surplus windows.
  - Actionable recommendations for pre-heating Domestic Hot Water (DHW / ACS), delayed appliance cycles, and EV smart wallbox scheduling.
  - Quantified financial potential from avoiding peak F1/F2 imports.
  - CLI subcommand `energyos advisor` and flag `--advisor`.
- **Detailed Italian ARERA Bill Decomposition (`src/core/bill.ts`)**:
  - Full itemization into: Spesa Materia Energia, Spesa Trasporto e Gestione Contatore (quota fissa + quota potenza), Oneri Generali di Sistema (ASOS/ARIM), Accise con esenzione prima casa/residente, e IVA 10%.
  - CLI subcommand `energyos bill` and flag `--bill`.
- **Pre-Flight Telemetry Diagnostics & Validator (`src/core/validator.ts`)**:
  - Automated detection of Italian Portale Consumi, Shelly EM / 3EM, Huawei FusionSolar, and SolarEdge CSV formats.
  - Delimiter and timestamp health check, detection of negative values, unparseable lines, and sampling rate.
  - CLI command `energyos doctor <file.csv>` with terminal diagnosis report or JSON output.
- **Interval-level RFC 4180 CSV Exporter**:
  - Option `--export-csv <path>` to export every 15-minute / hourly reconciled interval into standardized CSV.
- **Zero-Dependency Live Preview Server (`energyos serve`)**:
  - Local HTTP server running on `localhost:3000` via native `node:http`.
- **Rich Terminal Reporting & Visual Charts**:
  - ASCII/Unicode CLI comparison report with visual progress bars, metrics cards, and time slot cost breakdown.
  - Discreet sponsor notice mechanism with `NO_SPONSOR=1` support.
- **Interactive HTML/SVG Visual Dashboard**:
  - Standalone, zero-CDN HTML report with embedded responsive SVG bar charts, band distribution donut charts, and hourly load curves.
- **Standards & Legal Framework**:
  - AGPL-3.0-only license with dual licensing / commercial pathway and CLA.
  - GitHub funding configuration (`.github/FUNDING.yml`).
  - CI workflow with strict size guard (< 1500 LOC core).
  - 23 native tests with 100% pass rate.
