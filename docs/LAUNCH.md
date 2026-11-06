# Launch Checklist & Promotion — EnergyOS v1.0.0

Checklist di rilascio e promozione per il lancio di EnergyOS v1.0.0.

## Quality & Governance Checklist

- [x] Testo integrale AGPL-3.0 in `LICENSE`
- [x] Percorso di licenza commerciale e OEM in `COMMERCIAL-LICENSE.md`
- [x] Contributor License Agreement in `CLA.md`
- [x] Mappatura licenze e attribuzioni in `LICENSING.md`
- [x] Canali di donazione configurati in `.github/FUNDING.yml`, CLI e README
- [x] Workflow GitHub Actions CI con guardia dimensionale core (< 1.500 LOC)
- [x] Test unitari nativi Node.js passanti al 100% (Node >= 22 e 24)
- [x] Zero dipendenze esterne a runtime (zero runtime dependencies)
- [x] Riconciliazione matematica precisa autoconsumo / prelievo / immissione
- [x] Classificazione fasce orarie ARERA F1/F2/F3 con calendario festività italiane e Pasquetta
- [x] Report da terminale con indicatori grafici Unicode e tabella fasce
- [x] Generatore di dashboard HTML interattiva standalone con grafici SVG integrati (zero CDN)
- [x] Parser CSV tollerante per separatori (virgole/punti e virgola) e formati numerici europei
- [x] Modalità demo interattiva integrata (`energyos demo`) con simulazione realistica 6 kWp
- [x] Documentazione bilingue (Italiano / Inglese) e demo SVG vettoriale
- [x] Marker anti-plagio registrati nel registro riservato `_provenance/EnergyOS.json`

## Promotion Strategy & Target Audiences

1. **Proprietari di impianti fotovoltaici e consumatori consapevoli**:
   - Gruppi Telegram, forum specialistici (EnergeticAmbiente, PLC Forum, Forum Fotovoltaico) e community Reddit (`r/fotovoltaico`, `r/italyfinance`).
   - Problema risolto: "La bolletta ti dice solo quanto hai speso in totale, l'app dell'inverter ti dice solo quanto hai prodotto. EnergyOS riconcilia le due cose ora per ora e ti dice il tuo vero autoconsumo e quanto hai risparmiato davvero."

2. **Installatori e professionisti dell'efficientamento energetico**:
   - Possibilità di generare audit energetici professionali per i clienti partendo dai dati del contatore 2G (CSV e-distribuzione / Portale Consumi).
   - Servizio white-label o licenza commerciale per studi tecnici.

3. **Community open-source e Home Automation**:
   - Show HN (Hacker News), GitHub Trending, community Home Assistant e OpenEMS.
   - Tagline: *EnergyOS — Local-first home energy & solar PV reconciliation engine with ARERA time bands and zero dependencies.*
