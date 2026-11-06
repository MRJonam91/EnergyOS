#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAreraBand, isItalianNationalHoliday } from "../core/bands.ts";
import { DEFAULT_ARERA_TARIFF, ENERGYOS_NAMESPACE } from "../core/constants.ts";
import { ingestCsvRecords, parseTariffConfig } from "../core/parser.ts";
import { reconcileEnergyFlows } from "../core/reconciler.ts";
import { simulateBatteryStorage, recommendOptimalBatterySizes } from "../core/battery.ts";
import { diagnoseEnergyCsv } from "../core/validator.ts";
import { evaluateCerIncentives } from "../core/cer.ts";
import { analyzeFlexibilityOpportunities } from "../core/advisor.ts";
import { computeItalianBill } from "../core/bill.ts";
import type { AlignedRecord, ReconciledInterval, TariffConfig } from "../core/types.ts";
import { generateHtmlReport } from "../report/html.ts";
import {
  renderBatteryReport,
  renderCerReport,
  renderDiagnosticsReport,
  renderFlexibilityReport,
  renderItalianBillReport,
  renderTerminalReport
} from "../report/terminal.ts";

const VERSION = "1.2.0-beta";
const SPONSOR_URL = "https://github.com/sponsors/MRJonam91";

function printHelp(): void {
  console.log(`
⚡ EnergyOS v${VERSION} — Household Energy & Solar Reconciliation Toolkit
Open-source, local-first energy intelligence for smart meters and solar PV.

USAGE:
  energyos compare --consumption <file.csv> [options]
  energyos battery --capacity <kWh> --consumption <file.csv> [options]
  energyos cer --consumption <file.csv> --generation <file.csv> [options]
  energyos advisor --consumption <file.csv> --generation <file.csv> [options]
  energyos bill --consumption <file.csv> [options]
  energyos demo [options]
  energyos doctor <file.csv>
  energyos serve [--port 3000]
  energyos bands [datetime]
  energyos sponsor
  energyos --help | --version

COMMANDS:
  compare       Reconcile consumption and generation CSV files against ARERA tariffs
  battery       Simulate battery storage (BSS) self-sufficiency & sizing curve
  cer           Evaluate Renewable Energy Community (CER) shared energy & GSE incentives
  advisor       Analyze Heat Pump & EV load shifting flexibility opportunities
  bill          Itemize complete Italian ARERA electricity bill & taxes
  demo          Run a realistic 7-day domestic simulation (6kW PV + heat pump)
  doctor        Pre-flight diagnostics & health check for energy telemetry CSV
  serve         Launch zero-dependency local browser preview server on localhost
  bands         Evaluate the ARERA time band (F1, F2, F3) for a given date/time
  sponsor       Display project support & donation links

OPTIONS:
  -c, --consumption <path>  Path to consumption CSV (smart meter / 2G meter)
  -g, --generation <path>   Path to solar generation CSV (inverter telemetry)
  -b, --battery <kWh>       Nominal battery storage capacity to simulate
  --cer                     Include Renewable Energy Community (CER) evaluation
  --advisor                 Include Heat Pump & EV load shifting advice
  --bill                    Include detailed ARERA bill breakdown
  -t, --tariff <path>       Path to custom tariff JSON (defaults to ARERA 2026)
  -o, --html <path>         Export interactive standalone HTML report
  --export-csv <path>       Export reconciled intervals to CSV
  -p, --port <number>       Port for local preview server (default: 3000)
  --json                    Output pure JSON for pipelines and automation
  -h, --help                Show this help message
  -v, --version             Show CLI version

EXAMPLES:
  energyos compare -c examples/sample-consumption.csv -g examples/sample-generation.csv --cer --advisor
  energyos battery --capacity 10 -c examples/sample-consumption.csv -g examples/sample-generation.csv
  energyos demo --battery 5 --cer --advisor --html report.html
  energyos doctor examples/sample-consumption.csv
  energyos serve --port 3000

SPONSOR & DONATIONS:
  Independent open-source development: ${SPONSOR_URL}
  Ko-fi: https://ko-fi.com/mrjonam | PayPal: https://paypal.me/manorollo
`);
}

/** Exports intervals array to RFC 4180 CSV */
export function exportIntervalsToCsv(intervals: ReconciledInterval[]): string {
  const header = "timestamp,band,consumption_kwh,generation_kwh,self_consumption_kwh,grid_import_kwh,grid_export_kwh,import_cost_eur,export_revenue_eur,net_cost_eur";
  const rows = intervals.map((i) =>
    [
      i.timestamp,
      i.band,
      i.consumptionKWh.toFixed(3),
      i.generationKWh.toFixed(3),
      i.directSelfConsumptionKWh.toFixed(3),
      i.gridImportKWh.toFixed(3),
      i.gridExportKWh.toFixed(3),
      i.importCost.toFixed(3),
      i.exportRevenue.toFixed(3),
      i.netCost.toFixed(3)
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

/** Generates realistic 7-day 15-minute simulation data */
export function generateDemoSimulation(): AlignedRecord[] {
  const records: AlignedRecord[] = [];
  const start = new Date(Date.UTC(2026, 4, 11, 0, 0, 0)); // Monday May 11, 2026
  const totalSlots = 7 * 24 * 4; // 7 days * 96 slots/day = 672 intervals of 15 min

  for (let i = 0; i < totalSlots; i++) {
    const current = new Date(start.getTime() + i * 15 * 60 * 1000);
    const hour = current.getUTCHours() + current.getUTCMinutes() / 60;
    const isWeekend = current.getUTCDay() === 0 || current.getUTCDay() === 6;

    // Household base load: 0.35 kW + morning/evening cooking & appliance peaks
    let powerKW = 0.35;
    if (hour >= 7 && hour < 9) powerKW += 1.2;
    if (hour >= 12 && hour < 14) powerKW += 1.8;
    if (hour >= 19 && hour < 22) powerKW += isWeekend ? 2.8 : 2.2;
    // Heat pump cycling
    if (hour >= 5 && hour < 8) powerKW += 0.9;
    // Fluctuation
    powerKW += Math.sin(i * 0.1) * 0.15;
    powerKW = Math.max(0.2, powerKW);

    // Solar PV generation (6 kWp theoretical array on clear spring day)
    let solarKW = 0;
    if (hour >= 6.5 && hour <= 19.5) {
      const solarPeak = Math.sin(((hour - 6.5) / 13) * Math.PI);
      const cloudFactor = 0.9 + Math.sin(i * 0.05) * 0.08;
      solarKW = Math.max(0, 5.2 * Math.pow(solarPeak, 1.3) * cloudFactor);
    }

    // Convert kW to 15-minute kWh (power * 0.25h)
    const consumptionKWh = Math.round(powerKW * 0.25 * 1000) / 1000;
    const generationKWh = Math.round(solarKW * 0.25 * 1000) / 1000;

    records.push({
      timestamp: current.toISOString(),
      epochMs: current.getTime(),
      date: current,
      consumptionKWh,
      generationKWh,
      intervalMinutes: 15
    });
  }

  return records;
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  if (argv.length === 0 || argv.includes("-h") || argv.includes("--help")) {
    printHelp();
    return;
  }

  if (argv.includes("-v") || argv.includes("--version")) {
    console.log(`energyos v${VERSION} (${ENERGYOS_NAMESPACE})`);
    return;
  }

  const command = argv[0];

  if (command === "sponsor") {
    console.log(`
♥ Sostieni il progetto open-source EnergyOS:
  • GitHub Sponsors: https://github.com/sponsors/MRJonam91
  • Ko-fi:           https://ko-fi.com/mrjonam
  • Buy Me a Coffee: https://buymeacoffee.com/mrjonam
  • PayPal:          https://paypal.me/manorollo
`);
    return;
  }

  if (command === "doctor") {
    const filePath = argv[1];
    if (!filePath) {
      console.error("Errore: specifica il file CSV da analizzare con 'energyos doctor <file.csv>'");
      process.exit(1);
    }
    try {
      const content = readFileSync(filePath, "utf-8");
      const diag = diagnoseEnergyCsv(content);
      if (argv.includes("--json")) {
        console.log(JSON.stringify(diag, null, 2));
      } else {
        console.log(renderDiagnosticsReport(diag));
      }
    } catch (err) {
      console.error(`Impossibile leggere file CSV: ${(err as Error).message}`);
      process.exit(1);
    }
    return;
  }

  if (command === "serve") {
    const portIdx = argv.indexOf("-p") !== -1 ? argv.indexOf("-p") : argv.indexOf("--port");
    const port = portIdx !== -1 && argv[portIdx + 1] ? parseInt(argv[portIdx + 1]!, 10) : 3000;
    const demoRecords = generateDemoSimulation();
    const { intervals, summary } = reconcileEnergyFlows(demoRecords, DEFAULT_ARERA_TARIFF);
    const batterySim = simulateBatteryStorage(intervals, { capacityKWh: 5 }, DEFAULT_ARERA_TARIFF);
    const cerResult = evaluateCerIncentives(intervals, 2.0);
    const flexReport = analyzeFlexibilityOpportunities(summary, intervals);
    const html = generateHtmlReport(summary, batterySim, cerResult, flexReport);

    const server = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });

    server.listen(port, () => {
      console.log(`⚡ EnergyOS Live Dashboard attivo su: http://localhost:${port}`);
      console.log("Premi Ctrl+C per arrestare il server.");
    });
    return;
  }

  if (command === "bands") {
    const inputDateStr = argv[1] ?? new Date().toISOString();
    const d = new Date(inputDateStr);
    if (isNaN(d.getTime())) {
      console.error(`Data non valida: ${inputDateStr}`);
      process.exit(1);
    }
    const band = resolveAreraBand(d);
    const holiday = isItalianNationalHoliday(d);
    console.log(`Data: ${d.toLocaleString("it-IT")} | Fascia ARERA: [${band}] ${holiday ? "(Festività nazionale)" : ""}`);
    return;
  }

  const isDemo = command === "demo";
  const isBattery = command === "battery";
  const isCer = command === "cer" || argv.includes("--cer");
  const isAdvisor = command === "advisor" || command === "shift" || argv.includes("--advisor");
  const isBill = command === "bill" || argv.includes("--bill");
  const isCompare = command === "compare" || (!isDemo && !isBattery && !isCer && !isAdvisor && !isBill && argv.includes("-c"));

  if (!isDemo && !isCompare && !isBattery && !isCer && !isAdvisor && !isBill) {
    console.error(`Comando sconosciuto: ${command}. Esegui "energyos --help" per la guida.`);
    process.exit(1);
  }

  const isJson = argv.includes("--json");
  const htmlIdx = argv.indexOf("--html") !== -1 ? argv.indexOf("--html") : argv.indexOf("-o");
  const htmlPath = htmlIdx !== -1 && argv[htmlIdx + 1] ? argv[htmlIdx + 1] : undefined;

  const exportCsvIdx = argv.indexOf("--export-csv");
  const exportCsvPath = exportCsvIdx !== -1 && argv[exportCsvIdx + 1] ? argv[exportCsvIdx + 1] : undefined;

  const batteryIdx = argv.indexOf("--battery") !== -1 ? argv.indexOf("--battery") : (isBattery && argv.indexOf("--capacity") !== -1 ? argv.indexOf("--capacity") : argv.indexOf("-b"));
  const batteryCap = batteryIdx !== -1 && argv[batteryIdx + 1] ? parseFloat(argv[batteryIdx + 1]!) : (isBattery ? 5 : undefined);

  let records: AlignedRecord[] = [];
  let tariff: TariffConfig = DEFAULT_ARERA_TARIFF;

  if (isDemo) {
    records = generateDemoSimulation();
  } else {
    const consIdx = argv.indexOf("--consumption") !== -1 ? argv.indexOf("--consumption") : argv.indexOf("-c");
    const genIdx = argv.indexOf("--generation") !== -1 ? argv.indexOf("--generation") : argv.indexOf("-g");
    const tariffIdx = argv.indexOf("--tariff") !== -1 ? argv.indexOf("--tariff") : argv.indexOf("-t");

    if (consIdx === -1 || !argv[consIdx + 1]) {
      console.error("Errore: specifica il file di consumo con --consumption <file.csv>");
      process.exit(1);
    }

    const consFile = argv[consIdx + 1]!;
    const genFile = genIdx !== -1 && argv[genIdx + 1] ? argv[genIdx + 1] : undefined;

    try {
      const consContent = readFileSync(consFile, "utf-8");
      const genContent = genFile ? readFileSync(genFile, "utf-8") : undefined;
      records = ingestCsvRecords(consContent, genContent);
    } catch (err) {
      console.error(`Errore durante la lettura dei file CSV: ${(err as Error).message}`);
      process.exit(1);
    }

    if (tariffIdx !== -1 && argv[tariffIdx + 1]) {
      try {
        const tariffContent = readFileSync(argv[tariffIdx + 1]!, "utf-8");
        tariff = parseTariffConfig(tariffContent);
      } catch (err) {
        console.warn(`Impossibile leggere tariffa personalizzata: ${(err as Error).message}. Uso ARERA default.`);
      }
    }
  }

  if (records.length === 0) {
    console.error("Nessun record valido trovato da analizzare.");
    process.exit(1);
  }

  const { intervals, summary } = reconcileEnergyFlows(records, tariff);

  let batteryResult = undefined;
  let sizingOptions = undefined;
  if (batteryCap && batteryCap > 0) {
    batteryResult = simulateBatteryStorage(intervals, { capacityKWh: batteryCap }, tariff);
    sizingOptions = recommendOptimalBatterySizes(intervals, tariff);
  }

  let cerResult = undefined;
  if (isCer) {
    cerResult = evaluateCerIncentives(intervals, 1.8);
  }

  let flexReport = undefined;
  if (isAdvisor) {
    flexReport = analyzeFlexibilityOpportunities(summary, intervals);
  }

  let billResult = undefined;
  if (isBill) {
    billResult = computeItalianBill(summary, tariff);
  }

  if (exportCsvPath) {
    const csvContent = exportIntervalsToCsv(intervals);
    writeFileSync(exportCsvPath, csvContent, "utf-8");
    if (!isJson) {
      console.log(`✓ Intervalli riconciliati esportati in CSV: ${exportCsvPath}`);
    }
  }

  if (htmlPath) {
    const html = generateHtmlReport(summary, batteryResult, cerResult, flexReport);
    writeFileSync(htmlPath, html, "utf-8");
    if (!isJson) {
      console.log(`✓ Report HTML esportato con successo in: ${htmlPath}`);
    }
  }

  if (isJson) {
    console.log(JSON.stringify({ summary, battery: batteryResult, sizingOptions, cer: cerResult, flexibility: flexReport, bill: billResult }, null, 2));
    return;
  }

  // 1 in 10 chance of showing discrete sponsor notice
  const showSponsor = Math.random() < 0.1 || argv.includes("--sponsor");
  console.log(renderTerminalReport(summary, showSponsor));

  if (batteryResult) {
    console.log("\n" + renderBatteryReport(batteryResult, sizingOptions));
  }

  if (cerResult) {
    console.log("\n" + renderCerReport(cerResult));
  }

  if (flexReport) {
    console.log("\n" + renderFlexibilityReport(flexReport));
  }

  if (billResult) {
    console.log("\n" + renderItalianBillReport(billResult));
  }
}

// Auto-run if executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli().catch((err) => {
    console.error("Errore irreversibile:", err);
    process.exit(1);
  });
}
