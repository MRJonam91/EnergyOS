// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Manoj Rollo (MRJonam91)

import type { FlexibilityReport } from "../core/advisor.ts";
import type { CerEvaluationResult } from "../core/cer.ts";
import type { BatterySimulationResult, EnergyAuditSummary } from "../core/types.ts";

/** Generates responsive SVG for 24-hour profile */
function renderHourlyProfileSvg(profile: EnergyAuditSummary["hourlyAverageProfile"]): string {
  const width = 760;
  const height = 240;
  const pad = { top: 20, right: 30, bottom: 35, left: 45 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  let maxVal = 0.5;
  for (const p of profile) {
    maxVal = Math.max(maxVal, p.avgConsumptionKWh, p.avgGenerationKWh);
  }
  maxVal = Math.ceil(maxVal * 1.2 * 10) / 10;

  const getX = (hour: number) => pad.left + (hour / 23) * chartW;
  const getY = (val: number) => pad.top + chartH - (val / maxVal) * chartH;

  const pointsCons = profile.map((p) => `${getX(p.hour).toFixed(1)},${getY(p.avgConsumptionKWh).toFixed(1)}`).join(" ");
  const pointsGen = profile.map((p) => `${getX(p.hour).toFixed(1)},${getY(p.avgGenerationKWh).toFixed(1)}`).join(" ");
  const pointsSc = profile.map((p) => `${getX(p.hour).toFixed(1)},${getY(p.avgSelfConsumptionKWh).toFixed(1)}`).join(" ");

  const areaGen = `${getX(0)},${getY(0)} ` + pointsGen + ` ${getX(23)},${getY(0)}`;

  let xLabels = "";
  for (let h = 0; h <= 23; h += 3) {
    xLabels += `<text x="${getX(h)}" y="${height - 10}" font-size="11" fill="#718096" text-anchor="middle">${h}:00</text>`;
  }

  let yLabels = "";
  for (let step = 0; step <= 4; step++) {
    const val = (maxVal / 4) * step;
    const y = getY(val);
    yLabels += `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="#edf2f7" stroke-dasharray="3,3" />`;
    yLabels += `<text x="${pad.left - 8}" y="${y + 4}" font-size="10" fill="#a0aec0" text-anchor="end">${val.toFixed(1)}</text>`;
  }

  return `
  <svg viewBox="0 0 ${width} ${height}" class="chart-svg" xmlns="http://www.w3.org/2000/svg">
    ${yLabels}
    <polygon points="${areaGen}" fill="rgba(245, 158, 11, 0.15)" />
    <polyline points="${pointsCons}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" />
    <polyline points="${pointsGen}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" />
    <polyline points="${pointsSc}" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="4,3" />
    ${xLabels}
  </svg>`;
}

/** Generates responsive SVG for band comparison */
function renderBandComparisonSvg(byBand: EnergyAuditSummary["byBand"]): string {
  const bands = Object.values(byBand);
  const width = 500;
  const height = 180;
  const pad = { top: 20, right: 30, bottom: 30, left: 45 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  let maxVal = 1;
  for (const b of bands) {
    maxVal = Math.max(maxVal, b.consumptionKWh, b.gridImportKWh);
  }

  const barGroupW = chartW / Math.max(1, bands.length);
  const barW = Math.min(32, barGroupW * 0.35);

  let bars = "";
  let xLabels = "";

  bands.forEach((b, i) => {
    const groupCenter = pad.left + i * barGroupW + barGroupW / 2;
    const x1 = groupCenter - barW - 2;
    const x2 = groupCenter + 2;

    const hCons = (b.consumptionKWh / maxVal) * chartH;
    const hImp = (b.gridImportKWh / maxVal) * chartH;

    const yCons = pad.top + chartH - hCons;
    const yImp = pad.top + chartH - hImp;

    bars += `<rect x="${x1}" y="${yCons}" width="${barW}" height="${hCons}" rx="3" fill="#3b82f6" opacity="0.85"><title>Consumo ${b.band}: ${b.consumptionKWh} kWh</title></rect>`;
    bars += `<rect x="${x2}" y="${yImp}" width="${barW}" height="${hImp}" rx="3" fill="#ef4444" opacity="0.85"><title>Prelievo ${b.band}: ${b.gridImportKWh} kWh</title></rect>`;

    xLabels += `<text x="${groupCenter}" y="${height - 10}" font-size="12" font-weight="600" fill="#4a5568" text-anchor="middle">${b.band}</text>`;
  });

  return `
  <svg viewBox="0 0 ${width} ${height}" class="chart-svg" xmlns="http://www.w3.org/2000/svg">
    <line x1="${pad.left}" y1="${pad.top + chartH}" x2="${width - pad.right}" y2="${pad.top + chartH}" stroke="#cbd5e0" />
    ${bars}
    ${xLabels}
  </svg>`;
}

/** Generates complete standalone HTML report */
export function generateHtmlReport(
  summary: EnergyAuditSummary,
  batteryResult?: BatterySimulationResult,
  cerResult?: CerEvaluationResult,
  flexReport?: FlexibilityReport
): string {
  const profileSvg = renderHourlyProfileSvg(summary.hourlyAverageProfile);
  const bandSvg = renderBandComparisonSvg(summary.byBand);

  const bandRows = Object.values(summary.byBand)
    .map(
      (b) => `
    <tr>
      <td><strong>${b.band}</strong> <span class="badge-desc">${b.description ?? ""}</span></td>
      <td>${b.consumptionKWh.toFixed(2)} kWh</td>
      <td>${b.directSelfConsumptionKWh.toFixed(2)} kWh</td>
      <td>${b.gridImportKWh.toFixed(2)} kWh</td>
      <td>${b.gridExportKWh.toFixed(2)} kWh</td>
      <td>€${b.baselineCostWithoutSolar.toFixed(2)}</td>
      <td><strong>€${b.netCost.toFixed(2)}</strong></td>
      <td class="savings-text">+€${b.directSavings.toFixed(2)}</td>
    </tr>`
    )
    .join("");

  const batterySection = batteryResult
    ? `
    <div class="feature-card battery-card">
      <div class="feature-header">
        <h2>🔋 Simulazione Sistema di Accumulo (BSS) — ${batteryResult.capacityKWh} kWh</h2>
        <span class="badge-tag green-tag">Autonomia Elettrica Estesa</span>
      </div>
      <div class="cards-grid" style="margin-top: 1rem;">
        <div class="card">
          <div class="card-label">Autosufficienza con Batteria</div>
          <div class="card-val val-success">${batteryResult.simulatedSelfSufficiencyPct}%</div>
          <div class="card-sub">Da ${batteryResult.initialSelfSufficiencyPct}% iniziale (+${(batteryResult.simulatedSelfSufficiencyPct - batteryResult.initialSelfSufficiencyPct).toFixed(1)}%)</div>
        </div>
        <div class="card">
          <div class="card-label">Energia Erogata da Batteria</div>
          <div class="card-val val-solar">${batteryResult.totalDischargedKWh.toFixed(1)} kWh</div>
          <div class="card-sub">${batteryResult.equivalentFullCycles} cicli completi equivalenti</div>
        </div>
        <div class="card">
          <div class="card-label">Prelievo Rete Evitato</div>
          <div class="card-val val-primary">${batteryResult.avoidedGridImportKWh.toFixed(1)} kWh</div>
          <div class="card-sub">Residuo da rete: ${batteryResult.residualGridImportKWh.toFixed(1)} kWh</div>
        </div>
        <div class="card">
          <div class="card-label">Extra Risparmio Economico</div>
          <div class="card-val val-savings">+€${batteryResult.additionalFinancialSavings.toFixed(2)}</div>
          <div class="card-sub">Guadagno netto addizionale nel periodo</div>
        </div>
      </div>
    </div>`
    : "";

  const cerSection = cerResult
    ? `
    <div class="feature-card cer-card">
      <div class="feature-header">
        <h2>👥 Comunità Energetica Rinnovabile (CER) &amp; Autoconsumo Diffuso</h2>
        <span class="badge-tag indigo-tag">Incentivo TIP GSE + ARERA TIAC</span>
      </div>
      <div class="cards-grid" style="margin-top: 1rem;">
        <div class="card">
          <div class="card-label">Energia Condivisa (Shared)</div>
          <div class="card-val val-indigo">${cerResult.totalSharedEnergyKWh.toFixed(1)} kWh</div>
          <div class="card-sub">${cerResult.cerSelfConsumptionRatePct}% dell'immissione condivisa con la cabina primaria</div>
        </div>
        <div class="card">
          <div class="card-label">Incentivo Totale CER</div>
          <div class="card-val val-savings">+€${cerResult.totalIncentiveEur.toFixed(2)}</div>
          <div class="card-sub">Incentivo ventennale cumulabile con il RID</div>
        </div>
        <div class="card">
          <div class="card-label">Quota Produttore (Prosumer)</div>
          <div class="card-val val-solar">+€${cerResult.producerIncentiveEur.toFixed(2)}</div>
          <div class="card-sub">Accreditato direttamente all'impianto fotovoltaico</div>
        </div>
        <div class="card">
          <div class="card-label">Ristorno Consumatori (Membri)</div>
          <div class="card-val val-primary">+€${cerResult.consumersIncentiveEur.toFixed(2)}</div>
          <div class="card-sub">Condiviso tra i vicini di casa e le attività locali</div>
        </div>
      </div>
    </div>`
    : "";

  const flexSection = flexReport
    ? `
    <div class="feature-card flex-card">
      <div class="feature-header">
        <h2>💡 Flessibilità di Carico: Pompa di Calore &amp; Ricarica Auto EV</h2>
        <span class="badge-tag amber-tag">Finestra Ottimale: ${flexReport.optimalSolarWindowHours.start}:00 – ${flexReport.optimalSolarWindowHours.end}:00</span>
      </div>
      <p style="font-size: 0.9rem; color: #4b5563; margin-top: 0.5rem;">
        Spostando i carichi flessibili nelle ore di surplus solare puoi evitare <strong>${flexReport.flexibilityPotentialKWh} kWh</strong> di prelievi in fascia F1/F2, risparmiando fino a <strong>+€${flexReport.estimatedAnnualSavingsEur.toFixed(2)} all'anno</strong>.
      </p>
      <div class="actions-list" style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
        ${flexReport.actions.map((act) => `
          <div class="action-item">
            <strong>${act.title}</strong> &bull; Orario consigliato: <span class="action-badge">${act.recommendedTimeWindow}</span>
            <div style="font-size: 0.85rem; color: #6b7280; margin-top: 0.25rem;">${act.reason} (Risparmio stimato: +€${act.expectedAnnualSavingsEur}/anno)</div>
          </div>
        `).join("")}
      </div>
    </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EnergyOS Audit Report — ${summary.tariffName}</title>
  <style>
    :root {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --primary: #2563eb;
      --solar: #f59e0b;
      --success: #10b981;
      --danger: #ef4444;
      --indigo: #6366f1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2rem 1.5rem;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    header { margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; }
    h1 { font-size: 1.85rem; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 0.5rem; }
    .subtitle { color: var(--muted); font-size: 0.95rem; margin-top: 0.25rem; }
    .tariff-badge { background: #e0e7ff; color: #3730a3; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 600; font-size: 0.85rem; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .card-label { font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); margin-bottom: 0.5rem; }
    .card-val { font-size: 1.85rem; font-weight: 800; color: #1e293b; }
    .card-sub { font-size: 0.82rem; color: var(--muted); margin-top: 0.25rem; }
    .val-savings { color: var(--success); }
    .val-solar { color: var(--solar); }
    .val-primary { color: var(--primary); }
    .val-success { color: #059669; }
    .val-indigo { color: var(--indigo); }
    .feature-card { border-radius: 14px; padding: 1.5rem; margin-bottom: 2rem; }
    .battery-card { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .cer-card { background: #f5f3ff; border: 1px solid #ddd6fe; }
    .flex-card { background: #fffbeb; border: 1px solid #fef3c7; }
    .feature-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .feature-header h2 { font-size: 1.25rem; font-weight: 700; color: #1f2937; }
    .badge-tag { padding: 0.2rem 0.6rem; border-radius: 9999px; font-weight: 600; font-size: 0.8rem; }
    .green-tag { background: #dcfce7; color: #15803d; }
    .indigo-tag { background: #e0e7ff; color: #4338ca; }
    .amber-tag { background: #fef3c7; color: #b45309; }
    .action-item { background: #ffffff; border: 1px solid #fde68a; border-radius: 8px; padding: 0.85rem; }
    .action-badge { background: #fef3c7; color: #92400e; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.85rem; }
    .charts-row { display: grid; grid-template-columns: 3fr 2fr; gap: 1.5rem; margin-bottom: 2rem; }
    @media (max-width: 860px) { .charts-row { grid-template-columns: 1fr; } }
    .chart-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; }
    .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .chart-title { font-size: 1.05rem; font-weight: 700; }
    .legend { display: flex; gap: 1rem; font-size: 0.8rem; font-weight: 600; color: var(--muted); flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 0.35rem; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot-blue { background: #3b82f6; }
    .dot-yellow { background: #f59e0b; }
    .dot-green { background: #10b981; }
    .dot-red { background: #ef4444; }
    .chart-svg { width: 100%; height: auto; display: block; }
    .table-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 2rem; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.92rem; }
    th { background: #f1f5f9; padding: 0.85rem 1rem; font-weight: 600; color: #475569; border-bottom: 1px solid var(--border); }
    td { padding: 0.85rem 1rem; border-bottom: 1px solid var(--border); }
    tr:last-child td { border-bottom: none; }
    .badge-desc { font-size: 0.75rem; color: var(--muted); font-weight: normal; margin-left: 0.35rem; }
    .savings-text { color: var(--success); font-weight: 700; }
    footer { text-align: center; font-size: 0.85rem; color: var(--muted); margin-top: 2rem; border-top: 1px solid var(--border); padding-top: 1.5rem; }
    footer a { color: var(--primary); text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>⚡ EnergyOS Audit Report</h1>
        <div class="subtitle">Periodo: ${summary.periodStart.slice(0, 10)} &rarr; ${summary.periodEnd.slice(0, 10)} &bull; ${summary.durationHours} ore analizzate</div>
      </div>
      <div>
        <span class="tariff-badge">${summary.tariffName}</span>
      </div>
    </header>

    <div class="cards-grid">
      <div class="card">
        <div class="card-label">Autoconsumo Solare</div>
        <div class="card-val val-solar">${summary.metrics.selfConsumptionPct}%</div>
        <div class="card-sub">${summary.totals.directSelfConsumptionKWh.toFixed(1)} kWh autoconsumati su ${summary.totals.generationKWh.toFixed(1)} kWh solari</div>
      </div>
      <div class="card">
        <div class="card-label">Autosufficienza</div>
        <div class="card-val val-primary">${summary.metrics.selfSufficiencyPct}%</div>
        <div class="card-sub">Quadro consumi coperto dall'energia solare</div>
      </div>
      <div class="card">
        <div class="card-label">Dipendenza dalla Rete</div>
        <div class="card-val">${summary.metrics.gridDependencePct}%</div>
        <div class="card-sub">${summary.totals.gridImportKWh.toFixed(1)} kWh prelevati dalla rete elettrica</div>
      </div>
      <div class="card">
        <div class="card-label">Risparmio Netto Bolletta</div>
        <div class="card-val val-savings">€${summary.financial.netSavings.toFixed(2)}</div>
        <div class="card-sub">-${summary.financial.savingsPct}% rispetto al costo senza fotovoltaico (€${summary.financial.baselineCostWithoutSolar.toFixed(2)})</div>
      </div>
    </div>

    ${batterySection}
    ${cerSection}
    ${flexSection}

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">Profilo Orario Medio Giornaliero (24h)</div>
          <div class="legend">
            <div class="legend-item"><span class="dot dot-blue"></span> Consumo</div>
            <div class="legend-item"><span class="dot dot-yellow"></span> Produzione Solare</div>
            <div class="legend-item"><span class="dot dot-green"></span> Autoconsumo</div>
          </div>
        </div>
        ${profileSvg}
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">Consumi vs Prelievi per Fascia</div>
          <div class="legend">
            <div class="legend-item"><span class="dot dot-blue"></span> Consumo Lordo</div>
            <div class="legend-item"><span class="dot dot-red"></span> Prelievo Rete</div>
          </div>
        </div>
        ${bandSvg}
      </div>
    </div>

    <div class="table-card">
      <table>
        <thead>
          <tr>
            <th>Fascia ARERA</th>
            <th>Consumo Lordo</th>
            <th>Autoconsumo</th>
            <th>Prelievo da Rete</th>
            <th>Immissione (Export)</th>
            <th>Costo Teorico</th>
            <th>Costo Effettivo</th>
            <th>Risparmio Diretto</th>
          </tr>
        </thead>
        <tbody>
          ${bandRows}
        </tbody>
      </table>
    </div>

    <footer>
      Generato localmente e privatamente da <a href="https://github.com/MRJonam91/EnergyOS">EnergyOS</a> &bull;
      Sviluppato da <a href="https://github.com/MRJonam91">Manoj Rollo (MRJonam91)</a> &bull;
      Nessun dato energetico ha lasciato il tuo computer.
    </footer>
  </div>
</body>
</html>`;
}
