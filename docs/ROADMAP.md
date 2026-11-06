# Piano di Sviluppo & Roadmap / Development Plan & Roadmap — EnergyOS

## 🎯 Visione di Progetto / Project Vision

**EnergyOS** è un sistema operativo e toolkit open-source, rigorosamente local-first e a zero dipendenze esterne, progettato per colmare il divario tra i dati frammentati dei contatori intelligenti (2G), i monitor di produzione solare fotovoltaica e le complesse tariffe multioraria ARERA.

Offre trasparenza energetica assoluta, calcolo del vero autoconsumo, dimensionamento scientifico delle batterie, valutazione economica delle Comunità Energetiche (CER) e ottimizzazione dei carichi flessibili (pompe di calore e veicoli elettrici), senza che nessun dato domestico privato lasci mai il computer dell'utente.

---

## 📅 Fasi di Sviluppo / Development Phases

### ✅ Fase 1 — Motore Core & Intelligence Locale (v1.0.0 — General Availability)
*Rilasciata con successo in data 2026-11-06.*

- [x] **Ingestione & Normalizzazione Telemetrie**:
  - Parser CSV tollerante a separatori (`,`, `;`, `\t`) e decimali europei (`0,28` vs `0.28`).
  - Pre-flight diagnostic engine (`energyos doctor`) con rilevamento automatico di formati: **Portale Consumi ARERA**, **Shelly EM / Pro 3EM**, **Huawei FusionSolar** e **SolarEdge**.
- [x] **Risolutore Fasce ARERA Multioraria (F1 / F2 / F3)**:
  - Classificazione esatta per ore di picco (F1), intermedie (F2) e fuori picco (F3).
  - Gestione automatica del calendario completo delle festività nazionali italiane e calcolo astronomico della Pasquetta.
- [x] **Riconciliazione Matematica dei Flussi Energetici**:
  - Calcolo esatto di autoconsumo istantaneo $SC = \min(G, C)$, prelievo da rete $I = \max(0, C - G)$ e immissione $E = \max(0, G - C)$.
  - Indicatori di quota di autoconsumo ($\%$) e grado di autosufficienza ($\%$).
- [x] **Simulatore Sistemi di Accumulo a Batteria (BSS)**:
  - Modellazione elettrochimica con soglie SoC (min/max), limiti C-rate e rendimento roundtrip.
  - Curva di dimensionamento automatico da 3 a 20 kWh con individuazione del punto di massimo rendimento marginale (*sweet spot*).
- [x] **Comunità Energetiche Rinnovabili (CER) & Autoconsumo Diffuso**:
  - Calcolo dell'energia condivisa oraria su cabina primaria.
  - Valutazione economica degli incentivi GSE: Tariffa Premio (TIP) e restituzione tariffa di trasmissione ARERA (TIAC).
  - Ripartizione configurabile tra prosumer, consumatori e gestione CER.
- [x] **Advisor di Flessibilità & Load Shifting**:
  - Identificazione finestre di surplus fotovoltaico.
  - Strategie pratiche per pre-riscaldamento ACS con pompa di calore, elettrodomestici ritardati e ricarica smart wallbox per veicoli elettrici (EV).
- [x] **Decomposizione Completa Bolletta ARERA**:
  - Voci analitiche per spesa materia energia (consumo + PCV fisso), trasporto (quota fissa + quota potenza contatore €/kW/mese), oneri generali ASOS/ARIM, accise con esenzione residenti e IVA.
- [x] **Interfaccia Multi-Canale**:
  - Visualizzazione a terminale con indicatori grafici Unicode.
  - Esportatore di dashboard HTML interattiva standalone con grafici vettoriali SVG integrati (zero CDN).
  - Server HTTP locale su browser (`energyos serve --port 3000`).
  - Esportatore di intervalli riconciliati in CSV (`--export-csv`).
- [x] **Suite di Test Completa**:
  - 23 test unitari nativi con copertura al 100% e guardia dimensionale del core (< 1.500 LOC).

---

### ⏳ Fase 2 — Connettività Real-Time & Integrazioni Smart Home (v1.1.0)
*Pianificata per Q1 2027.*

- [ ] **Connettori Real-Time Modbus TCP / SunSpec**:
  - Polling diretto su rete locale degli inverter (SolarEdge, Fronius, Huawei, SMA, Victron) senza passare da cloud terzi.
- [ ] **Bridge MQTT & Addon Home Assistant**:
  - Pubblicazione automatica dei sensori di potenza istantanea e stato di carica batteria via protocollo MQTT discovery per Home Assistant.
- [ ] **Integrazione Prezzi Spot Dinamici PUN Orario**:
  - Recupero automatico dei prezzi orari PUN dal Gestore dei Mercati Energetici (GME) con stima in tempo reale delle soglie di convenienza per carichi dinamici.

---

### 🔭 Fase 3 — Microgrid & Ottimizzazione Autonoma (v2.0.0)
*Pianificata per Q3 2027.*

- [ ] **Agente Locale Predittivo basato su Previsioni Meteo**:
  - Integrazione modelli solari locali Open-Meteo / PVGIS per anticipare picchi di insolazione e calibrare cicli di carica della batteria con 24 ore di anticipo.
- [ ] **Gestione Multi-Edificio & Microgrid Privata**:
  - Bilanciamento carichi su impianti plurifamiliari con ripartizione interna delle quote di autoconsumo.
