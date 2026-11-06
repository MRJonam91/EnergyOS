# Changelog — EnergyOS

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0-alpha] - 2026-11-06

### Added
- **Battery Storage Simulation & Sizing Engine (`src/core/battery.ts`)**:
  - Full electrochemical simulation of battery charging from excess solar and discharging during household deficits.
  - Honors min/max SoC limits, C-rate charge/discharge power limits, and roundtrip efficiency losses ($\eta$).
  - Computes additional self-consumption, avoided grid imports, equivalent full cycles, and financial delta.
  - Optimal battery sizing curve (`recommendOptimalBatterySizes`) recommending capacity sweet spots (3 to 20 kWh).
  - CLI command `energyos battery --capacity <kWh>` and `--battery <kWh>` flag in `compare` and `demo`.
- **Pre-Flight Telemetry Diagnostics & Validator (`src/core/validator.ts`)**:
  - Automated detection of Italian Portale Consumi, Shelly EM / 3EM, Huawei FusionSolar, and SolarEdge CSV formats.
  - Delimiter and timestamp health check, detection of negative values, unparseable lines, and sampling rate.
  - CLI command `energyos doctor <file.csv>` with terminal diagnosis report or JSON output.
- **Detailed Italian ARERA Bill Decomposition (`src/core/bill.ts`)**:
  - Full itemization into: Spesa Materia Energia, Spesa Trasporto e Gestione Contatore (quota fissa + quota potenza), Oneri Generali di Sistema (ASOS/ARIM), Accise con esenzione prima casa/residente, e IVA 10%.
- **Zero-Dependency Live Preview Server (`energyos serve`)**:
  - Local HTTP server running on `localhost:3000` via native `node:http`.
- **Expanded Test Coverage**:
  - Added 7 new unit tests for battery physics, CSV presets validation, and Italian bill decomposition (total: 20 passing tests).

## [1.0.0] - 2026-11-06

### Added
- **Core Energy Reconciliation Engine**:
  - Reconciles smart meter consumption and local generation (solar PV) time series at 15-minute and hourly resolutions.
  - Mathematical calculation of direct self-consumption ($SC = \min(G, C)$), grid import ($I = \max(0, C - G)$), and grid feed-in / export ($E = \max(0, G - C)$).
  - Metrics computation: self-consumption percentage (quota autoconsumo), self-sufficiency percentage (autosufficienza energetica), and peak power demand.
- **ARERA Time Band Classifier**:
  - Full implementation of Italian ARERA multioraria time bands (F1, F2, F3).
  - Handles Italian national holidays (Capodanno, Epifania, Pasquetta, 25 Aprile, 1 Maggio, 2 Giugno, Ferragosto, Ognissanti, Immacolata, Natale, Santo Stefano).
  - Flexible support for custom time band schedules, flat rate (monoraria), and bioraria (F1 / F23).
- **Tariff & Financial Comparison**:
  - Calculates observed imported energy cost by time slot.
  - Evaluates grid feed-in revenue (Ritiro Dedicato / RID / spot price).
  - Computes baseline cost without solar vs actual net costs and direct savings realized.
- **Robust Local CSV Ingestion Engine**:
  - Auto-detection of CSV delimiters (`,`, `;`, `\t`).
  - Support for European decimal formatting (`0,15` vs `0.15`).
  - Automatic column recognition for timestamps, power (W, kW) and energy (Wh, kWh).
  - Supports both unified datasets and dual-file inputs (separate consumption + solar production CSVs).
- **Rich Terminal Reporting & Visual Charts**:
  - ASCII/Unicode CLI comparison report with visual progress bars, metrics cards, and time slot cost breakdown.
  - Discreet sponsor notice mechanism with `NO_SPONSOR=1` support.
- **Interactive HTML/SVG Visual Dashboard**:
  - Standalone, zero-CDN HTML report with embedded responsive SVG bar charts, band distribution donut charts, and hourly load curves.
- **CLI Commands**:
  - `energyos compare`: process CSV files with custom tariffs and export to terminal, JSON, or interactive HTML.
  - `energyos demo`: run simulated 6kW PV household scenario with instant visual output.
  - `energyos bands`: inspect ARERA time band for any given timestamp.
  - `energyos sponsor`: display donation channels.
- **Standards & Legal Framework**:
  - AGPL-3.0-only license with dual licensing / commercial pathway and CLA.
  - GitHub funding configuration (`.github/FUNDING.yml`).
  - CI workflow with strict size guard (< 1500 LOC core).
