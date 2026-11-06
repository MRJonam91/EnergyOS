# Changelog — EnergyOS

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
