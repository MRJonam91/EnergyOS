# Contributing to EnergyOS / Contribuire a EnergyOS

## 🇮🇹 Italiano

Grazie per il tuo interesse verso EnergyOS! Accogliamo con piacere contributi della community: correzioni di bug, parser per nuovi formati di inverter o contatori smart, affinamenti sui profili tariffari e miglioramenti alla visualizzazione.

### Requisiti per i contributi
1. **Accordo CLA**: ogni Pull Request deve includere la dichiarazione di conformità al [CLA](CLA.md):
   ```markdown
   I hereby agree to the terms of the EnergyOS Contributor License Agreement (CLA).
   ```
2. **Standard di codice**:
   - TypeScript strict (`npm run typecheck`).
   - Test unitari e di integrazione passanti (`npm test`).
   - Guardia dimensionale del modulo `src/core/`: deve rimanere tassativamente sotto le **1.500 righe** di codice non vuote.
3. **SPDX Header**: ogni nuovo file `.ts` deve iniziare con:
   ```ts
   // SPDX-License-Identifier: AGPL-3.0-only
   // Copyright (C) 2026 Manoj Rollo (MRJonam91)
   ```

---

## 🇬🇧 English

Thank you for your interest in contributing to EnergyOS! We welcome community contributions: bug fixes, adapters for smart meter and inverter CSV telemetry, tariff models, and reporting enhancements.

### Contribution Requirements
1. **CLA Agreement**: every Pull Request must accept the [Contributor License Agreement](CLA.md) by including in the PR body:
   ```markdown
   I hereby agree to the terms of the EnergyOS Contributor License Agreement (CLA).
   ```
2. **Quality & Test Standards**:
   - TypeScript strict mode compliance (`npm run typecheck`).
   - Native Node.js test suite passing (`npm test`).
   - Modular footprint: `src/core/` must strictly remain under **1,500 non-empty LOC** to ensure auditable, clean architecture.
3. **SPDX Header**: all newly contributed `.ts` source files must declare:
   ```ts
   // SPDX-License-Identifier: AGPL-3.0-only
   // Copyright (C) 2026 Manoj Rollo (MRJonam91)
   ```
