# EnergyOS: decision seed / punto di partenza

IT — Scopo: Consumi domestici e produzione locale sono difficili da confrontare. Prima prova: Import CSV di consumi e tariffe con grafico di costo osservato per fascia oraria.

EN — Purpose: Household consumption and local generation are hard to compare. First trial: Import consumption and tariff CSVs with observed cost by time band.

## Stato di implementazione / Implementation status (v1.0.0 General Availability)

- [x] Nome confermato: `EnergyOS` (`energyos`)
- [x] Prima prova verificabile completata: import e allineamento CSV consumi e produzione con calcolo autoconsumo, prelievo e immissione
- [x] Suddivisione per fasce ARERA multioraria (F1, F2, F3) con calendario festività italiane e Pasquetta
- [x] Simulazione accumulo a batteria (BSS) e curva di dimensionamento consigliato
- [x] Modello di Comunità Energetiche Rinnovabili (CER) e incentivi GSE TIP + restituzione TIAC ARERA
- [x] Advisor flessibilità di carico per pompe di calore ACS e ricarica veicoli elettrici
- [x] Decomposizione completa della bolletta elettrica italiana ARERA (energia, trasporto, oneri, accise, IVA)
- [x] Report grafico da terminale con barre Unicode e tabella fasce
- [x] Dashboard interattiva HTML standalone con grafici SVG integrati (zero CDN)
- [x] Server di anteprima locale su browser (`energyos serve`)
- [x] Applicato `../_repo-kit/REPO-STANDARDS.md`:
  - Licenza `AGPL-3.0-only` + `COMMERCIAL-LICENSE.md` + `CLA.md` + `LICENSING.md`
  - Donazioni in `.github/FUNDING.yml`, README e CLI
  - CI con typecheck, test e guardia core < 1.500 righe
  - Audit di qualità e integrità del codice superato
