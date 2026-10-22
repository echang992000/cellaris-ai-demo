'use strict';
/* Cellaris AI Demo: single-cell metabolic profiling from bulk RNA-seq. */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d = 0) => Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const sig = v => !Number.isFinite(v) ? '—' : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
const pct = (v, d = 1) => Number.isFinite(v) ? `${(v * 100).toFixed(d)}%` : '—';

const ICONS = {
  overview: '<rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/>',
  samples: '<path d="M4 20V10m5 10V4m5 16v-7m5 7V8"/>',
  pathways: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="9" cy="18" r="2.5"/><path d="m8.4 6.5 7.2 1.1M7 8.3l1.5 7.3m8.2-5.7-6 6.4"/>',
  genes: '<path d="M7 3c0 6 10 6 10 12s-10 6-10 6M17 3c0 6-10 6-10 12M8 6h8m-8 12h8m-7-9h6m-6 6h6"/>',
  figures: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 15 3-4 3 3 2-2 3 3"/><circle cx="9" cy="8.5" r="1.3"/>',
  methods: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7m-7 4h7"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"/>',
  download: '<path d="M12 4v12m-5-5 5 5 5-5M4 20h16"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.5"/><path d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

const TYPE_STYLE = {
  beta: ['Beta', '#0072b2'], alpha: ['Alpha', '#e69f00'], delta: ['Delta', '#009e73'], gamma: ['PP (gamma)', '#cc79a7'],
  acinar: ['Acinar', '#ddcc77'], ductal: ['Ductal', '#56b4e9'], endothelial: ['Endothelial', '#d55e00'],
  stellate: ['Stellate', '#5f6b76'], immune: ['Immune', '#882255'], epsilon: ['Epsilon', '#9c755f'], schwann: ['Schwann', '#4477aa'],
  activated_stellate: ['Activated stellate', '#5f6b76'], quiescent_stellate: ['Quiescent stellate', '#a9b4c0'],
  macrophage: ['Macrophage', '#882255'], mast: ['Mast', '#aa4499'], t_cell: ['T cell', '#332288'],
};
const FALLBACK = ['#4e79a7', '#f28e2b', '#59a14f', '#b07aa1', '#76b7b2', '#edc948', '#ff9da7', '#9c755f', '#bab0ac', '#e15759'];
const typeLabel = n => TYPE_STYLE[n]?.[0] || String(n).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const typeColor = (n, i = 0) => TYPE_STYLE[n]?.[1] || FALLBACK[i % FALLBACK.length];
const VIEWS = { overview: 'Overview', samples: 'Samples', pathways: 'Pathways', genes: 'Gene expression', figures: 'Figures', about: 'About' };
const SCHEDULES = {
  quick: { label: 'Quick', note: 'Fastest; suited to a first look', t1: 300, t2: 100 },
  standard: { label: 'Standard', note: 'Recommended for final results', t1: 1000, t2: 1000 },
  extended: { label: 'Extended', note: 'Longest training', t1: 3500, t2: 1500 },
};
const FIXED = { replicates: 5 };
/* Run-time estimate calibrated on the demo analysis (89 samples, 16-core laptop CPU). */
function runtimeEstimate() {
  const samples = state.bulkInfo?.samples.length;
  if (!samples) return 'Upload a count matrix to see an estimated run time.';
  const sch = SCHEDULES[$('#schedule')?.value] || SCHEDULES.quick, per = Number($('#max-cells')?.value) || 0, profiles = samples * per;
  const minutes = 1.5 + sch.t1 * 0.49 / 60 + FIXED.replicates * profiles * sch.t2 * 5.4e-6 + profiles * 3e-4;
  const text = minutes < 90 ? `${Math.max(5, Math.round(minutes / 5) * 5)} min` : `${(minutes / 60).toFixed(1)} h`;
  return `Estimated run time for ${samples} sample${samples === 1 ? '' : 's'} × ${num(per)} profiles: up to about ${text}.`;
}
function updateEstimate() { const el = $('#runtime-estimate'); if (el) el.textContent = runtimeEstimate(); }

const state = {
  data: null, view: 'overview', colorBy: 'type', sample: 'all', hidden: new Set(), pathway: null,
  search: '', category: 'all', gene: null, sampleSort: 'beta',
  worker: { url: localStorage.getItem('cellaris-worker-url') || '', token: '', ready: false, info: null },
  job: null, polling: false, bulk: null, bulkInfo: null,
};
const DEMO = () => window.CELLARIS_DEMO || {};
/* Files published on the public site; link to the public copies when the page is served elsewhere. */
const PUBLIC_SITE = 'https://echang992000.github.io/cellaris-ai-demo/';
const publicFile = path => (location.hostname.endsWith('github.io') ? '' : PUBLIC_SITE) + path;
/* Human pathway scope. KEGG reference maps that are not human biology (no human KEGG map, or a named
   process absent from human cells) are withheld by the compute workspace; this list also filters
   imported result files. Generated from the human pathway scope (KEGG pathway database of 2026/10/21 (587 maps)). */
const NON_HUMAN = new Set(["00073","00074","00121","00195","00196","00253","00254","00261","00290","00300","00311","00331","00332","00333","00361","00362","00363","00364","00365","00400","00401","00402","00403","00404","00405","00440","00460","00521","00522","00523","00524","00525","00540","00542","00543","00550","00552","00566","00571","00572","00621","00622","00623","00624","00625","00626","00627","00633","00642","00643","00680","00710","00720","00791","00901","00902","00903","00904","00905","00906","00907","00908","00909","00930","00940","00941","00942","00943","00944","00945","00946","00950","00960","00965","00966","00975","00981","00984","00996","00997","00998","00999","01010","01051","01052","01053","01054","01055","01056","01057","01059","01060","01061","01062","01063","01064","01065","01066","01070","01110","01120","01220"]);
const inHumanScope = id => !NON_HUMAN.has(String(id).slice(-5));
const isOverviewMap = id => /^rn01[12]\d\d$/.test(id);
const pathwayGroup = p => isOverviewMap(p.id) ? 'Overview map' : p.category;
const spread = p => { const v = p.activity.filter(Number.isFinite); const m = v.reduce((a, b) => a + b, 0) / (v.length || 1); return m > 0 ? (Math.max(...v) - Math.min(...v)) / m : 0; };

function toast(message) {
  const t = $('#toast'); t.textContent = message; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 4200);
}

/* ---------- Data ---------- */
function prepare(raw, origin) {
  const result = raw.result || raw;
  if (!result || !Array.isArray(result.cellTypes) || !Array.isArray(result.pathways) || !Array.isArray(result.cells) || !result.counts)
    throw new Error('This file is not a Cellaris result: cellTypes, pathways, cells and counts are required.');
  if (result.cells.length > 20000 || result.pathways.length > 1000 || result.cellTypes.length > 60)
    throw new Error('The result is too large to display.');
  const species = result.metadata?.species || result.provenance?.species;
  if (species && species !== 'human') throw new Error('This demo displays human pancreas analyses.');
  const cellTypes = result.cellTypes.map((t, i) => {
    if (typeof t.name !== 'string' || !Number.isFinite(t.percent)) throw new Error('Invalid cell-type composition.');
    return { ...t, label: typeLabel(t.name), color: typeColor(t.name, i) };
  });
  const names = new Set(cellTypes.map(t => t.name));
  for (const p of result.pathways)
    if (typeof p.id !== 'string' || typeof p.name !== 'string' || !Array.isArray(p.activity) || p.activity.length !== cellTypes.length)
      throw new Error('Invalid pathway activity table.');
  for (const c of result.cells)
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || !names.has(c.type)) throw new Error('Invalid embedding coordinates.');
  const pathways = result.pathways.filter(p => inHumanScope(p.id)).map(p => ({ ...p, category: pathwayGroup(p) }));
  const samples = (raw.samples || result.samples || []).map(s => ({
    id: String(s.id), label: s.label || String(s.id), profiles: s.profiles ?? null, fractions: s.fractions || {}, meta: s.meta || {},
  }));
  return {
    origin, title: raw.title || 'Pancreas analysis', subtitle: raw.subtitle || '', description: raw.description || '',
    cellTypes, pathways, cells: result.cells, geneExpression: result.geneExpression || {},
    counts: { ...result.counts, pathways: pathways.length }, samples, metadata: result.metadata || result.provenance || {}, warnings: result.warnings || [],
    figures: raw.figures || [], maps: raw.maps || {}, literature: raw.literature || {}, literatureMeta: result.metadata?.literature || raw.literatureMeta || null,
  };
}
function meanComposition(d) {
  const types = d.cellTypes.map(t => t.name);
  const withFractions = d.samples.filter(s => types.some(t => Number.isFinite(s.fractions[t])));
  if (!withFractions.length) return d.cellTypes.map(t => ({ ...t, share: t.percent / 100 }));
  return d.cellTypes.map(t => ({ ...t, share: withFractions.reduce((a, s) => a + (s.fractions[t.name] || 0), 0) / withFractions.length }))
    .sort((a, b) => b.share - a.share);
}
function activityRange(d) {
  const v = d.pathways.flatMap(p => p.activity).filter(Number.isFinite);
  return [Math.min(...v), Math.max(...v)];
}
function heat(v, lo, hi) {
  if (!Number.isFinite(v)) return 'background:#f2f4f7;color:#98a2b3';
  const t = Math.max(0, Math.min(1, (v - lo) / ((hi - lo) || 1)));
  const a = [240, 249, 247], b = [15, 118, 110];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
  return `background:rgb(${c.join(',')});color:${t > .55 ? '#fff' : '#0b1f33'}`;
}

/* ---------- Layout ---------- */
function setView(view) {
  state.view = VIEWS[view] ? view : 'overview';
  if (state.view === 'pathways' && !state.data.pathways.some(p => p.id === state.pathway)) state.pathway = defaultPathway();
  history.replaceState(null, '', `#${state.view}`);
  render(); window.scrollTo(0, 0); $('#sidebar').classList.remove('open');
}
function defaultPathway() {
  const d = state.data;
  return (d.pathways.find(p => p.id === 'rn00010') || d.pathways[0])?.id || null;
}
function pageHead(eyebrow, title, text, actions = '') {
  return `<div class="page-head"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1>${text ? `<p>${text}</p>` : ''}</div>${actions}</div>`;
}
function render() {
  const d = state.data;
  $$('.nav-item[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
  $('#crumb').textContent = VIEWS[state.view];
  $('#pathway-count').textContent = d.pathways.length;
  $('#dataset-name').textContent = d.origin === 'demo' ? DEMO().shortTitle || d.title : d.title;
  $('#dataset-meta').textContent = `${num(d.counts.samples)} samples · ${num(d.counts.cells)} profiles`;
  const views = { overview: viewOverview, samples: viewSamples, pathways: viewPathways, genes: viewGenes, figures: viewFigures, about: viewAbout };
  $('#view').innerHTML = views[state.view]();
  if (state.view === 'overview') drawEmbedding();
  if (state.view === 'pathways') { loadPathwayMap(); loadLiterature(); }
}

/* ---------- Overview ---------- */
function viewOverview() {
  const d = state.data, comp = meanComposition(d);
  const isDemo = d.origin === 'demo';
  const samples = [...new Set(d.cells.map(c => c.sample))];
  const banner = isDemo
    ? `<div class="banner">${icon('info')}<div><b>Demo dataset.</b> ${esc(DEMO().bannerText || 'Public data analyzed with Cellaris.')}</div><button class="btn btn-primary" data-action="new">Analyze your data</button></div>`
    : `<div class="banner">${icon('info')}<div><b>${d.origin === 'job' ? 'Computed analysis.' : 'Imported analysis.'}</b> Results for ${esc(d.title)} from your Cellaris workspace.</div><button class="btn btn-secondary" data-action="demo">Return to demo</button></div>`;
  const kpis = [
    ['Samples', d.counts.samples, isDemo ? 'Bulk RNA-seq libraries' : 'Uploaded bulk samples'],
    ['Single-cell profiles', d.counts.cells, 'Estimated from the bulk data'],
    ['Cell types', d.cellTypes.length, 'Human pancreas and islet cell types'],
    ['Pathways scored', d.pathways.length, `KEGG pathways · ${num(d.counts.reactions)} reactions`],
  ].map(([k, v, f]) => `<div class="card kpi"><div class="k-label">${k}</div><div class="k-value">${num(v)}</div><div class="k-foot">${f}</div></div>`).join('');
  return `${pageHead(isDemo ? 'Demo analysis' : 'Analysis', d.title, esc(d.description || d.subtitle))}
  ${banner}
  <div class="flow"><span>Bulk RNA-seq</span><i>→</i><span>Cell-type composition</span><i>→</i><span>Single-cell profiles</span><i>→</i><span>Metabolic activity</span><i>→</i><span>Pathway insights</span></div>
  <div class="grid kpis">${kpis}</div>
  <div class="grid two section">
    <section class="card"><div class="card-head"><div><div class="card-title">Metabolic map</div><div class="card-sub">Each point is one estimated single-cell profile, placed by metabolic similarity (UMAP)</div></div>
      <div class="controls"><div class="segmented"><button class="${state.colorBy === 'type' ? 'active' : ''}" data-color="type">Cell type</button><button class="${state.colorBy === 'score' ? 'active' : ''}" data-color="score">Pathway activity</button></div>
      <select class="select" id="sample-select" aria-label="Filter by sample"><option value="all">All samples</option>${samples.map(s => `<option value="${esc(s)}" ${state.sample === s ? 'selected' : ''}>${esc(sampleLabel(s))}</option>`).join('')}</select></div></div>
      <div class="card-body"><div class="embed-wrap"><svg class="embedding" viewBox="0 0 640 400" role="img" aria-label="Metabolic map of single-cell profiles"></svg><div class="tip hidden"></div></div>
      <div class="legend">${d.cellTypes.map(t => `<button class="${state.hidden.has(t.name) ? 'off' : ''}" data-type="${esc(t.name)}"><span class="swatch" style="background:${t.color}"></span>${esc(t.label)}</button>`).join('')}</div></div>
      <div class="card-foot"><span>${d.cells.length < d.counts.cells ? `Showing ${num(d.cells.length)} of ${num(d.counts.cells)} profiles` : `Showing all ${num(d.cells.length)} profiles`}</span><span>Select a cell type to hide it</span></div></section>
    <section class="card"><div class="card-head"><div><div class="card-title">Cell-type composition</div><div class="card-sub">${d.samples.length ? `Mean estimated fraction of cells across ${num(d.samples.length)} samples (%)` : 'Share of single-cell profiles (%)'}</div></div></div>
      <div class="card-body"><div class="stack">${comp.map(t => `<span style="width:${(t.share * 100).toFixed(2)}%;background:${t.color}" title="${esc(t.label)} ${pct(t.share)}"></span>`).join('')}</div>
      <div style="margin-top:10px">${comp.map(t => `<div class="comp-row"><span class="swatch" style="background:${t.color}"></span><span>${esc(t.label)}</span><span class="bar"><i style="width:${Math.min(100, t.share * 100 / Math.max(...comp.map(x => x.share)) * 100).toFixed(1)}%;background:${t.color}"></i></span><b>${pct(t.share)}</b></div>`).join('')}</div></div>
      <div class="card-foot"><span>Fractions sum to 100% per sample</span><button class="link-btn" data-view="samples">Per-sample view →</button></div></section>
  </div>
  <div class="section">${pathwayTable(8)}</div>`;
}
function sampleLabel(id) {
  const s = state.data.samples.find(x => x.id === id);
  return s?.label || id;
}
function pathwayTable(limit = 0) {
  const d = state.data, [lo, hi] = activityRange(d);
  const types = d.cellTypes.slice(0, 9);
  let rows = d.pathways.filter(p => (!state.search || `${p.name} ${p.id}`.toLowerCase().includes(state.search)) && (state.category === 'all' || p.category === state.category));
  if (limit) rows = rows.filter(p => !isOverviewMap(p.id)).sort((a, b) => spread(b) - spread(a)).slice(0, limit);
  return `<section class="card"><div class="card-head"><div><div class="card-title">${limit ? 'Pathways that differ most between cell types' : 'Pathway activity by cell type'}</div><div class="card-sub">${limit ? 'Activity by cell type in relative units; ranked by the spread between cell types (overview and non-mammalian maps excluded)' : 'Mean estimated activity per KEGG pathway and cell type, relative units'}</div></div>
    ${limit ? `<button class="btn btn-secondary" data-view="pathways">All ${d.pathways.length} pathways</button>` : `<button class="btn btn-secondary" data-action="exportpathways">${icon('download')} CSV</button>`}</div>
    <div class="card-body table-wrap"><table class="table"><thead><tr><th>Pathway</th><th>Category</th><th class="num" title="Mean activity across cell types, relative units">Mean</th>${types.map(t => `<th class="num" title="${esc(t.label)}"><span class="swatch" style="background:${t.color};margin-right:5px"></span>${esc(t.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(p => `<tr class="clickable" data-pathway="${esc(p.id)}"><td><b style="font-weight:600">${esc(p.name)}</b><small>${esc(p.id)} · ${num(p.reactionCount)} reactions</small></td><td><span class="badge">${esc(p.category)}</span></td><td class="num">${sig(p.score)}</td>${types.map((t, i) => `<td class="num"><span class="heat" style="${heat(p.activity[i], lo, hi)}">${sig(p.activity[i])}</span></td>`).join('')}</tr>`).join('') || `<tr><td colspan="${3 + types.length}" class="empty">No pathways match the filter.</td></tr>`}</tbody></table></div></section>`;
}
function drawEmbedding() {
  const svg = $('.embedding'); if (!svg) return;
  const d = state.data;
  const cells = d.cells.filter(c => state.sample === 'all' || c.sample === state.sample);
  const xs = d.cells.map(c => c.x), ys = d.cells.map(c => c.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const X = v => 24 + (v - x0) / ((x1 - x0) || 1) * 592, Y = v => 376 - (v - y0) / ((y1 - y0) || 1) * 352;
  const scores = d.cells.map(c => c.score).filter(Number.isFinite);
  const [s0, s1] = [Math.min(...scores), Math.max(...scores)];
  const color = Object.fromEntries(d.cellTypes.map(t => [t.name, t.color]));
  const viridis = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'];
  const ramp = v => { const t = Math.max(0, Math.min(.999, (v - s0) / ((s1 - s0) || 1))) * 4; const i = Math.floor(t); return mix(viridis[i], viridis[i + 1], t - i); };
  const r = d.cells.length > 1500 ? 2.1 : 2.8;
  let html = `<g>${cells.map((c, i) => `<circle cx="${X(c.x).toFixed(1)}" cy="${Y(c.y).toFixed(1)}" r="${r}" fill="${state.colorBy === 'type' ? color[c.type] : ramp(c.score)}" fill-opacity="${state.hidden.has(c.type) ? .05 : .78}" data-i="${i}"/>`).join('')}</g>`;
  html += `<g font-size="11" fill="#667085"><path d="M24 392h28M24 392v-28" stroke="#98a2b3" stroke-width="1"/><text x="58" y="396">UMAP 1</text><text x="8" y="356" transform="rotate(-90 8 356)">UMAP 2</text></g>`;
  if (state.colorBy === 'type') {
    for (const t of d.cellTypes) {
      const pts = cells.filter(c => c.type === t.name); if (pts.length < 8 || state.hidden.has(t.name)) continue;
      const mx = pts.map(c => X(c.x)).sort((a, b) => a - b)[pts.length >> 1], my = pts.map(c => Y(c.y)).sort((a, b) => a - b)[pts.length >> 1];
      html += `<text x="${mx.toFixed(1)}" y="${(my - 10).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#0b1f33" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(t.label)}</text>`;
    }
  } else {
    html += `<g font-size="10.5" fill="#667085"><defs><linearGradient id="vir" x1="0" x2="1">${viridis.map((c, i) => `<stop offset="${i / 4}" stop-color="${c}"/>`).join('')}</linearGradient></defs><rect x="470" y="10" width="140" height="8" rx="4" fill="url(#vir)"/><text x="470" y="32">${sig(s0)}</text><text x="610" y="32" text-anchor="end">${sig(s1)}</text><text x="540" y="32" text-anchor="middle">pathway activity (relative units)</text></g>`;
  }
  svg.innerHTML = html;
  const tip = $('.embed-wrap .tip');
  svg.onpointermove = e => {
    const i = e.target.dataset?.i; if (i === undefined) { tip.classList.add('hidden'); return; }
    const c = cells[Number(i)], box = $('.embed-wrap').getBoundingClientRect();
    tip.textContent = `${typeLabel(c.type)} · ${sampleLabel(c.sample)} · pathway activity ${sig(c.score)} (relative units)`;
    tip.style.left = `${Math.min(e.clientX - box.left + 12, box.width - 260)}px`; tip.style.top = `${Math.max(4, e.clientY - box.top - 34)}px`;
    tip.classList.remove('hidden');
  };
  svg.onpointerleave = () => tip.classList.add('hidden');
}
function mix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
}

/* ---------- Samples ---------- */
function viewSamples() {
  const d = state.data;
  if (!d.samples.length || !d.samples.some(s => Object.keys(s.fractions).length))
    return `${pageHead('Samples', 'Per-sample composition', '')}<div class="card"><div class="empty">This result does not include per-sample fractions.</div></div>`;
  const types = d.cellTypes.map(t => t.name);
  const sortKey = types.includes(state.sampleSort) ? state.sampleSort : types[0];
  const rows = [...d.samples].sort((a, b) => (b.fractions[sortKey] || 0) - (a.fractions[sortKey] || 0));
  const metaKeys = [...new Set(rows.flatMap(s => Object.keys(s.meta)))];
  const L = 58, W = 940, H = 260, T = 8, bw = W / rows.length;
  const order = meanComposition(d).map(t => t.name);
  const bars = rows.map((s, i) => {
    let y = T + H;
    return order.map(t => { const v = s.fractions[t] || 0, h = v * H; y -= h; return `<rect x="${(L + i * bw + .5).toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(.5, bw - 1).toFixed(2)}" height="${h.toFixed(2)}" fill="${typeColor(t, types.indexOf(t))}"><title>${esc(s.label)} · ${esc(typeLabel(t))} ${pct(v)}</title></rect>`; }).join('');
  }).join('');
  const axis = [0, 25, 50, 75, 100].map(v => { const y = T + H - v / 100 * H; return `<line x1="${L - 5}" x2="${L}" y1="${y}" y2="${y}" stroke="#98a2b3"/><text x="${L - 9}" y="${y + 4}" text-anchor="end">${v}</text>`; }).join('');
  return `${pageHead('Samples', 'Per-sample cell-type composition', `Estimated share of cells of each type in every bulk sample (${num(rows.length)} samples), sorted by ${esc(typeLabel(sortKey).toLowerCase())} fraction.`,
    `<div class="controls"><label class="field" style="flex-direction:row;align-items:center;gap:8px">Sort by<select class="select" id="sample-sort">${types.map(t => `<option value="${esc(t)}" ${t === sortKey ? 'selected' : ''}>${esc(typeLabel(t))}</option>`).join('')}</select></label><button class="btn btn-secondary" data-action="exportcomposition">${icon('download')} CSV</button></div>`)}
  <section class="card"><div class="card-body"><svg viewBox="0 0 ${L + W + 4} ${T + H + 40}" style="width:100%;height:auto" role="img" aria-label="Stacked composition per sample">
    <g font-size="12" fill="#667085">${axis}<line x1="${L}" x2="${L}" y1="${T}" y2="${T + H}" stroke="#98a2b3"/>
    <text transform="translate(14 ${T + H / 2}) rotate(-90)" text-anchor="middle" fill="#344054">Estimated fraction of cells (%)</text>
    <text x="${L + W / 2}" y="${T + H + 30}" text-anchor="middle" fill="#344054">Samples (n = ${num(rows.length)}), ordered by ${esc(typeLabel(sortKey).toLowerCase())} fraction, highest first</text></g>${bars}</svg>
  <div class="legend">${order.map(t => `<span style="display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:#344054"><span class="swatch" style="background:${typeColor(t, types.indexOf(t))}"></span>${esc(typeLabel(t))}</span>`).join('')}</div></div></section>
  <section class="card section"><div class="card-head"><div><div class="card-title">Composition table</div><div class="card-sub">Estimated fraction of cells per type (%); donor characteristics as reported in the source study</div></div></div>
  <div class="card-body table-wrap" style="max-height:520px"><table class="table"><thead><tr><th>Sample</th>${metaKeys.map(k => `<th>${esc(k)}</th>`).join('')}${order.map(t => `<th class="num">${esc(typeLabel(t))} (%)</th>`).join('')}<th class="num">Profiles generated</th></tr></thead>
  <tbody>${rows.map(s => `<tr><td><b style="font-weight:600">${esc(s.label)}</b>${s.label !== s.id ? `<small>${esc(s.id)}</small>` : ''}</td>${metaKeys.map(k => `<td>${esc(s.meta[k] ?? '—')}</td>`).join('')}${order.map(t => `<td class="num">${Number.isFinite(s.fractions[t]) ? (s.fractions[t] * 100).toFixed(1) : '—'}</td>`).join('')}<td class="num">${num(s.profiles)}</td></tr>`).join('')}</tbody></table></div></section>`;
}

/* ---------- Pathways ---------- */
function viewPathways() {
  const d = state.data;
  const p = d.pathways.find(x => x.id === state.pathway) || d.pathways[0];
  if (!p) return `${pageHead('Pathways', 'Pathway explorer', '')}<div class="card"><div class="empty">No pathways were scored.</div></div>`;
  const categories = [...new Set(d.pathways.map(x => x.category))].sort();
  const list = d.pathways.filter(x => (!state.search || `${x.name} ${x.id}`.toLowerCase().includes(state.search)) && (state.category === 'all' || x.category === state.category));
  const vals = p.activity.map((v, i) => ({ v, t: d.cellTypes[i] })).filter(x => Number.isFinite(x.v)).sort((a, b) => b.v - a.v);
  const vmax = Math.max(...vals.map(x => x.v), 1e-9);
  const top = vals[0]?.t;
  return `${pageHead('Pathways', 'Pathway explorer', 'Estimated metabolic activity of each KEGG pathway in each cell type, in relative units. Compare values within an analysis.')}
  <div class="explorer">
    <section class="card"><div class="card-body" style="padding-bottom:8px"><div class="controls"><label class="search">${icon('search')}<input class="input" id="pathway-search" type="search" placeholder="Search pathways" value="${esc(state.search)}" aria-label="Search pathways"></label>
      <select class="select" id="category-select" aria-label="Pathway category"><option value="all">All categories</option>${categories.map(c => `<option ${state.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div></div>
      <div class="plist">${list.map(x => `<button class="${x.id === p.id ? 'active' : ''}" data-pathway="${esc(x.id)}"><b>${esc(x.name)}</b><small>${esc(x.id)} · ${esc(x.category)} · mean activity ${sig(x.score)}</small></button>`).join('') || '<div class="empty">No pathways match.</div>'}</div></section>
    <div class="grid">
      <section class="card"><div class="card-head"><div><div class="card-title">${esc(p.name)}</div><div class="card-sub">${esc(p.id)} · ${esc(p.category)}</div></div><span class="badge accent">KEGG</span></div>
        <div class="card-body">${p.note ? `<p class="note" style="margin:0 0 14px">${esc(p.note)}</p>` : ''}<div class="metrics"><div class="metric"><small>Mean activity (relative units)</small><b>${sig(p.score)}</b></div><div class="metric"><small>Reactions</small><b>${num(p.reactionCount)}</b></div><div class="metric"><small>Enzyme genes</small><b>${num(p.genes.length)}</b></div><div class="metric"><small>Highest in</small><b>${esc(top?.label || '—')}</b></div></div>
        <div class="note" style="margin:16px 0 6px">Activity by cell type (relative units)</div><div>${vals.map(x => `<div class="hbar"><span>${esc(x.t.label)}</span><span class="track"><i style="width:${(x.v / vmax * 100).toFixed(1)}%;background:${x.t.color}"></i></span><b>${sig(x.v)}</b></div>`).join('')}</div></div></section>
      <section class="card"><div class="card-head"><div><div class="card-title">Pathway map</div><div class="card-sub">Lines are reactions and points are metabolites. Line color shows mean reaction activity across all profiles (relative units); hover for names.</div></div></div>
        <div class="card-body"><div id="pathway-map" class="map-frame"><div class="empty">Loading pathway map…</div></div></div></section>
      <section class="card" id="literature-card"><div class="card-head"><div><div class="card-title">Literature support</div><div class="card-sub">Human pancreas papers that mention the enzymes of each reaction on this map, curated enzyme evidence and assessed abstracts. Counts show prior study, not proof of activity.</div></div><span class="badge accent">Human pancreas</span></div>
        <div class="card-body" id="literature-body"><div class="empty">Loading literature support…</div></div></section>
      <section class="card"><div class="card-head"><div><div class="card-title">Enzyme genes</div><div class="card-sub">Genes in the uploaded data that encode enzymes of this pathway</div></div></div>
        <div class="card-body"><div class="chips">${p.genes.slice(0, 160).map(g => `<span class="chip">${esc(g)}</span>`).join('') || '<span class="note">No mapped genes.</span>'}</div>${p.genes.length > 160 ? `<p class="note">${num(p.genes.length - 160)} more genes in the CSV export.</p>` : ''}</div></section>
    </div>
  </div>`;
}
let plotlyPromise = null;
function loadPlotly() {
  if (window.Plotly) return Promise.resolve(window.Plotly);
  plotlyPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = 'assets/plotly.min.js'; s.onload = () => resolve(window.Plotly); s.onerror = () => reject(new Error('Plot library failed to load.'));
    document.head.appendChild(s);
  });
  return plotlyPromise;
}
async function loadPathwayMap() {
  const holder = $('#pathway-map'); if (!holder) return;
  const d = state.data, id = state.pathway || defaultPathway();
  const empty = msg => { if (state.view === 'pathways' && state.pathway === id) holder.innerHTML = `<div class="empty">${msg}</div>`; };
  try {
    let fig = null;
    if (d.origin === 'demo' && d.maps[id]) {
      fig = await (await fetch(d.maps[id])).json();
    } else if (d.origin === 'job' && state.job?.artifacts?.some(a => a.name === `pathway_${id}.plotly.json`) && state.worker.ready) {
      const r = await fetch(`${state.worker.url}/jobs/${encodeURIComponent(state.job.id)}/artifacts/${encodeURIComponent(`pathway_${id}.plotly.json`)}`, { headers: { Authorization: `Bearer ${state.worker.token}` }, signal: AbortSignal.timeout(30000) });
      if (r.ok) fig = await r.json();
    }
    if (!fig) return empty(isOverviewMap(id) ? 'Overview maps combine hundreds of reactions and are not drawn. Activity scores appear above.' : 'No map is available for this pathway. Activity scores appear above.');
    const Plotly = await loadPlotly();
    if (state.view !== 'pathways' || state.pathway !== id) return;
    const lit = await getLiterature(id);
    if (state.view !== 'pathways' || state.pathway !== id) return;
    if (lit?.connections?.length) {
      const hover = fig.data.find(t => t.mode === 'markers' && Array.isArray(t.text) && String(t.text[0] || '').startsWith('Reaction:'));
      const byIndex = new Map(lit.connections.map(c => [c.i, c]));
      if (hover) hover.text = hover.text.map((txt, j) => byIndex.has(j) ? `${txt}${hoverLiterature(byIndex.get(j))}` : txt);
    }
    holder.innerHTML = '';
    for (const t of fig.data) {
      if (t.marker?.colorbar && t.marker.showscale !== false)
        t.marker.colorbar = { ...t.marker.colorbar, title: { text: 'Mean reaction activity<br>(relative units)', side: 'right' }, x: 1.01, xanchor: 'left', len: 0.7, thickness: 14, outlinewidth: 0 };
    }
    const layout = { ...fig.layout, autosize: true, height: 580, margin: { l: 16, r: 150, t: 56, b: 16 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff', showlegend: false,
      xaxis: { visible: false }, yaxis: { visible: false, autorange: 'reversed' },
      font: { family: 'Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif', size: 12, color: '#1d2939' },
      title: { text: `${d.pathways.find(x => x.id === id)?.name || id}`, x: 0.01, xanchor: 'left', font: { size: 14 } } };
    await Plotly.newPlot(holder, fig.data, layout, { displaylogo: false, responsive: true, modeBarButtonsToRemove: ['lasso2d', 'select2d'] });
  } catch (e) { empty(`The pathway map could not be loaded (${esc(e.message)}).`); }
}

/* ---------- Literature support ---------- */
const typeNoun = n => { const l = typeLabel(n); return /^[A-Z]{2}/.test(l) ? l : l.charAt(0).toLowerCase() + l.slice(1); };
const STANCE = { supports: 'Supports', partially_supports: 'Partly supports', contradicts: 'Contradicts', unrelated: 'Not relevant' };
const pubmedUrl = pmids => pmids.length === 1 ? `https://pubmed.ncbi.nlm.nih.gov/${pmids[0]}/` : `https://pubmed.ncbi.nlm.nih.gov/?term=${pmids.map(x => `${x}[pmid]`).join('+OR+')}&sort=date`;
const paperLink = (n, pmids, what) => !Number.isFinite(n) ? '—' : n && pmids?.length ? `<a href="${pubmedUrl(pmids)}" target="_blank" rel="noopener" title="Open the ${pmids.length === 1 ? 'paper' : `${pmids.length} most recent papers`} (${esc(what)}) in PubMed">${num(n)}</a>` : num(n);
function literatureMeta() { const d = state.data; return d.literatureMeta || (d.origin === 'demo' ? DEMO().literatureMeta : null) || null; }
function getLiterature(id) {
  const d = state.data, p = d.pathways.find(x => x.id === id);
  if (!p) return Promise.resolve(null);
  if (p.literature) return Promise.resolve(p.literature);
  const url = d.literature?.[id];
  if (!url) return Promise.resolve(null);
  state.litCache ||= {};
  state.litCache[id] ||= fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);
  return state.litCache[id];
}
function hoverLiterature(c) {
  if (!c.genes?.length) return '<br>Enzyme genes: none in the model';
  const genes = c.genes.slice(0, 4).join(', ') + (c.genes.length > 4 ? ` +${c.genes.length - 4}` : '');
  return `<br>Enzymes: ${esc(genes)}<br>Human pancreas papers: ${num(c.pancreas)}` +
    (c.top ? `<br>Papers in ${esc(typeNoun(c.top))} cells: ${num(c.cell)} (expected ${sig(c.expected)})` : '') +
    (c.hypothesis ? '<br><b>Candidate hypothesis</b>' : '');
}
function literatureClaims(lit, label) {
  const cl = lit.claims;
  if (!cl) return `<p class="note" style="margin:14px 0 0">No abstracts were assessed for this pathway in ${esc(label)} cells.</p>`;
  const counts = ['supports', 'partially_supports', 'contradicts', 'unrelated'].map(k => `<span class="stance s-${k}">${STANCE[k]} ${num(cl[k] || 0)}</span>`).join('');
  const ORIGIN = { human: 'Human data', mixed: 'Human and animal data' };
  const items = (cl.items || []).map(it => `<li><span class="stance s-${esc(it.stance)}">${esc(STANCE[it.stance] || it.stance)}</span><a href="https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(it.pmid)}/" target="_blank" rel="noopener">${esc(it.title || `PMID ${it.pmid}`)}</a><small>${esc(it.year || '')} · PMID ${esc(it.pmid)}${ORIGIN[it.origin] ? ` · ${ORIGIN[it.origin]}` : ''}</small>${it.rationale ? `<p>${esc(it.rationale)}</p>` : ''}</li>`).join('');
  return `<div class="lit-claims"><div class="note" style="margin:18px 0 6px">Assessed abstracts: is this pathway active in ${esc(label)} cells? (${num(cl.assessed)} abstracts)</div><div class="stance-row">${counts}</div>${items ? `<ol class="claims">${items}</ol>` : '<p class="note">None of the assessed abstracts addressed this pathway in these cells.</p>'}</div>`;
}
function literatureTable(lit) {
  const key = state.litSort || 'pancreas', dir = state.litDir || -1;
  const val = c => key === 'a' ? `${c.a} ${c.b}`.toLowerCase() : key === 'top' ? typeLabel(c.top || 'zz') : !c.genes?.length ? -1 : Number(c[key] ?? -1);
  const rows = (lit.connections || []).filter(c => !state.litHyp || c.hypothesis).slice()
    .sort((x, y) => { const a = val(x), b = val(y); return (typeof a === 'string' ? a.localeCompare(b) : a - b) * dir || x.i - y.i; });
  const th = (k, label, cls = '') => `<th data-litsort="${k}" class="${cls}${key === k ? ` sorted${dir > 0 ? ' asc' : ''}` : ''}" scope="col">${label}</th>`;
  const body = rows.map(c => {
    const g = c.genes?.length > 0;
    const genes = g ? esc(c.genes.slice(0, 3).join(', ')) + (c.genes.length > 3 ? ` <small>+${c.genes.length - 3} more</small>` : '') : '<span class="note">None in the model</span>';
    const tie = Number.isFinite(c.margin) && c.margin < 0.25 && c.second;
    const spec = !Number.isFinite(c.margin) ? '' : tie ? `<small>near tie with ${esc(typeNoun(c.second))} (${sig(c.margin)} SD)</small>` : `<small>margin ${sig(c.margin)} SD</small>`;
    const rx = String(c.reactions || '').split(';').filter(Boolean);
    return `<tr><td>${esc(c.a)} – ${esc(c.b)}${c.hypothesis ? `<span class="badge warn hyp" title="${c.informativeAbsence ? 'At least one paper would have been expected in this cell type' : 'Few papers would have been expected in this cell type'}">Candidate hypothesis${c.informativeAbsence ? ' · informative' : ''}</span>` : ''}<small>${esc(rx.slice(0, 3).join(', '))}${rx.length > 3 ? ` +${rx.length - 3}` : ''}</small></td>
      <td>${genes}</td><td>${c.top ? esc(typeLabel(c.top)) : '—'}${spec}</td>
      <td class="num">${g ? paperLink(c.pancreas, c.pancreasPmids, 'human pancreas') : '—'}</td>
      <td class="num">${g && c.top ? paperLink(c.cell, c.cellPmids, `${typeNoun(c.top)} cells`) : '—'}${g && Number.isFinite(c.expected) ? `<small>expected ${sig(c.expected)}</small>` : ''}</td>
      <td class="num">${g && Number.isFinite(c.enrichment) ? sig(c.enrichment) : '—'}</td>
      <td class="num">${g ? paperLink(c.curated, c.curatedPmids, 'curated enzyme evidence') : '—'}</td></tr>`;
  }).join('');
  return `<div class="lit-toolbar"><label class="check"><input type="checkbox" id="lit-hyp" ${state.litHyp ? 'checked' : ''}> Candidate hypotheses only</label><span class="note">${num(rows.length)} of ${num((lit.connections || []).length)} reactions · paper links open up to 5 of the most recent papers in PubMed</span></div>
    <div class="table-wrap lit-table"><table class="table"><colgroup><col class="c-rxn"><col class="c-genes"><col class="c-top"><col class="c-num"><col class="c-num"><col class="c-num"><col class="c-num"></colgroup><thead><tr>${th('a', 'Reaction (metabolites)')}<th scope="col">Enzyme genes</th>${th('top', 'Highest relative activity')}${th('pancreas', 'Human pancreas papers', 'num')}${th('cell', 'Papers in that cell type', 'num')}${th('enrichment', 'Enrich&shy;ment', 'num')}${th('curated', 'Curated enzyme papers', 'num')}</tr></thead>
    <tbody>${body || `<tr><td colspan="7"><div class="empty">${state.litHyp ? 'No candidate hypotheses on this map.' : 'No reactions on this map.'}</div></td></tr>`}</tbody></table></div>`;
}
function literatureDefinitions() {
  const m = literatureMeta();
  return `<details class="lit-defs"><summary>How these numbers are computed</summary><dl>
    <dt>Human pancreas papers</dt><dd>PubMed records indexed with the MeSH term Humans that concern the pancreas or pancreatic islets and are annotated with at least one enzyme gene of the reaction (PubTator3 gene annotations). Each paper counts once. Papers on pancreatic cancer are excluded.</dd>
    <dt>Papers in that cell type</dt><dd>The subset that also concerns the cell type with the highest relative activity (for example, MeSH Insulin-Secreting Cells or “beta cell” for beta cells).</dd>
    <dt>Expected and enrichment</dt><dd>Expected = human pancreas papers × the share of human pancreas literature that concerns that cell type. Enrichment = (observed + 0.5) / (expected + 0.5); values above 1 mean the enzymes are discussed in that cell type more often than an average gene studied in pancreas.</dd>
    <dt>Curated enzyme papers</dt><dd>Experimental evidence for the enzyme's catalytic activity in reviewed human UniProtKB/Swiss-Prot entries, matched to the reaction by EC number.</dd>
    <dt>Highest relative activity</dt><dd>Each profile's reaction activities are divided by that profile's mean activity, averaged per cell type and compared across cell types. The margin is the difference between the first and second cell type in standard deviations across cell types.</dd>
    <dt>Candidate hypothesis</dt><dd>Predicted activity is specific to one cell type (margin of at least 1 SD) and the enzymes have been studied in human pancreas, but no paper links them to that cell type. Marked informative when at least one such paper would have been expected. These are hypotheses for follow-up, not findings.</dd>
    <dt>Assessed abstracts</dt><dd>Abstracts of papers that mention the pathway's enzymes in the cell type were assessed automatically for whether they support activity of the pathway in that cell type. Only evidence from human material counts: abstracts whose evidence for the claim comes from animals, non-human cells or an unstated source are counted as not relevant. Labels were calibrated against shuffled claims and spot-checked; read the abstract before relying on a label.</dd>
    <dt>Reading the counts</dt><dd>Paper counts show that enzymes have been studied in human pancreas. They do not show that a reaction is active, and well-studied genes collect more papers.</dd>
  </dl>${m ? `<p class="note" style="margin:10px 0 0">Literature index ${esc(m.version || '')}, built ${esc(m.built || '')}: ${num(m.papers)} human pancreas papers, ${num(m.genes)} enzyme genes.</p>` : ''}</details>`;
}
function literatureBody(p, lit) {
  const s = lit.summary || {}, label = s.topCellType ? typeLabel(s.topCellType) : '—', noun = s.topCellType ? typeNoun(s.topCellType) : '—';
  return `<div class="metrics"><div class="metric"><small>Reactions on this map</small><b>${num(s.connections)}</b></div><div class="metric"><small>With human pancreas papers</small><b>${num(s.withPancreasPapers)} <span class="of">of ${num(s.withGenes)}</span></b></div><div class="metric"><small>With papers in the cell type</small><b>${num(s.withCellTypePapers)}</b></div><div class="metric"><small>Candidate hypotheses</small><b>${num(s.hypotheses)}</b></div></div>
    <p class="lit-summary">Highest relative activity for this pathway: <b>${esc(label)}</b>. Papers on its enzymes: ${paperLink(s.pancreasPapers, s.pancreasPmids, 'human pancreas')} in human pancreas, ${paperLink(s.cellTypePapers, s.cellTypePmids, `${noun} cells`)} in ${esc(noun)} cells (expected ${sig(s.expected)}; enrichment ${sig(s.enrichment)}).</p>
    ${literatureClaims(lit, noun)}${literatureTable(lit)}${literatureDefinitions()}`;
}
async function loadLiterature() {
  const holder = $('#literature-body'); if (!holder) return;
  const id = state.pathway || defaultPathway();
  const lit = await getLiterature(id);
  if (state.view !== 'pathways' || (state.pathway || defaultPathway()) !== id || !$('#literature-body')) return;
  const p = state.data.pathways.find(x => x.id === id);
  $('#literature-body').innerHTML = lit ? literatureBody(p, lit) : `<div class="empty">${isOverviewMap(id) ? 'Literature support is shown for drawn pathway maps; overview maps are not drawn.' : 'Literature support is not available for this pathway.'}</div>`;
}
async function exportLiterature() {
  const d = state.data, cols = ['pathway_id', 'pathway_name', 'connection_index', 'metabolite_a', 'metabolite_b', 'kegg_reactions', 'enzyme_genes', 'highest_cell_type', 'second_cell_type', 'specificity_margin_z', 'human_pancreas_papers', 'papers_in_highest_cell_type', 'expected_papers_in_highest_cell_type', 'enrichment', 'human_pancreas_papers_incl_cancer', 'papers_in_highest_cell_type_incl_cancer', 'curated_enzyme_papers', 'recent_pmids_human_pancreas', 'recent_pmids_highest_cell_type', 'curated_pmids', 'candidate_hypothesis', 'absence_informative'];
  const q = v => { const t = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const lines = [cols.join(',')];
  for (const p of d.pathways) {
    const lit = await getLiterature(p.id); if (!lit) continue;
    for (const c of lit.connections || [])
      lines.push([p.id, p.name, c.i, c.a, c.b, c.reactions, (c.genes || []).join(';'), c.top, c.second, c.margin, c.pancreas, c.cell, c.expected, c.enrichment, c.pancreasInclCancer, c.cellInclCancer, c.curated, (c.pancreasPmids || []).join(';'), (c.cellPmids || []).join(';'), (c.curatedPmids || []).join(';'), c.hypothesis ? 'True' : 'False', c.informativeAbsence ? 'True' : 'False'].map(q).join(','));
  }
  if (lines.length === 1) return toast('No literature support is available for this result.');
  download('cellaris-literature-support.csv', lines.join('\n'));
}

/* ---------- Genes ---------- */
function viewGenes() {
  const d = state.data, genes = Object.keys(d.geneExpression);
  if (!genes.length) return `${pageHead('Gene expression', 'Marker genes', '')}<div class="card"><div class="empty">This result does not include marker-gene summaries.</div></div>`;
  const gene = genes.includes(state.gene) ? state.gene : genes[0];
  const vals = d.geneExpression[gene].map((v, i) => ({ v, t: d.cellTypes[i] })).filter(x => x.t);
  const vmax = Math.max(...vals.map(x => x.v).filter(Number.isFinite), 1e-9);
  return `${pageHead('Gene expression', 'Marker genes across cell types', 'Mean estimated expression of pancreatic marker genes in each cell type.')}
  <section class="card"><div class="card-body"><div class="controls">${genes.map(g => `<button class="btn ${g === gene ? 'btn-primary' : 'btn-secondary'}" data-gene="${esc(g)}"><i style="font-style:italic">${esc(g)}</i></button>`).join('')}</div>
  <div class="note" style="margin:20px 0 6px">Expression, log(1 + counts per 10,000)</div><div style="max-width:760px">${vals.sort((a, b) => b.v - a.v).map(x => `<div class="hbar"><span>${esc(x.t.label)}</span><span class="track"><i style="width:${(Math.max(0, x.v) / vmax * 100).toFixed(1)}%;background:${x.t.color}"></i></span><b>${sig(x.v)}</b></div>`).join('')}</div>
  <p class="note">The full gene-by-profile matrix is included in the analysis results download.</p></div></section>`;
}

/* ---------- Figures ---------- */
function viewFigures() {
  const figs = (state.data.figures.length ? state.data.figures : DEMO().figures) || [];
  const note = state.data.origin !== 'demo' ? '<div class="banner">' + icon('info') + '<div>These figures describe the demo cohort. Your own results are in the other views and in the results download.</div></div>' : '';
  return `${pageHead('Report', 'Figures', 'Summary figures for the demo analysis. Each figure is available as PNG and SVG.')}${note}
  <div class="figure-grid">${figs.map((f, i) => `<article class="card figure-card"><div class="card-body"><div class="fig-num">Figure ${i + 1}</div><div class="card-title" style="margin:2px 0 12px">${esc(f.title)}</div>
    <img src="${esc(f.png)}" alt="${esc(f.title)}" loading="lazy" data-figure="${i}"><div class="caption">${esc(f.caption)}</div>
    <div class="downloads"><a href="${esc(f.png)}" download>PNG</a><a href="${esc(f.svg)}" download>SVG</a></div></div></article>`).join('')}</div>`;
}


/* ---------- About ---------- */
function viewAbout() {
  const d = state.data, demo = DEMO();
  const facts = [['Samples', num(d.counts.samples)], ['Single-cell profiles', num(d.counts.cells)], ['Cell types', num(d.cellTypes.length)], ['KEGG pathways scored', num(d.pathways.length)], ['Metabolic reactions', num(d.counts.reactions)]];
  return `${pageHead('About', 'Cellaris AI Demo', 'Cell-type and metabolic insight from bulk RNA-seq of human pancreas.')}
  <div class="steps">
    <div class="step"><div class="n">INPUT</div><h4>Bulk RNA-seq counts</h4><p>Raw integer counts from human pancreas or isolated islets: genes (HGNC symbols) in rows, samples in columns, CSV or TSV, up to 100 samples.</p></div>
    <div class="step"><div class="n">OUTPUT</div><h4>Cell-type composition</h4><p>Estimated share of beta, alpha, delta, PP, acinar, ductal, endothelial, stellate and immune cells in every sample.</p></div>
    <div class="step"><div class="n">OUTPUT</div><h4>Single-cell profiles</h4><p>Single-cell expression profiles estimated from each bulk sample, with marker-gene summaries and a metabolic map.</p></div>
    <div class="step"><div class="n">OUTPUT</div><h4>Metabolic activity</h4><p>Activity of KEGG metabolic pathways and reactions in each cell type, with interactive pathway maps.</p></div>
  </div>
  <div class="grid halves section">
    <section class="card"><div class="card-head"><div><div class="card-title">This result</div><div class="card-sub">${esc(d.title)}</div></div></div>
      <div class="card-body"><dl class="kv">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl></div></section>
    <section class="card"><div class="card-head"><div><div class="card-title">Data handling</div></div></div>
      <div class="card-body prose"><p>The website checks the file format in your browser and sends the count matrix only to the Cellaris compute workspace you connect. The website itself stores no data. Download your results before the workspace's retention period ends.</p></div></section>
  </div>
  <section class="card section"><div class="card-head"><div><div class="card-title">Reading the results</div></div></div><div class="card-body prose"><ul>${(demo.limitations || []).map(l => `<li>${esc(l)}</li>`).join('')}</ul></div></section>
  <section class="card section"><div class="card-head"><div><div class="card-title">Data credits</div><div class="card-sub">Public datasets used in this demo</div></div></div>
  <div class="card-body table-wrap"><table class="table"><thead><tr><th>Dataset</th><th>Use</th><th>Accession</th></tr></thead><tbody>${(demo.sources || []).map(s => `<tr><td><b style="font-weight:600">${esc(s.name)}</b><small>${esc(s.citation)}</small></td><td>${esc(s.role)}</td><td><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.accession)}</a></td></tr>`).join('')}</tbody></table>
  <p class="note">Download: <a href="${publicFile('downloads/cellaris-demo-results.zip')}" download>demo results (CSV tables)</a></p></div></section>`;
}

/* ---------- Modals ---------- */
function modal(title, subtitle, body, foot = '', wide = false) {
  $('#modal-root').innerHTML = `<div class="overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" style="${wide ? 'width:min(1100px,100%)' : ''}">
    <div class="modal-head"><div><h2 id="modal-title">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div><button class="modal-close" aria-label="Close">×</button></div>
    <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</section></div>`;
  requestAnimationFrame(() => $('.modal-close')?.focus());
}
function closeModal() {
  $('#modal-root').innerHTML = '';
  if (state.polling) toast('The analysis continues in your workspace. Open New analysis to view progress.');
}
function referenceCard() {
  return `<div class="ref-card">${icon('database')}<div><b>Human pancreas model</b><small>9 cell types · applied automatically</small></div></div>`;
}
function newAnalysis(force = false) {
  if (state.job && state.polling && !force) { jobModal(); return; }
  state.bulk = null; state.bulkInfo = null;
  const schedule = Object.entries(SCHEDULES).map(([k, s]) => `<option value="${k}" ${k === 'quick' ? 'selected' : ''}>${esc(s.label)}</option>`).join('');
  modal('New analysis', 'Upload bulk RNA-seq counts from human pancreas or isolated islets.',
    `<label class="drop" id="bulk-zone">${icon('upload')}<b>Bulk RNA-seq count matrix</b><small>CSV or TSV · genes in rows, samples in columns · raw integer counts · HGNC gene symbols · up to 100 samples</small>
      <input id="bulk-file" type="file" accept=".csv,.tsv,.txt" hidden></label>
    <div id="bulk-summary" class="alert ok hidden"></div><div id="analysis-error" class="alert error hidden"></div>
    ${referenceCard()}
    <details class="advanced"><summary>Analysis settings</summary>
      <div class="form-grid">
        <label class="field full">Analysis depth<select class="select" id="schedule">${schedule}</select><small id="schedule-note">${esc(SCHEDULES.quick.note)}</small></label>
        <label class="field">Profiles per sample<input class="input" id="max-cells" type="number" min="10" max="25000" value="300"><small>Single-cell profiles estimated per sample</small></label>
        <label class="field">Random seed<input class="input" id="random-seed" type="number" min="0" max="2147483647" value="8"><small>Same seed and data give the same result</small></label>
      </div></details>
    <p class="note"><span id="runtime-estimate">Upload a count matrix to see an estimated run time.</span> Files are sent only to the Cellaris workspace you connect.</p>`,
    `<span id="worker-note">${state.worker.ready ? 'Workspace connected' : 'Connect a Cellaris workspace to run analyses'}</span><div class="controls">${state.worker.ready ? '' : '<button class="btn btn-secondary" data-action="worker">Connect workspace</button>'}<button class="btn btn-primary" id="run-analysis">Run analysis</button></div>`);
  const zone = $('#bulk-zone');
  zone.ondragover = e => { e.preventDefault(); zone.classList.add('drag'); };
  zone.ondragleave = () => zone.classList.remove('drag');
  zone.ondrop = e => { e.preventDefault(); zone.classList.remove('drag'); handleBulk(e.dataTransfer.files[0]); };
  $('#bulk-file').onchange = e => handleBulk(e.target.files[0]);
  $('#schedule').onchange = e => { $('#schedule-note').textContent = SCHEDULES[e.target.value].note; updateEstimate(); };
  $('#max-cells').addEventListener('input', updateEstimate);
  $('#run-analysis').onclick = submitJob;
}
async function validateBulk(file) {
  if (file.size > 60 * 1024 * 1024) throw new Error('The count matrix exceeds 60 MB. Filter unexpressed genes before upload.');
  const text = await file.text();
  if (text.includes('\0')) throw new Error('Provide a text CSV or TSV file.');
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (lines.length < 201) throw new Error('The matrix needs at least 200 genes.');
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const header = lines[0].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
  if (header.length < 2 || header.length > 101) throw new Error('Expected a gene column followed by 1–100 sample columns.');
  if (new Set(header.slice(1)).size !== header.length - 1 || header.slice(1).some(v => !v)) throw new Error('Sample names must be present and unique.');
  const genes = new Set(), sums = Array(header.length - 1).fill(0);
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
    if (row.length !== header.length) throw new Error(`Row ${i + 1} has ${row.length} columns; the header has ${header.length}.`);
    if (!row[0] || genes.has(row[0])) throw new Error(`Missing or duplicate gene symbol at row ${i + 1}.`);
    if (/^ENS[A-Z]*G\d/i.test(row[0])) throw new Error('Convert Ensembl IDs to HGNC gene symbols before upload.');
    genes.add(row[0]);
    for (let j = 1; j < row.length; j++) {
      const n = Number(row[j]);
      if (row[j] === '' || !Number.isFinite(n) || n < 0 || Math.abs(n - Math.round(n)) > 1e-6) throw new Error(`Row ${i + 1}: values must be raw non-negative integer counts (TPM, CPM or log values are not accepted).`);
      sums[j - 1] += n;
    }
  }
  if (sums.some(v => v === 0)) throw new Error('Every sample must contain counts.');
  const markers = ['INS', 'GCG', 'SST', 'PPY', 'PRSS1', 'KRT19', 'PECAM1', 'COL1A1'].filter(g => genes.has(g));
  return { genes: genes.size, samples: header.slice(1), markers, medianDepth: sums.slice().sort((a, b) => a - b)[sums.length >> 1] };
}
async function handleBulk(file) {
  if (!file) return;
  const err = $('#analysis-error'), ok = $('#bulk-summary'); err.classList.add('hidden'); ok.classList.add('hidden');
  try {
    state.bulkInfo = await validateBulk(file); state.bulk = file;
    const z = $('#bulk-zone'); z.classList.add('loaded'); $('b', z).textContent = file.name;
    $('small', z).textContent = `${num(state.bulkInfo.genes)} genes · ${state.bulkInfo.samples.length} samples · median library ${num(state.bulkInfo.medianDepth)} counts`;
    ok.textContent = `Format check passed. Pancreatic markers found: ${state.bulkInfo.markers.join(', ') || 'none of INS, GCG, SST, PPY, PRSS1, KRT19 (check gene symbols)'}.`;
    ok.classList.remove('hidden'); updateEstimate();
  } catch (e) {
    state.bulk = null; state.bulkInfo = null; $('#bulk-zone').classList.remove('loaded'); updateEstimate();
    err.textContent = e.message; err.classList.remove('hidden');
  }
}
function workerModal() {
  modal('Connect workspace', 'Analyses run in a Cellaris compute workspace.',
    `<div class="prose"><p>Enter the workspace URL and access token provided by Cellaris.</p></div>
    <div class="form-grid"><label class="field full">Workspace URL<input class="input" id="worker-url" value="${esc(state.worker.url || defaultWorkerURL())}" placeholder="https://workspace.example.com"></label>
    <label class="field full">Access token<input class="input" id="worker-token" type="password" value="${esc(state.worker.token)}" autocomplete="off" placeholder="Access token"><small>Kept in memory for this browser session only</small></label></div>
    <div id="connection-status" class="alert ${state.worker.ready ? 'ok' : 'hidden'}">${state.worker.ready ? 'Connected.' : ''}</div>`,
    `<span></span><button class="btn btn-primary" id="test-worker">Connect</button>`);
  $('#test-worker').onclick = connectWorker;
}
function defaultWorkerURL() {
  return ['localhost', '127.0.0.1'].includes(location.hostname) && location.port ? location.origin : 'http://localhost:8000';
}
async function connectWorker() {
  const status = $('#connection-status'), button = $('#test-worker');
  button.disabled = true; status.className = 'alert ok'; status.textContent = 'Connecting…';
  try {
    const u = new URL($('#worker-url').value.trim());
    if (u.username || u.password || u.search || u.hash) throw new Error('Use a plain workspace URL without credentials or query parameters.');
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
    if (u.protocol === 'http:' && !loopback) throw new Error('Remote workspaces must use HTTPS.');
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('The workspace URL must use HTTP or HTTPS.');
    const url = u.href.replace(/\/$/, ''), token = $('#worker-token').value.trim();
    if (token.length < 24) throw new Error('Enter the access token provided by Cellaris.');
    const health = await (await fetch(`${url}/health`, { signal: AbortSignal.timeout(12000) })).json();
    if (!health.ready) throw new Error('The workspace is starting. Try again shortly.');
    const auth = await fetch(`${url}/jobs`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(12000) });
    if (!auth.ok) throw new Error(auth.status === 401 ? 'The access token was rejected.' : auth.status === 403 ? `The workspace does not accept connections from this site (${location.origin}).` : `The workspace returned HTTP ${auth.status}.`);
    Object.assign(state.worker, { url, token, ready: true, info: health });
    localStorage.setItem('cellaris-worker-url', url);
    $('.worker-status').classList.add('connected'); $('#worker-label').textContent = 'Workspace connected';
    status.className = 'alert ok';
    status.textContent = health.reference?.ready ? 'Connected. The workspace is ready for analyses.' : 'Connected, but the workspace is still being set up. Try again shortly.';
    toast('Workspace connected');
  } catch (e) {
    state.worker.ready = false; $('.worker-status').classList.remove('connected'); $('#worker-label').textContent = 'Workspace not connected';
    status.className = 'alert error';
    status.textContent = e.name === 'TypeError' ? 'The workspace could not be reached. Check the URL and your network connection.' : e.message;
  } finally { button.disabled = false; }
}
async function submitJob() {
  const err = $('#analysis-error'); err.classList.add('hidden');
  try {
    if (!state.bulk) throw new Error('Choose a bulk RNA-seq count matrix first.');
    if (!state.worker.ready) { workerModal(); return; }
    const intval = id => Number($(id).value);
    const depth = SCHEDULES[$('#schedule').value] ? $('#schedule').value : 'quick';
    const cfg = { species: 'human', depth, profiles_per_sample: intval('#max-cells'), seed: intval('#random-seed') };
    for (const [k, lo, hi, label] of [['profiles_per_sample', 10, 25000, 'Profiles per sample'], ['seed', 0, 2147483647, 'Random seed']])
      if (!Number.isInteger(cfg[k]) || cfg[k] < lo || cfg[k] > hi) throw new Error(`${label} must be a whole number from ${lo} to ${hi}.`);
    const form = new FormData(); form.append('bulk', state.bulk); form.append('config', JSON.stringify(cfg));
    const run = $('#run-analysis'); run.disabled = true; run.textContent = 'Uploading…';
    const r = await fetch(`${state.worker.url}/jobs`, { method: 'POST', headers: { Authorization: `Bearer ${state.worker.token}` }, body: form, signal: AbortSignal.timeout(300000) });
    const payload = await r.json();
    if (!r.ok) throw new Error(typeof payload.detail === 'string' ? payload.detail : 'The workspace rejected the request: ' + JSON.stringify(payload.detail || payload).slice(0, 300));
    state.job = { ...payload, fileName: state.bulk.name, samples: state.bulkInfo.samples.length };
    state.polling = true; jobModal(); pollJob();
  } catch (e) {
    err.textContent = e.message; err.classList.remove('hidden');
    const run = $('#run-analysis'); if (run) { run.disabled = false; run.textContent = 'Run analysis'; }
  }
}
function jobModal() {
  const j = state.job; if (!j) return;
  const failed = j.status === 'failed';
  modal(failed ? 'Analysis failed' : 'Analysis in progress', esc(`${j.fileName} · ${j.samples} samples`),
    `<div style="display:flex;justify-content:space-between;font-size:13px"><b id="job-stage">${esc(stageName(j))}</b><span id="job-percent">${num(j.progress || 0)}%</span></div>
    <div class="progress"><i style="width:${Math.min(100, Number(j.progress) || 0)}%"></i></div>
    <div class="job-log" id="job-log">${esc(j.message || 'Waiting for the workspace')}</div>
    <div id="job-error" class="alert error ${j.error || j.pollingError ? '' : 'hidden'}">${esc(j.error || j.pollingError || '')}</div>`,
    `<span>Job ${esc(String(j.id).slice(0, 8))}</span><div class="controls">${!state.polling && !failed ? '<button class="btn btn-primary" data-action="resumejob">Resume</button>' : ''}${failed ? '<button class="btn btn-primary" data-action="freshanalysis">New analysis</button>' : ''}<button class="btn btn-secondary" data-action="hidejob">Continue browsing</button></div>`);
}
function stageName(j) {
  const s = String(j.stage || j.status || '');
  return { queued: 'Queued', starting: 'Starting', validating: 'Checking input', reconstruction: 'Estimating composition and profiles', metabolic_model: 'Modeling metabolism', packaging: 'Packaging results', completed: 'Complete', failed: 'Failed' }[s] || s;
}
async function pollJob() {
  const id = state.job.id;
  while (state.polling && state.job?.id === id) {
    try {
      const r = await fetch(`${state.worker.url}/jobs/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${state.worker.token}` }, signal: AbortSignal.timeout(20000) });
      const j = await r.json(); if (!r.ok) throw new Error(typeof j.detail === 'string' ? j.detail : `HTTP ${r.status}`);
      state.job = { ...state.job, ...j, pollingError: null };
      if ($('#job-stage')) {
        $('#job-stage').textContent = stageName(j); $('#job-percent').textContent = `${num(j.progress || 0)}%`;
        $('.progress i').style.width = `${Math.min(100, Number(j.progress) || 0)}%`; $('#job-log').textContent = j.message || '';
      }
      if (j.status === 'completed') {
        state.polling = false;
        const n = state.job.samples;
        state.data = prepare({ result: j.result, title: state.job.fileName.replace(/\.(csv|tsv|txt)$/i, ''), description: `${n} bulk RNA-seq sample${n === 1 ? '' : 's'} analyzed with the built-in human pancreas reference.` }, 'job');
        state.hidden.clear(); state.sample = 'all'; state.pathway = defaultPathway(); state.gene = null;
        $('#modal-root').innerHTML = ''; setView('overview'); toast('Analysis complete'); return;
      }
      if (j.status === 'failed') { state.polling = false; jobModal(); return; }
    } catch (e) {
      state.polling = false; state.job.pollingError = `Progress updates stopped (${e.message}). The job may still be running in the workspace; reconnect and choose Resume.`;
      if ($('#job-stage')) jobModal(); else toast('Progress updates stopped. Open New analysis to resume.');
      return;
    }
    await new Promise(r => setTimeout(r, 5000));
  }
}
function exportModal() {
  const canJob = state.data.origin === 'job' && state.job?.id && state.worker.ready;
  modal('Export', esc(state.data.title),
    `<div class="grid">
      <button class="btn btn-secondary" data-action="exportjson">${icon('download')} Workspace file (JSON, reopen with Import)</button>
      <button class="btn btn-secondary" data-action="exportpathways">${icon('download')} Pathway activity by cell type (CSV)</button>
      <button class="btn btn-secondary" data-action="exportcomposition">${icon('download')} Per-sample composition (CSV)</button>
      <button class="btn btn-secondary" data-action="exportliterature">${icon('download')} Literature support per reaction (CSV)</button>
      ${state.data.origin === 'demo' ? `<a class="btn btn-secondary" href="${publicFile('downloads/cellaris-demo-results.zip')}" download>${icon('download')} Demo results (ZIP)</a>` : ''}
      <button class="btn btn-secondary" data-action="downloadjob" ${canJob ? '' : 'disabled'}>${icon('download')} Full analysis results (ZIP)</button>
    </div>${canJob ? '' : '<p class="note">Full results are available for analyses run in this session.</p>'}`);
}
function guide() {
  modal('Getting started', 'Analyze human pancreatic bulk RNA-seq in four steps.',
    `<div class="prose"><ol>
      <li><b>Prepare counts.</b> A genes × samples matrix of raw integer counts with HGNC gene symbols (CSV or TSV) from pancreas or isolated islets.</li>
      <li><b>Connect.</b> Choose Connect workspace and enter the URL and access token provided by Cellaris.</li>
      <li><b>Upload and run.</b> Choose New analysis, select your count matrix and start the analysis.</li>
      <li><b>Explore.</b> Review composition, the metabolic map, pathway activity and marker genes, and export tables or the full results.</li>
    </ol></div>`, `<span>Human pancreas · bulk RNA-seq</span><button class="btn btn-primary" data-action="new">New analysis</button>`);
}
function download(name, data, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([data], { type })), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}
const csvCell = v => { let s = String(v ?? ''); if (/^[=+@-]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
function exportPathways() {
  const d = state.data;
  const rows = [['pathway_id', 'pathway', 'category', 'reactions', 'mean_activity', ...d.cellTypes.map(t => t.name)], ...d.pathways.map(p => [p.id, p.name, p.category, p.reactionCount, p.score, ...p.activity])];
  download('cellaris-pathway-activity.csv', rows.map(r => r.map(csvCell).join(',')).join('\n'));
}
function exportComposition() {
  const d = state.data, types = d.cellTypes.map(t => t.name);
  const metaKeys = [...new Set(d.samples.flatMap(s => Object.keys(s.meta)))];
  const rows = [['sample', ...metaKeys, ...types, 'profiles'], ...d.samples.map(s => [s.id, ...metaKeys.map(k => s.meta[k]), ...types.map(t => s.fractions[t]), s.profiles])];
  download('cellaris-composition.csv', rows.map(r => r.map(csvCell).join(',')).join('\n'));
}
async function downloadJob(kind) {
  try {
    const r = await fetch(`${state.worker.url}/jobs/${encodeURIComponent(state.job.id)}/download${kind === 'models' ? '/models' : ''}`, { headers: { Authorization: `Bearer ${state.worker.token}` } });
    if (!r.ok) throw new Error('The download is not available from the workspace.');
    const url = URL.createObjectURL(await r.blob()), a = document.createElement('a');
    a.href = url; a.download = kind === 'models' ? 'cellaris-model-weights.zip' : 'cellaris-results.zip'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { toast(e.message); }
}
function lightbox(src, title) {
  modal(esc(title), '', `<div class="lightbox"><img src="${esc(src)}" alt="${esc(title)}"></div>`, '', true);
}

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-view],[data-action],[data-pathway],[data-litsort],[data-type],[data-color],[data-gene],[data-figure],[data-src],.modal-close,.menu-btn,.overlay');
  if (!el) return;
  if (el.classList.contains('overlay')) { if (e.target === el) closeModal(); return; }
  if (el.classList.contains('modal-close')) { closeModal(); return; }
  if (el.classList.contains('menu-btn')) { $('#sidebar').classList.toggle('open'); return; }
  if (el.dataset.view) { $('#modal-root').innerHTML = ''; setView(el.dataset.view); return; }
  if (el.dataset.pathway) { state.pathway = el.dataset.pathway; setView('pathways'); return; }
  if (el.dataset.litsort) { const k = el.dataset.litsort; state.litDir = state.litSort === k ? -(state.litDir || -1) : (k === 'a' || k === 'top' ? 1 : -1); state.litSort = k; loadLiterature(); return; }
  if (el.dataset.type) { const t = el.dataset.type; state.hidden.has(t) ? state.hidden.delete(t) : state.hidden.add(t); render(); return; }
  if (el.dataset.color) { state.colorBy = el.dataset.color; render(); return; }
  if (el.dataset.gene) { state.gene = el.dataset.gene; render(); return; }
  if (el.dataset.figure !== undefined) { const f = ((state.data.figures.length ? state.data.figures : DEMO().figures) || [])[Number(el.dataset.figure)]; if (f) lightbox(f.png, f.title); return; }
  if (el.dataset.src) { lightbox(el.dataset.src, el.alt || 'Figure'); return; }
  switch (el.dataset.action) {
    case 'new': newAnalysis(); break;
    case 'freshanalysis': state.job = null; state.polling = false; newAnalysis(true); break;
    case 'worker': workerModal(); break;
    case 'guide': guide(); break;
    case 'export': exportModal(); break;
    case 'import': $('#result-file').click(); break;
    case 'demo': loadDemo(); setView('overview'); break;
    case 'exportjson': download('cellaris-workspace.json', JSON.stringify({ title: state.data.title, description: state.data.description, samples: state.data.samples, result: { cellTypes: state.data.cellTypes, pathways: state.data.pathways, cells: state.data.cells, geneExpression: state.data.geneExpression, counts: state.data.counts, metadata: state.data.metadata, warnings: state.data.warnings } }), 'application/json'); break;
    case 'exportpathways': exportPathways(); break;
    case 'exportcomposition': exportComposition(); break;
    case 'exportliterature': exportLiterature(); break;
    case 'downloadjob': downloadJob('results'); break;
    case 'hidejob': closeModal(); break;
    case 'resumejob': if (state.job && state.worker.ready) { state.job.pollingError = null; state.polling = true; jobModal(); pollJob(); } break;
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'sample-select') { state.sample = e.target.value; drawEmbedding(); }
  if (e.target.id === 'category-select') { state.category = e.target.value; render(); }
  if (e.target.id === 'lit-hyp') { state.litHyp = e.target.checked; loadLiterature(); }
  if (e.target.id === 'sample-sort') { state.sampleSort = e.target.value; render(); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'pathway-search') {
    const pos = e.target.selectionStart; state.search = e.target.value.toLowerCase(); render();
    const input = $('#pathway-search'); input.focus(); input.setSelectionRange(pos, pos);
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('.overlay')) closeModal();
  if (e.key === 'Enter' && e.target.dataset?.pathway) { state.pathway = e.target.dataset.pathway; setView('pathways'); }
});
$('#result-file').onchange = async e => {
  try {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 40 * 1024 * 1024) throw new Error('Result files must be smaller than 40 MB.');
    const raw = JSON.parse(await file.text());
    state.data = prepare({ title: raw.title || file.name.replace(/\.json$/i, ''), description: raw.description || 'Imported Cellaris result.', ...raw, result: raw.result || raw }, 'import');
    state.hidden.clear(); state.sample = 'all'; state.pathway = defaultPathway(); state.job = null; state.polling = false;
    setView('overview'); toast('Result imported');
  } catch (error) { toast(`Import failed: ${error.message}`); } finally { e.target.value = ''; }
};
function loadDemo() {
  state.data = prepare(DEMO(), 'demo'); state.hidden.clear(); state.sample = 'all'; state.pathway = defaultPathway(); state.gene = null;
}
function init() {
  $$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  try { loadDemo(); } catch (e) { $('#view').innerHTML = `<div class="card"><div class="empty">The demo data could not be loaded: ${esc(e.message)}</div></div>`; return; }
  const hash = location.hash.slice(1);
  setView(VIEWS[hash] ? hash : 'overview');
}
init();
