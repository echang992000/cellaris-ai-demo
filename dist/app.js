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
  signaling: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
  compare: '<path d="M7 4v16M17 4v16M3 8h8M13 16h8"/><circle cx="7" cy="8" r="1.6"/><circle cx="17" cy="16" r="1.6"/>',
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
const VIEWS = { overview: 'Overview', samples: 'Samples', pathways: 'Metabolic pathways', signaling: 'Signaling pathways', compare: 'Compare groups', genes: 'Gene expression', figures: 'Figures', about: 'About' };
const SCHEDULES = {
  quick: { label: 'Quick', note: 'Fastest; suited to a first look', t1: 300, t2: 100 },
  standard: { label: 'Standard', note: 'Recommended for final results', t1: 1000, t2: 1000 },
  extended: { label: 'Extended', note: 'Longest training', t1: 3500, t2: 1500 },
};
const FIXED = { replicates: 5 };
/* Run-time estimate of the hosted workspace (4 CPUs); mirrors the estimate the workspace itself uses. */
function runtimeEstimate() {
  const samples = state.bulkInfo?.samples.length;
  if (!samples) return 'Upload a count matrix to see an estimated run time.';
  const sch = SCHEDULES[$('#schedule')?.value] || SCHEDULES.quick, per = Number($('#max-cells')?.value) || 0, profiles = samples * per;
  const metabolic = $('#metabolic-on') ? $('#metabolic-on').checked : true, compare = Object.keys(state.groups).length > 0;
  const seconds = 500 + 0.013 * profiles + (metabolic ? FIXED.replicates * sch.t2 * profiles * 6.5e-4 : 0) + (compare ? 90 : 0), minutes = seconds / 60;
  const text = minutes < 90 ? `${Math.max(5, Math.round(minutes / 5) * 5)} min` : `${(minutes / 60).toFixed(1)} h`;
  return `Estimated run time for ${samples} sample${samples === 1 ? '' : 's'} × ${num(per)} profiles${metabolic ? '' : ' without the metabolic model'}: up to about ${text}. Analyses estimated to exceed the workspace limit run at Quick depth.`;
}
function updateEstimate() { const el = $('#runtime-estimate'); if (el) el.textContent = runtimeEstimate(); }

const state = {
  data: null, view: 'overview', colorBy: 'type', sample: 'all', hidden: new Set(), pathway: null,
  search: '', category: 'all', gene: null, sampleSort: 'beta',
  gs: { on: new Set(['H', 'PROGENY']), search: '', sort: 'spread', set: null, limit: 40 },
  cmp: { collection: 'H', setSearch: '', setLimit: 30, geneSearch: '', geneLimit: 50 },
  groups: {}, demoKey: 'islets', demoRaw: null,
  worker: { url: localStorage.getItem('cellaris-worker-url') || '', token: '', ready: false, info: null },
  job: null, polling: false, bulk: null, bulkInfo: null,
};
const DEMO = () => state.demoRaw || window.CELLARIS_DEMO || {};
const DEMOS = { islets: { label: 'Islet donors (GSE50244)', short: 'Islet donor demo' },
  pannet: { label: 'PanNET vs adjacent pancreas (GSE281039)', url: 'demos/pannet.json', short: 'PanNET demo', comparison: true },
  pdac: { label: 'PDAC vs adjacent pancreas (CPTAC-3)', url: 'demos/pdac.json', short: 'PDAC demo', comparison: true } };
const otherDemos = () => Object.keys(DEMOS).filter(k => k !== state.demoKey);
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
  const comparison = checkComparison(result.comparison || null), genesets = checkGenesets(result.genesets || null);
  const outside = new Set(Object.values(comparison?.composition?.flaggedSamples || {}).flat());
  const samples = (raw.samples || result.samples || []).map(s => ({
    id: String(s.id), label: s.label || String(s.id), profiles: s.profiles ?? null, fractions: s.fractions || {},
    meta: comparison ? { Group: comparison.samples?.[String(s.id)] ?? 'Not compared', ...(s.meta || {}), ...(comparison.composition ? { 'Healthy reference': outside.has(String(s.id)) ? 'Outside' : 'Within' } : {}) } : (s.meta || {}),
  }));
  return {
    origin, title: raw.title || 'Pancreas analysis', subtitle: raw.subtitle || '', description: raw.description || '',
    cellTypes, pathways, cells: result.cells, geneExpression: result.geneExpression || {},
    counts: { ...result.counts, pathways: pathways.length }, samples, metadata: result.metadata || result.provenance || {}, warnings: result.warnings || [],
    figures: raw.figures || [], maps: raw.maps || {}, literature: raw.literature || {}, literatureMeta: result.metadata?.literature || raw.literatureMeta || null,
    metabolic: result.metadata?.metabolicModel !== false, genesets, genesetsUrl: raw.genesetsUrl || null, comparison, comparisonUrl: raw.comparisonUrl || null,
    download: raw.download || null, lazy: {},
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
  $('#dataset-meta').textContent = !d.metabolic && d.comparison ? `${num(d.counts.samples)} samples · ${d.comparison.test} vs ${d.comparison.reference}` : `${num(d.counts.samples)} samples · ${num(d.counts.cells)} profiles`;
  const views = { overview: viewOverview, samples: viewSamples, pathways: viewPathways, signaling: viewSignaling, compare: viewCompare, genes: viewGenes, figures: viewFigures, about: viewAbout };
  $('#view').innerHTML = views[state.view]();
  const pick = $('#demo-select'); if (pick) pick.value = d.origin === 'demo' ? state.demoKey : '';
  if (state.view === 'overview') drawEmbedding();
  if (state.view === 'pathways' && d.metabolic) { loadPathwayMap(); loadLiterature(); }
  if (state.view === 'compare' && d.comparison) drawVolcano();
}

/* ---------- Overview ---------- */
function viewOverview() {
  const d = state.data, comp = meanComposition(d), c = d.comparison;
  const isDemo = d.origin === 'demo';
  const samples = [...new Set(d.cells.map(x => x.sample))];
  const others = otherDemos().map(k => `<button class="btn btn-secondary" data-demo="${k}">${esc(DEMOS[k].short)}</button>`).join('');
  const banner = isDemo
    ? `<div class="banner">${icon('info')}<div><b>Demo dataset.</b> ${esc(DEMO().bannerText || 'Public data analyzed with Cellaris.')}</div><div class="controls banner-actions">${others}<button class="btn btn-primary" data-action="new">Analyze your data</button></div></div>`
    : `<div class="banner">${icon('info')}<div><b>${d.origin === 'job' ? 'Computed analysis.' : 'Imported analysis.'}</b> Results for ${esc(d.title)} from your Cellaris workspace.</div><button class="btn btn-secondary" data-action="demo">Return to demo</button></div>`;
  const nSets = d.genesets ? Object.values(d.genesets.collections).reduce((a, k) => a + (k.shownSets || 0), 0) : null;
  const kpis = [
    ['Samples', d.counts.samples, isDemo ? 'Bulk RNA-seq libraries' : 'Uploaded bulk samples'],
    c && !d.metabolic ? ['Groups compared', 2, `${c.test} (${num(c.de.nTest)}) vs ${c.reference} (${num(c.de.nReference)})`] : ['Single-cell profiles', d.counts.cells, 'Estimated from the bulk data'],
    ['Cell types', d.cellTypes.length, 'Human pancreas and islet cell types'],
    d.metabolic ? ['Pathways scored', d.pathways.length, `KEGG pathways · ${num(d.counts.reactions)} reactions`]
      : c ? ['Differentially expressed genes', c.de.summary?.n_sig, `${c.test} vs ${c.reference}, adjusted p < 0.05`] : ['Gene sets scored', nSets, 'Signaling and functional pathways'],
  ].map(([k, v, f]) => `<div class="card kpi"><div class="k-label">${esc(k)}</div><div class="k-value">${num(v)}</div><div class="k-foot">${esc(f)}</div></div>`).join('');
  const flow = d.metabolic ? ['Bulk RNA-seq', 'Cell-type composition', 'Single-cell profiles', 'Metabolic activity', 'Pathway insights']
    : c ? ['Bulk RNA-seq', 'Cell-type composition', 'Group comparison', 'Pathway enrichment'] : ['Bulk RNA-seq', 'Cell-type composition', 'Single-cell profiles', 'Signaling and functional pathways'];
  const nEnriched = c ? Object.values(c.pathways?.collections || {}).reduce((a, k) => a + (k.significant || 0), 0) : 0;
  const summary = `<section class="card"><div class="card-head"><div><div class="card-title">${c ? 'Group comparison' : 'Analysis without the metabolic model'}</div><div class="card-sub">${c ? `${esc(c.test)} (${num(c.de.nTest)} samples) vs ${esc(c.reference)} (${num(c.de.nReference)} samples)` : 'Composition, estimated profiles and gene-set activity'}</div></div></div>
      <div class="card-body prose">${c ? `<p>${num(c.de.summary?.n_sig)} genes differ between the groups at adjusted p < 0.05 (${num(c.de.summary?.n_sig_up)} higher and ${num(c.de.summary?.n_sig_down)} lower in ${esc(c.test)}); ${num(nEnriched)} gene sets are enriched at adjusted p < 0.05.</p>` : ''}
      <p>The metabolic model was not run for this analysis, so KEGG pathway activity, the metabolic map and literature support are not available.</p>
      <div class="controls">${c ? '<button class="btn btn-primary" data-view="compare">Open the comparison</button>' : ''}${d.genesets || d.genesetsUrl ? '<button class="btn btn-secondary" data-view="signaling">Signaling pathways</button>' : ''}</div></div></section>`;
  const mapCard = d.metabolic ? `<section class="card"><div class="card-head"><div><div class="card-title">Metabolic map</div><div class="card-sub">Each point is one estimated single-cell profile, placed by metabolic similarity (UMAP)</div></div>
      <div class="controls"><div class="segmented"><button class="${state.colorBy === 'type' ? 'active' : ''}" data-color="type">Cell type</button><button class="${state.colorBy === 'score' ? 'active' : ''}" data-color="score">Pathway activity</button></div>
      <select class="select" id="sample-select" aria-label="Filter by sample"><option value="all">All samples</option>${samples.map(s => `<option value="${esc(s)}" ${state.sample === s ? 'selected' : ''}>${esc(sampleLabel(s))}</option>`).join('')}</select></div></div>
      <div class="card-body"><div class="embed-wrap"><svg class="embedding" viewBox="0 0 640 400" role="img" aria-label="Metabolic map of single-cell profiles"></svg><div class="tip hidden"></div></div>
      <div class="legend">${d.cellTypes.map(t => `<button class="${state.hidden.has(t.name) ? 'off' : ''}" data-type="${esc(t.name)}"><span class="swatch" style="background:${t.color}"></span>${esc(t.label)}</button>`).join('')}</div></div>
      <div class="card-foot"><span>${d.cells.length < d.counts.cells ? `Showing ${num(d.cells.length)} of ${num(d.counts.cells)} profiles` : `Showing all ${num(d.cells.length)} profiles`}</span><span>Select a cell type to hide it</span></div></section>` : summary;
  return `${pageHead(isDemo ? 'Demo analysis' : 'Analysis', d.title, esc(d.description || d.subtitle))}
  ${banner}${oodBanner(d)}
  <div class="flow">${flow.map(x => `<span>${x}</span>`).join('<i>→</i>')}</div>
  <div class="grid kpis">${kpis}</div>
  <div class="grid two section">
    ${mapCard}
    <section class="card"><div class="card-head"><div><div class="card-title">Cell-type composition</div><div class="card-sub">${d.samples.length ? `Mean estimated fraction of cells across ${num(d.samples.length)} samples (%)` : 'Share of single-cell profiles (%)'}</div></div></div>
      <div class="card-body"><div class="stack">${comp.map(t => `<span style="width:${(t.share * 100).toFixed(2)}%;background:${t.color}" title="${esc(t.label)} ${pct(t.share)}"></span>`).join('')}</div>
      <div style="margin-top:10px">${comp.map(t => `<div class="comp-row"><span class="swatch" style="background:${t.color}"></span><span>${esc(t.label)}</span><span class="bar"><i style="width:${Math.min(100, t.share * 100 / Math.max(...comp.map(x => x.share)) * 100).toFixed(1)}%;background:${t.color}"></i></span><b>${pct(t.share)}</b></div>`).join('')}</div></div>
      <div class="card-foot"><span>Fractions sum to 100% per sample</span><button class="link-btn" data-view="samples">Per-sample view →</button></div></section>
  </div>
  ${d.metabolic ? `<div class="section">${pathwayTable(8)}</div>` : ''}`;
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
  ${oodBanner(d)}<section class="card"><div class="card-body"><svg viewBox="0 0 ${L + W + 4} ${T + H + 40}" style="width:100%;height:auto" role="img" aria-label="Stacked composition per sample">
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
  if (!d.metabolic) return `${pageHead('Pathways', 'Metabolic pathway explorer', '')}<div class="card"><div class="empty">The metabolic model was not run for this analysis, so KEGG pathway activity is not available. Signaling and functional pathways and the group comparison have their own views.</div></div>`;
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
      <section class="card" id="literature-card"><div class="card-head"><div><div class="card-title">Literature support</div><div class="card-sub">Human pancreas papers that mention the enzymes of each reaction on this map, curated enzyme evidence and abstracts flagged as relevant. Counts show prior study, not proof of activity.</div></div><span class="badge accent">Human pancreas</span></div>
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
function literatureClaims(lit, noun) {
  const cl = lit.claims;
  if (!cl) return `<p class="note" style="margin:14px 0 0">No human pancreas abstracts mention this pathway's enzymes in ${esc(noun)} cells.</p>`;
  const ORIGIN = { human: 'Human data', mixed: 'Human and animal data' };
  const items = (cl.items || []).map(it => `<li><a href="https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(it.pmid)}/" target="_blank" rel="noopener">${esc(it.title || `PMID ${it.pmid}`)}</a><small>${esc(it.year || '')} · PMID ${esc(it.pmid)}${ORIGIN[it.origin] ? ` · ${ORIGIN[it.origin]}` : ''}</small>${it.quote ? `<blockquote>“${esc(it.quote)}”</blockquote>` : ''}</li>`).join('');
  return `<div class="lit-claims"><div class="note" style="margin:18px 0 6px">Abstracts on this pathway in ${esc(noun)} cells: ${num(cl.relevant)} of ${num(cl.assessed)} screened abstracts flagged as relevant${cl.items?.length ? ' (quoted below)' : ''}</div>${items ? `<ol class="claims">${items}</ol>` : ''}</div>`;
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
    return `<tr><td>${esc(c.a)} – ${esc(c.b)}${c.hypothesis ? `<span class="badge warn hyp" title="Specific prediction; at least one paper would have been expected in this cell type, none found">Candidate hypothesis</span>` : ''}<small>${esc(rx.slice(0, 3).join(', '))}${rx.length > 3 ? ` +${rx.length - 3}` : ''}</small></td>
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
    <dt>Papers in that cell type</dt><dd>The subset that also concerns the cell type with the highest relative activity (for example, MeSH Insulin-Secreting Cells or “beta cell” for beta cells). Papers on islet autoimmunity mention beta-cell autoantigens such as GAD2 and G6PC2 together with immune cells; such counts reflect immunology, not enzyme activity in immune cells.</dd>
    <dt>Expected and enrichment</dt><dd>Expected = human pancreas papers × the share of human pancreas literature that concerns that cell type. Enrichment = (observed + 0.5) / (expected + 0.5); values above 1 mean the enzymes are discussed in that cell type more often than an average gene studied in pancreas.</dd>
    <dt>Curated enzyme papers</dt><dd>Experimental evidence for the enzyme's catalytic activity in reviewed human UniProtKB/Swiss-Prot entries, matched to the reaction by EC number.</dd>
    <dt>Highest relative activity</dt><dd>Each profile's reaction activities are divided by that profile's mean activity, averaged per cell type and compared across cell types. The margin is the difference between the first and second cell type in standard deviations across cell types.</dd>
    <dt>Candidate hypothesis</dt><dd>Predicted activity is specific to one cell type (margin of at least 1 SD), and the enzymes are studied often enough in human pancreas that at least one paper in that cell type would be expected, but none was found. These are hypotheses for follow-up, not findings.</dd>
    <dt>Abstracts flagged as relevant</dt><dd>Abstracts of papers that mention the pathway's enzymes in the cell type were screened automatically for statements about the pathway or its enzymes in that cell type in human material; abstracts whose evidence comes only from animals, non-human cells or an unstated source are not flagged. Flagged abstracts are shown with the sentence that was quoted. The screen does not decide whether a paper supports or contradicts activity: read the quoted text and the paper.</dd>
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
  const d = state.data, cols = ['pathway_id', 'pathway_name', 'connection_index', 'metabolite_a', 'metabolite_b', 'kegg_reactions', 'enzyme_genes', 'highest_cell_type', 'second_cell_type', 'specificity_margin_z', 'human_pancreas_papers', 'papers_in_highest_cell_type', 'expected_papers_in_highest_cell_type', 'enrichment', 'human_pancreas_papers_incl_cancer', 'papers_in_highest_cell_type_incl_cancer', 'curated_enzyme_papers', 'recent_pmids_human_pancreas', 'recent_pmids_highest_cell_type', 'curated_pmids', 'candidate_hypothesis'];
  const q = v => { const t = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const lines = [cols.join(',')];
  for (const p of d.pathways) {
    const lit = await getLiterature(p.id); if (!lit) continue;
    for (const c of lit.connections || [])
      lines.push([p.id, p.name, c.i, c.a, c.b, c.reactions, (c.genes || []).join(';'), c.top, c.second, c.margin, c.pancreas, c.cell, c.expected, c.enrichment, c.pancreasInclCancer, c.cellInclCancer, c.curated, (c.pancreasPmids || []).join(';'), (c.cellPmids || []).join(';'), (c.curatedPmids || []).join(';'), c.hypothesis ? 'True' : 'False'].map(q).join(','));
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

/* ---------- Shared helpers for gene sets and comparisons ---------- */
const GS_ORDER = ['H', 'PROGENY', 'REACTOME', 'WIKIPATHWAYS', 'GOBP'];
const GS_LABEL = { H: 'Hallmark', PROGENY: 'PROGENy', REACTOME: 'Reactome', WIKIPATHWAYS: 'WikiPathways', GOBP: 'GO Biological Process' };
const CONSENSUS = { 'consistent across databases': ['Consistent across databases', 'ok'], 'single database': ['Single database', ''], 'not assessable': ['Not assessable', 'muted'] };
const CONSENSUS_HELP = {
  'consistent across databases': 'sets from different databases that describe this theme rank the cell types alike after their shared genes are removed',
  'single database': 'no set from another database ranks the cell types alike once shared genes are removed, or the theme exists in one database only',
  'not assessable': 'the sets of this theme share too many genes to compare databases independently',
};
const consensusHelp = v => state.data?.genesets?.consensusLevels?.[v] || CONSENSUS_HELP[v] || '';
const consensusBadge = v => CONSENSUS[v] ? `<span class="badge ${CONSENSUS[v][1]}" title="${esc(consensusHelp(v))}">${esc(CONSENSUS[v][0])}</span>` : '<span class="note">—</span>';
const fmtP = v => !Number.isFinite(v) ? '—' : v < 1e-300 ? '< 1e-300' : v < 1e-3 ? v.toExponential(1) : v.toFixed(3);
const shorten = (s, n = 46) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
function diverge(v, m) {
  if (!Number.isFinite(v)) return 'background:#f2f4f7;color:#98a2b3';
  const t = Math.max(-1, Math.min(1, v / (m || 1))), a = [247, 247, 247], end = t >= 0 ? [178, 24, 43] : [33, 102, 172];
  const c = a.map((x, i) => Math.round(x + (end[i] - x) * Math.abs(t)));
  return `background:rgb(${c.join(',')});color:${Math.abs(t) > .55 ? '#fff' : '#0b1f33'}`;
}
function ticksFor(a, b, n = 5) {
  const span = b - a || 1, mag = 10 ** Math.floor(Math.log10(span / n));
  const step = [1, 2, 2.5, 5, 10].map(x => x * mag).find(x => span / x <= n) || 10 * mag, out = [];
  for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(10));
  return out;
}
function scaleLegend(m, label) {
  return `<span class="scale-legend" role="img" aria-label="${esc(label)}: color scale from ${sig(-m)} to ${sig(m)}"><span>${sig(-m)}</span><i></i><span>${sig(m)}</span><small>${esc(label)}</small></span>`;
}
/* Horizontal bars around zero. items: [{name, v, color, faint, mark, note}] */
function divergingBars(items, label, { labelWidth = 150, width = 420, row = 24 } = {}) {
  const L = labelWidth, W = width, T = 8, H = Math.max(1, items.length) * row;
  const m = Math.max(...items.map(x => Math.abs(x.v)).filter(Number.isFinite), 1e-9);
  const X = v => L + W / 2 + v / m * (W / 2 - 40);
  const body = items.map((x, i) => {
    const y = T + i * row, mid = y + row / 2 + 4, ok = Number.isFinite(x.v), c = x.color || (x.v >= 0 ? '#b42318' : '#175cd3');
    return `<text x="${L - 8}" y="${mid}" text-anchor="end"><title>${esc(x.name)}</title>${esc(shorten(x.name, Math.round(L / 6.4)))}</text>` + (ok
      ? `<rect x="${Math.min(X(0), X(x.v)).toFixed(1)}" y="${y + 4}" width="${Math.max(.5, Math.abs(X(x.v) - X(0))).toFixed(1)}" height="${row - 8}" rx="3" fill="${c}" fill-opacity="${x.faint ? .35 : .9}"><title>${esc(x.name)}: ${sig(x.v)}${x.note ? ` · ${esc(x.note)}` : ''}</title></rect><text x="${(x.v >= 0 ? X(x.v) + 5 : X(x.v) - 5).toFixed(1)}" y="${mid}" text-anchor="${x.v >= 0 ? 'start' : 'end'}" fill="#344054">${sig(x.v)}${x.mark || ''}</text>`
      : `<text x="${(X(0) + 6).toFixed(1)}" y="${mid}" fill="#98a2b3">${esc(x.note || 'not available')}</text>`);
  }).join('');
  const ticks = ticksFor(-m, m, 4).map(v => `<line x1="${X(v).toFixed(1)}" x2="${X(v).toFixed(1)}" y1="${T + H}" y2="${T + H + 5}" stroke="#98a2b3"/><text x="${X(v).toFixed(1)}" y="${T + H + 18}" text-anchor="middle">${sig(v)}</text>`).join('');
  return `<svg class="svgplot" viewBox="0 0 ${L + W + 8} ${T + H + 46}" role="img" aria-label="${esc(label)}"><g font-size="12" fill="#667085">${body}<line x1="${X(0).toFixed(1)}" x2="${X(0).toFixed(1)}" y1="${T}" y2="${T + H}" stroke="#344054"/><line x1="${L}" x2="${L + W}" y1="${T + H}" y2="${T + H}" stroke="#98a2b3"/>${ticks}<text class="axis-title" x="${L + W / 2}" y="${T + H + 38}" text-anchor="middle" fill="#344054">${esc(label)}</text></g></svg>`;
}
function checkGenesets(g) {
  if (!g) return null;
  if (typeof g !== 'object' || !Array.isArray(g.cellTypes) || !g.collections || typeof g.collections !== 'object') throw new Error('Invalid gene-set activity block.');
  let n = 0;
  for (const c of Object.values(g.collections)) for (const s of c.sets || []) {
    if (typeof s.id !== 'string' || !Array.isArray(s.activity) || s.activity.length !== g.cellTypes.length) throw new Error('Invalid gene-set activity table.');
    if (++n > 12000) throw new Error('The gene-set table is too large to display.');
  }
  return g;
}
function checkComparison(c) {
  if (!c) return null;
  if (typeof c !== 'object' || typeof c.test !== 'string' || typeof c.reference !== 'string' || !Array.isArray(c.de?.volcano?.points) || !Array.isArray(c.de?.table)) throw new Error('Invalid comparison block.');
  if (c.de.volcano.points.length > 80000) throw new Error('The comparison is too large to display.');
  return c;
}
/* Demo results load large blocks on first use. */
async function ensureLazy(key, check) {
  const d = state.data, url = d[`${key}Url`];
  if (d[key] || !url || d.lazy[key]) return;
  d.lazy[key] = 'loading';
  try {
    const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`);
    d[key] = check(await r.json()); d.lazy[key] = 'done';
  } catch (e) { d.lazy[key] = `error: ${e.message}`; }
  if (state.data === d) render();
}
function oodBanner(d) {
  const comp = d.comparison?.composition; if (!comp?.banner) return '';
  const counts = Object.entries(comp.bannerCounts || {}).map(([g, t]) => `${esc(t)} ${esc(g)}`).join('; ');
  return `<div class="banner warn" role="note">${icon('info')}<div><b>Samples outside the healthy reference.</b> ${esc(comp.banner)}${counts ? ` Flagged samples: ${counts}.` : ''}</div></div>`;
}

/* ---------- Signaling and functional pathways ---------- */
function genesetRows(g, on) {
  const q = state.gs.search;
  let rows = on.flatMap(c => (g.collections[c].sets || []).map(s => ({ ...s, collection: c })));
  if (q) rows = rows.filter(s => `${s.label} ${s.id} ${s.theme || ''}`.toLowerCase().includes(q));
  for (const s of rows) { const v = s.activity.filter(Number.isFinite); s.spread = v.length > 1 ? Math.max(...v) - Math.min(...v) : -1; }
  return rows.sort(state.gs.sort === 'name' ? (a, b) => a.label.localeCompare(b.label) : (a, b) => b.spread - a.spread);
}
function viewSignaling() {
  const d = state.data, g = d.genesets;
  const intro = 'Activity of curated gene sets in the estimated single-cell profiles of each cell type. Hallmark and PROGENy are shown by default; Reactome, WikiPathways and GO Biological Process can be added. Scores are relative units: compare them between cell types and samples within one analysis.';
  const head = pageHead('Pathways', 'Signaling and functional pathways', intro, g ? `<div class="controls"><button class="btn btn-secondary" data-action="exportgenesets">${icon('download')} CSV</button></div>` : '');
  if (!g) {
    const st = d.lazy.genesets;
    if (d.genesetsUrl && !String(st || '').startsWith('error')) { ensureLazy('genesets', checkGenesets); return `${head}<div class="card"><div class="empty">Loading gene-set activity…</div></div>`; }
    return `${head}<div class="card"><div class="empty">${st ? `Gene-set activity could not be loaded (${esc(st.replace(/^error: /, ''))}).` : 'This result does not include signaling and functional pathway activity.'}</div></div>`;
  }
  const cols = GS_ORDER.filter(c => g.collections[c]);
  if (!cols.some(c => state.gs.on.has(c))) state.gs.on = new Set(cols.filter(c => g.collections[c].defaultOn).length ? cols.filter(c => g.collections[c].defaultOn) : cols.slice(0, 1));
  const on = cols.filter(c => state.gs.on.has(c)), types = g.cellTypes, rows = genesetRows(g, on);
  const abs = rows.flatMap(s => s.activity).filter(Number.isFinite).map(Math.abs).sort((a, b) => a - b);
  const m = abs.length ? abs[Math.min(abs.length - 1, Math.floor(abs.length * .95))] || abs[abs.length - 1] || 1 : 1;
  const shown = rows.slice(0, state.gs.limit), sel = rows.find(s => s.id === state.gs.set) || rows[0];
  const toggles = cols.map(c => { const k = g.collections[c], a = state.gs.on.has(c); return `<button class="${a ? 'active' : ''}" data-gscol="${c}" aria-pressed="${a}">${esc(k.label || GS_LABEL[c])}<small>${num(k.shownSets)}</small></button>`; }).join('');
  const table = `<table class="table gs-table"><thead><tr><th>Gene set</th><th>Collection</th><th title="Agreement of related gene sets across databases">Consistency</th>${types.map((t, i) => `<th class="num"><span class="swatch" style="background:${typeColor(t, i)};margin-right:5px"></span>${esc(typeLabel(t))}</th>`).join('')}<th class="num" title="Member genes found among the scoring genes, of the genes in the set">Genes used</th></tr></thead>
    <tbody>${shown.map(s => `<tr class="clickable${s.id === sel?.id ? ' selected' : ''}" data-gs="${esc(s.id)}" tabindex="0"><td><b style="font-weight:600">${esc(s.label)}</b><small>${esc(s.id)}${s.collection === 'GOBP' && s.theme ? ` · theme: ${esc(s.theme)}` : ''}</small></td><td><span class="badge">${esc(GS_LABEL[s.collection])}</span></td><td>${consensusBadge(s.consensus)}</td>${s.activity.map(v => `<td class="num"><span class="heat" style="${diverge(v, m)}">${sig(v)}</span></td>`).join('')}<td class="num">${num(s.genesUsed)} / ${num(s.libraryGenes)}</td></tr>`).join('') || `<tr><td colspan="${4 + types.length}" class="empty">No gene sets match the filter.</td></tr>`}</tbody></table>`;
  return `${head}${oodBanner(d)}
  <section class="card"><div class="card-body" style="padding-bottom:6px"><div class="controls">
    <div class="toggle-chips" role="group" aria-label="Gene-set collections">${toggles}</div>
    <label class="search">${icon('search')}<input class="input" id="gs-search" type="search" placeholder="Search gene sets or themes" value="${esc(state.gs.search)}" aria-label="Search gene sets"></label>
    <select class="select" id="gs-sort" aria-label="Sort gene sets"><option value="spread" ${state.gs.sort !== 'name' ? 'selected' : ''}>Largest difference between cell types</option><option value="name" ${state.gs.sort === 'name' ? 'selected' : ''}>Name</option></select></div>
    <p class="note" style="margin:8px 0 0">${num(rows.length)} gene sets · mean activity per cell type (relative units)${on.includes('GOBP') ? ' · GO Biological Process terms are grouped into themes of overlapping terms; one representative term per theme is listed' : ''}. Select a row for details.</p></div>
    <div class="card-body table-wrap" style="max-height:560px;padding-top:0">${table}</div>
    <div class="card-foot">${scaleLegend(m, 'Activity score (relative units)')}${rows.length > shown.length ? `<button class="link-btn" data-action="gsmore">Show ${num(Math.min(40, rows.length - shown.length))} more of ${num(rows.length - shown.length)}</button>` : '<span></span>'}</div></section>
  ${sel ? genesetDetail(g, sel, m) : ''}
  <p class="note">${esc(g.cellTypeSummaryRule ? `Cell-type values: ${g.cellTypeSummaryRule}.` : '')} Gene sets with fewer than ${num(g.minGenesPerSet || 5)} genes among the scoring genes are not scored. Gene-set definitions: MSigDB (CC BY 4.0) and PROGENy (Apache-2.0); see About for credits.</p>`;
}
function genesetDetail(g, s, m) {
  const types = g.cellTypes, vals = s.activity.map((v, i) => ({ v, t: types[i] })).filter(x => Number.isFinite(x.v));
  const hi = vals.length ? vals.reduce((a, b) => (b.v > a.v ? b : a)) : null, lo = vals.length ? vals.reduce((a, b) => (b.v < a.v ? b : a)) : null;
  const bars = divergingBars(types.map((t, i) => ({ name: typeLabel(t), v: s.activity[i], color: typeColor(t, i), note: Number.isFinite(s.activity[i]) ? '' : 'too few profiles' })), 'Activity score (relative units)', { labelWidth: 110, width: 430 });
  return `<div class="grid two section">
    <section class="card"><div class="card-head"><div><div class="card-title">${esc(s.label)}</div><div class="card-sub">${esc(s.id)} · ${esc(GS_LABEL[s.collection])}${s.theme ? ` · theme: ${esc(s.theme)}` : ''}</div></div>${consensusBadge(s.consensus)}</div>
      <div class="card-body"><div class="metrics"><div class="metric"><small>Genes used</small><b>${num(s.genesUsed)} <span class="of">of ${num(s.libraryGenes)}</span></b></div><div class="metric"><small>Highest in</small><b>${esc(hi ? typeLabel(hi.t) : '—')}</b></div><div class="metric"><small>Lowest in</small><b>${esc(lo ? typeLabel(lo.t) : '—')}</b></div></div>
      <div class="note" style="margin:14px 0 4px">Mean activity by cell type</div>${bars}
      ${CONSENSUS[s.consensus] ? `<p class="note">${esc(CONSENSUS[s.consensus][0])}: ${esc(consensusHelp(s.consensus))}.</p>` : ''}</div></section>
    <section class="card"><div class="card-head"><div><div class="card-title">Per-sample activity</div><div class="card-sub">Mean activity of this gene set in each sample and cell type</div></div>${s.perSample ? `<button class="btn btn-secondary" data-action="exportgssamples">${icon('download')} CSV</button>` : ''}</div>
      <div class="card-body">${perSamplePlot(g, s)}</div></section></div>`;
}
function perSamplePlot(g, s) {
  if (!g.perSampleAvailable) return '<p class="note">Per-sample values are not available for this result: its estimated profiles do not carry sample-specific expression. Cell-type values are shown on the left.</p>';
  if (!s.perSample) return '<p class="note">Per-sample values are shown for Hallmark and PROGENy gene sets. For the other collections they are included in the results download (folder pathway_activity).</p>';
  const types = g.cellTypes, samples = g.samples || [], cnt = g.profilesPerUnit || [], pts = [];
  s.perSample.forEach((row, si) => row.forEach((v, ti) => { if (Number.isFinite(v)) pts.push({ v, si, ti, low: (cnt[si]?.[ti] ?? 99) < 20 }); }));
  if (!pts.length) return '<p class="note">No sample and cell-type combination has enough profiles for this gene set.</p>';
  const lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v)), pad = (hi - lo) * .08 || 1, y0 = lo - pad, y1 = hi + pad;
  const L = 60, W = 650, T = 10, H = 250, cw = W / types.length, Y = v => T + H - (v - y0) / (y1 - y0) * H;
  const jit = (si, ti) => ((((si + 1) * 9301 + (ti + 1) * 49297) % 233280) / 233280 - .5) * cw * .56;
  const dots = pts.map(p => { const c = typeColor(types[p.ti], p.ti), x = L + cw * (p.ti + .5) + jit(p.si, p.ti); return `<circle cx="${x.toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.3" fill="${p.low ? '#fff' : c}" fill-opacity="${p.low ? 1 : .8}" stroke="${c}" stroke-width="1.2"><title>${esc(sampleLabel(samples[p.si]))} · ${esc(typeLabel(types[p.ti]))}: ${sig(p.v)} (${num(cnt[p.si]?.[p.ti])} profiles${p.low ? ', low confidence' : ''})</title></circle>`; }).join('');
  const axis = ticksFor(y0, y1, 5).map(v => `<line x1="${L - 5}" x2="${L}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#98a2b3"/><text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${sig(v)}</text>`).join('');
  const zero = y0 < 0 && y1 > 0 ? `<line x1="${L}" x2="${L + W}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="#d0d5dd" stroke-dasharray="3 3"/>` : '';
  const xl = types.map((t, i) => `<text x="${(L + cw * (i + .5)).toFixed(1)}" y="${T + H + 16}" text-anchor="middle">${esc(typeLabel(t).replace(' (gamma)', ''))}</text><text x="${(L + cw * (i + .5)).toFixed(1)}" y="${T + H + 29}" text-anchor="middle" font-size="10.5">n = ${pts.filter(p => p.ti === i).length}</text>`).join('');
  return `<svg class="svgplot" viewBox="0 0 ${L + W + 8} ${T + H + 60}" role="img" aria-label="Per-sample activity of ${esc(s.label)}"><g font-size="11.5" fill="#667085">${axis}${zero}<line x1="${L}" x2="${L}" y1="${T}" y2="${T + H}" stroke="#98a2b3"/><line x1="${L}" x2="${L + W}" y1="${T + H}" y2="${T + H}" stroke="#98a2b3"/>${xl}
    <text class="axis-title" transform="translate(14 ${T + H / 2}) rotate(-90)" text-anchor="middle" fill="#344054">Activity score (relative units)</text><text class="axis-title" x="${L + W / 2}" y="${T + H + 52}" text-anchor="middle" fill="#344054">Cell type (one point per sample; n = samples shown)</text></g>${dots}</svg>
    <div class="legend static"><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#667085"/></svg>20 or more profiles</span><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#fff" stroke="#667085" stroke-width="1.2"/></svg>10–19 profiles (low confidence)</span><span>Fewer than 10 profiles: not shown</span></div>`;
}
async function exportGenesets() {
  const d = state.data; if (!d.genesets && d.genesetsUrl) await ensureLazy('genesets', checkGenesets);
  const g = d.genesets; if (!g) return toast('This result has no gene-set activity.');
  const on = GS_ORDER.filter(c => g.collections[c] && state.gs.on.has(c));
  const rows = [['collection', 'gene_set', 'label', 'theme', 'consistency', 'genes_used', 'library_genes', ...g.cellTypes.map(t => `activity_${t}`)]];
  for (const c of on) for (const s of g.collections[c].sets) rows.push([GS_LABEL[c], s.id, s.label, s.theme, CONSENSUS[s.consensus]?.[0] || '', s.genesUsed, s.libraryGenes, ...s.activity]);
  download('cellaris-geneset-activity.csv', rows.map(r => r.map(csvCell).join(',')).join('\n'));
}
function exportGenesetSamples() {
  const g = state.data.genesets; if (!g) return;
  const s = GS_ORDER.flatMap(c => g.collections[c]?.sets || []).find(x => x.id === state.gs.set) || genesetRows(g, GS_ORDER.filter(c => g.collections[c] && state.gs.on.has(c)))[0];
  if (!s?.perSample) return toast('Per-sample values are not available for this gene set.');
  const rows = [['gene_set', 'sample', 'cell_type', 'profiles', 'reliability', 'activity']];
  s.perSample.forEach((row, si) => row.forEach((v, ti) => { const n = g.profilesPerUnit?.[si]?.[ti] ?? ''; rows.push([s.id, g.samples[si], g.cellTypes[ti], n, n === '' ? '' : n >= 20 ? 'shown' : n >= 10 ? 'low confidence' : 'withheld', v]); }));
  download(`cellaris-${s.id.toLowerCase()}-per-sample.csv`, rows.map(r => r.map(csvCell).join(',')).join('\n'));
}

/* ---------- Group comparison ---------- */
function viewCompare() {
  const d = state.data, c = d.comparison;
  const intro = 'Two groups of bulk samples compared: differential gene expression, pathway enrichment and estimated cell-type composition by group.';
  if (!c) {
    const st = d.lazy.comparison;
    if (d.comparisonUrl && !String(st || '').startsWith('error')) { ensureLazy('comparison', checkComparison); return `${pageHead('Comparison', 'Compare groups', intro)}<div class="card"><div class="empty">Loading the comparison…</div></div>`; }
    return `${pageHead('Comparison', 'Compare groups', intro)}<section class="card"><div class="card-body prose"><p>${st ? `The comparison could not be loaded (${esc(st.replace(/^error: /, ''))}).` : 'This analysis does not include a group comparison.'}</p>
      <p>To compare groups, choose <b>New analysis</b>, upload your counts, open <b>Compare two groups</b> and assign samples to a test group and a reference group (at least 2 samples each). The comparison demos show examples with pancreatic tumors and adjacent pancreas: pancreatic neuroendocrine tumors (PanNET) and pancreatic ductal adenocarcinoma (PDAC).</p>
      <div class="controls"><button class="btn btn-primary" data-action="new">New analysis</button>${otherDemos().filter(k => DEMOS[k].comparison).map(k => `<button class="btn btn-secondary" data-demo="${k}">Open the ${esc(DEMOS[k].short)}</button>`).join('')}</div></div></section>`;
  }
  const de = c.de, s = de.summary || {};
  const kpis = [[c.test, de.nTest, 'Samples in the test group'], [c.reference, de.nReference, 'Samples in the reference group'], ['Genes tested', s.n_padj_defined ?? s.n_genes_tested, `${num(de.genesAfterFilter)} genes passed the expression filter`],
    ['Differentially expressed genes', s.n_sig, `Adjusted p < 0.05: ${num(s.n_sig_up)} higher and ${num(s.n_sig_down)} lower in ${c.test}`]]
    .map(([k, v, f]) => `<div class="card kpi"><div class="k-label">${esc(k)}</div><div class="k-value">${num(v)}</div><div class="k-foot">${esc(f)}</div></div>`).join('');
  const notices = (c.notices || []).map(n => `<div class="alert warn">${esc(n)}</div>`).join('')
    + (d.origin === 'demo' && DEMO().compareNote ? `<div class="banner" role="note" id="compare-note">${icon('info')}<div>${esc(DEMO().compareNote)}</div></div>` : '');
  const sf = de.sizeFactors?.chosen === 'positive counts' ? 'size factors from positive counts (many genes have zero counts in some samples)' : 'median-of-ratios size factors';
  return `${pageHead('Comparison', `${c.test} vs ${c.reference}`, intro, `<div class="controls"><button class="btn btn-secondary" data-action="exportde">${icon('download')} Genes (CSV)</button><button class="btn btn-secondary" data-action="exportenrich">${icon('download')} Pathways (CSV)</button></div>`)}
  ${oodBanner(d)}${notices}
  <div class="grid kpis">${kpis}</div>
  <div class="grid two section">${volcanoCard(c)}${compositionCompare(c)}</div>
  <div class="section">${enrichmentCard(c)}</div>
  <div class="grid two section">${progenyCard(c)}${themesCard(c)}</div>
  <div class="section">${deTableCard(c)}</div>
  <p class="note">Model: ${esc(de.design === 'covariate + group' ? 'group, adjusted for the covariate' : 'group')}; normalization: ${esc(sf)}. Fold changes are test vs reference. Bulk comparisons combine differences in composition and differences within cell types.</p>`;
}
function volcanoCard(c) {
  const n = c.de.nSignDiscordant || 0;
  return `<section class="card"><div class="card-head"><div><div class="card-title">Volcano plot</div><div class="card-sub">Each point is one gene: shrunken log2 fold change (${esc(c.test)} vs ${esc(c.reference)}) against −log10 adjusted p-value. Labels: the 10 genes with the smallest adjusted p.</div></div></div>
    <div class="card-body"><div id="volcano" class="plot-frame"><div class="empty">Loading the plot…</div></div></div>
    <div class="card-foot"><span>Red: higher in ${esc(c.test)}; blue: lower in ${esc(c.test)}; gray: adjusted p ≥ 0.05.${n ? ` Open circles: ${num(n)} genes whose fold change changes sign under shrinkage.` : ''}</span></div></section>`;
}
async function drawVolcano() {
  const holder = $('#volcano'); if (!holder) return;
  const c = state.data.comparison, pts = c.de.volcano.points;
  try {
    const Plotly = await loadPlotly(); if (state.view !== 'compare' || !$('#volcano')) return;
    let gl = false; try { gl = !!document.createElement('canvas').getContext('webgl'); } catch (e) { gl = false; }
    const groups = [['ns', 'Adjusted p ≥ 0.05', '#98a2b3', 4], ['down', `Lower in ${c.test}`, '#175cd3', 5.5], ['up', `Higher in ${c.test}`, '#b42318', 5.5]];
    const traces = groups.map(([key, name, color, size]) => {
      const sel = pts.filter(p => p[3] === key);
      return { type: gl ? 'scattergl' : 'scatter', mode: 'markers', name, x: sel.map(p => p[1]), y: sel.map(p => p[2]), hoverinfo: 'text',
        text: sel.map(p => `<b>${esc(p[0])}</b><br>log2 fold change ${sig(p[1])}<br>adjusted p ${fmtP(10 ** -p[2])}${p[4] ? '<br>fold change changes sign under shrinkage' : ''}`),
        marker: { size, color: sel.map(p => (p[4] ? 'rgba(255,255,255,0)' : color)), line: { color, width: sel.map(p => (p[4] ? 1.2 : 0)) }, opacity: key === 'ns' ? .55 : .85 } };
    });
    const byGene = new Map(pts.map(p => [p[0], p]));
    const ann = (c.de.volcano.labels || []).map(gname => byGene.get(gname)).filter(Boolean).map(p => ({ x: p[1], y: p[2], text: esc(p[0]), showarrow: true, arrowhead: 0, arrowwidth: .8, arrowcolor: '#667085', ax: p[1] >= 0 ? 22 : -22, ay: -16, font: { size: 11, color: '#1d2939' } }));
    ann.push({ xref: 'paper', x: 1, xanchor: 'right', y: -Math.log10(0.05), yanchor: 'bottom', text: 'adjusted p = 0.05', showarrow: false, font: { size: 10.5, color: '#667085' } });
    holder.innerHTML = '';
    await Plotly.newPlot(holder, traces, {
      height: 440, margin: { l: 64, r: 16, t: 34, b: 56 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff', hovermode: 'closest',
      font: { family: 'Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif', size: 12, color: '#1d2939' },
      legend: { orientation: 'h', x: 0, y: 1.1, font: { size: 11.5 } }, annotations: ann,
      shapes: [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: -Math.log10(0.05), y1: -Math.log10(0.05), line: { color: '#98a2b3', width: 1, dash: 'dot' } }],
      xaxis: { title: { text: `Shrunken log2 fold change (${esc(c.test)} vs ${esc(c.reference)})` }, zeroline: true, zerolinecolor: '#d0d5dd', gridcolor: '#f2f4f7' },
      yaxis: { title: { text: '−log10 adjusted p-value' }, rangemode: 'tozero', gridcolor: '#f2f4f7' },
    }, { displaylogo: false, responsive: true, modeBarButtonsToRemove: ['lasso2d', 'select2d'] });
  } catch (e) { if ($('#volcano')) $('#volcano').innerHTML = `<div class="empty">The volcano plot could not be drawn (${esc(e.message)}).</div>`; }
}
function compositionCompare(c) {
  const comp = c.composition;
  if (!comp) return '<section class="card"><div class="card-head"><div><div class="card-title">Composition by group</div></div></div><div class="card-body"><div class="empty">Composition was not estimated for this comparison.</div></div></section>';
  const types = comp.table.map(r => r.cell_type), samples = Object.keys(comp.fractions);
  const grp = c.samples || {}, flagged = new Set(Object.values(comp.flaggedSamples || {}).flat());
  const col = { [c.test]: '#b42318', [c.reference]: '#175cd3' };
  const vmax = Math.max(...samples.flatMap(sm => types.map(t => comp.fractions[sm]?.[t] || 0)), .05), ymax = Math.min(1, Math.ceil(vmax * 10 + 1e-9) / 10);
  const L = 56, W = 640, T = 10, H = 240, cw = W / types.length, Y = v => T + H - v / ymax * H;
  const off = g => (g === c.test ? -.19 : .19) * cw;
  const dots = samples.map((sm, si) => types.map((t, ti) => {
    const v = comp.fractions[sm]?.[t]; if (!Number.isFinite(v)) return '';
    const g = grp[sm], x = L + cw * (ti + .5) + off(g) + ((((si + 1) * 7919) % 97) / 97 - .5) * cw * .16, k = col[g] || '#667085', out = flagged.has(sm);
    return `<circle cx="${x.toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.2" fill="${out ? '#fff' : k}" fill-opacity="${out ? 1 : .75}" stroke="${k}" stroke-width="1.2"><title>${esc(sm)} (${esc(g || '')}) · ${esc(typeLabel(t))}: ${pct(v)}${out ? ' · outside the healthy reference' : ''}</title></circle>`;
  }).join('')).join('');
  const med = comp.table.map((r, ti) => [[c.test, r.median_test_pct], [c.reference, r.median_reference_pct]].map(([g, v]) => { const x = L + cw * (ti + .5) + off(g); return Number.isFinite(v) ? `<line x1="${(x - cw * .13).toFixed(1)}" x2="${(x + cw * .13).toFixed(1)}" y1="${Y(v / 100).toFixed(1)}" y2="${Y(v / 100).toFixed(1)}" stroke="#0b1f33" stroke-width="2"/>` : ''; }).join('')).join('');
  const axis = ticksFor(0, ymax * 100, 5).map(v => `<line x1="${L - 5}" x2="${L}" y1="${Y(v / 100).toFixed(1)}" y2="${Y(v / 100).toFixed(1)}" stroke="#98a2b3"/><text x="${L - 8}" y="${(Y(v / 100) + 4).toFixed(1)}" text-anchor="end">${v}</text>`).join('');
  const xl = types.map((t, i) => `<text x="${(L + cw * (i + .5)).toFixed(1)}" y="${T + H + 16}" text-anchor="middle">${esc(typeLabel(t).replace(' (gamma)', ''))}</text>`).join('');
  const svg = `<svg class="svgplot" viewBox="0 0 ${L + W + 8} ${T + H + 46}" role="img" aria-label="Estimated cell-type fractions by group"><g font-size="11.5" fill="#667085">${axis}<line x1="${L}" x2="${L}" y1="${T}" y2="${T + H}" stroke="#98a2b3"/><line x1="${L}" x2="${L + W}" y1="${T + H}" y2="${T + H}" stroke="#98a2b3"/>${xl}
    <text class="axis-title" transform="translate(14 ${T + H / 2}) rotate(-90)" text-anchor="middle" fill="#344054">Estimated fraction of cells (%)</text><text class="axis-title" x="${L + W / 2}" y="${T + H + 38}" text-anchor="middle" fill="#344054">Cell type (points: samples; bars: group medians)</text></g>${dots}${med}</svg>`;
  const rows = comp.table.map(r => `<tr><td>${esc(typeLabel(r.cell_type))}</td><td class="num">${sig(r.median_test_pct)}</td><td class="num">${sig(r.median_reference_pct)}</td><td class="num">${r.median_difference_pp > 0 ? '+' : ''}${sig(r.median_difference_pp)}</td><td class="num">${fmtP(r.padj)}</td></tr>`).join('');
  const th = comp.fit?.thresholds || {};
  const fitRows = Object.entries(comp.fit?.samples || {}).map(([sm, f]) => `<tr><td>${esc(sm)}</td><td>${esc(grp[sm] || '')}</td><td class="num">${sig(f.fit_r)}</td><td class="num">${Number.isFinite(f.unexplained) ? (f.unexplained * 100).toFixed(1) : '—'}</td><td>${f.outside_reference ? '<span class="badge warn">Outside</span>' : 'Within'}</td></tr>`).join('');
  return `<section class="card"><div class="card-head"><div><div class="card-title">Composition by group</div><div class="card-sub">Estimated fraction of cells of each type in every sample (%)</div></div></div>
    <div class="card-body">${svg}<div class="legend static"><span><span class="swatch" style="background:${col[c.test]}"></span>${esc(c.test)}</span><span><span class="swatch" style="background:${col[c.reference]}"></span>${esc(c.reference)}</span><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#fff" stroke="#667085" stroke-width="1.2"/></svg>Sample outside the healthy reference</span></div>
    <div class="table-wrap"><table class="table"><thead><tr><th>Cell type</th><th class="num">Median, ${esc(c.test)} (%)</th><th class="num">Median, ${esc(c.reference)} (%)</th><th class="num">Difference (percentage points)</th><th class="num">Adjusted p</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="note">Test: ${esc(comp.test || 'two-sided rank-sum test per cell type, adjusted across cell types')}.</p>
    ${fitRows ? `<details class="advanced"><summary>How well each sample fits the healthy reference</summary><p class="note">Each sample is described as a mixture of the reference cell types. A sample is flagged as outside the reference when the correlation between its expression and the best mixture is below ${sig(th.fit_r_min)} or the share of expression the mixture leaves unexplained exceeds ${Number.isFinite(th.unexplained_max) ? (th.unexplained_max * 100).toFixed(0) : '—'}%.</p><div class="table-wrap" style="max-height:260px"><table class="table"><thead><tr><th>Sample</th><th>Group</th><th class="num">Fit correlation</th><th class="num">Unexplained (%)</th><th>Reference</th></tr></thead><tbody>${fitRows}</tbody></table></div></details>` : ''}</div></section>`;
}
function enrichmentCard(c) {
  const P = c.pathways || {}, cols = ['H', 'REACTOME', 'WIKIPATHWAYS', 'GOBP'].filter(k => P.collections?.[k]);
  if (!cols.length) return '<section class="card"><div class="card-body"><div class="empty">Pathway enrichment is not available for this comparison.</div></div></section>';
  const k = cols.includes(state.cmp.collection) ? state.cmp.collection : cols[0], col = P.collections[k];
  const q = state.cmp.setSearch; let rows = col.sets || [];
  if (q) rows = rows.filter(r => `${r.label} ${r.id} ${r.theme || ''}`.toLowerCase().includes(q));
  const top = (col.sets || []).slice(0, 15).map(r => ({ name: r.label, v: r.nes, faint: !(r.padj < 0.05), mark: r.padj < 0.05 ? ' *' : '', note: `adjusted p ${fmtP(r.padj)}` }));
  const tabs = cols.map(x => `<button class="${x === k ? 'active' : ''}" data-cmpcol="${x}">${esc(GS_LABEL[x])} <small>${num(P.collections[x].significant)} of ${num(P.collections[x].tested)}</small></button>`).join('');
  const shown = rows.slice(0, state.cmp.setLimit);
  return `<section class="card"><div class="card-head"><div><div class="card-title">Pathway enrichment</div><div class="card-sub">Gene sets whose genes rank toward higher (positive score) or lower (negative score) expression in ${esc(c.test)}; numbers show significant sets (adjusted p < 0.05) of the sets tested</div></div></div>
    <div class="card-body"><div class="controls"><div class="segmented" role="group" aria-label="Gene-set collection">${tabs}</div><label class="search">${icon('search')}<input class="input" id="cmp-set-search" type="search" placeholder="Search gene sets" value="${esc(state.cmp.setSearch)}" aria-label="Search gene sets"></label></div>
    <div class="grid halves" style="margin-top:14px"><div><div class="note" style="margin:0 0 4px">The 15 gene sets with the smallest adjusted p (* adjusted p < 0.05)</div>${top.length ? divergingBars(top, 'Normalized enrichment score', { labelWidth: 230, width: 330, row: 22 }) : '<div class="empty">No gene sets were tested.</div>'}</div>
    <div class="table-wrap" style="max-height:470px"><table class="table"><thead><tr><th>Gene set</th><th class="num">Score</th><th class="num">Size</th><th class="num">Adjusted p</th><th>Consistency</th><th>Top contributing genes</th></tr></thead>
    <tbody>${shown.map(r => `<tr><td><b style="font-weight:600">${esc(r.label)}</b><small>${esc(r.id)}${k === 'GOBP' && r.theme ? ` · theme: ${esc(r.theme)}` : ''}</small></td><td class="num"><span class="heat" style="${diverge(r.nes, 3)}">${sig(r.nes)}</span></td><td class="num">${num(r.size)}</td><td class="num">${fmtP(r.padj)}</td><td>${consensusBadge(r.consensus)}</td><td><span class="genes">${esc((r.leadingGenes || []).slice(0, 8).join(', '))}</span></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No gene sets match.</td></tr>'}</tbody></table>
    ${rows.length > shown.length ? `<button class="link-btn" data-action="cmpsetmore">Show more (${num(rows.length - shown.length)} remaining)</button>` : ''}</div></div>
    <p class="note">Score: normalized enrichment score; positive = the set's genes rank toward higher expression in ${esc(c.test)}. The table lists up to 300 sets per collection; all tested sets are in the results download.</p></div></section>`;
}
function progenyCard(c) {
  const p = c.pathways?.progeny || [];
  const items = [...p].sort((a, b) => b.score - a.score).map(r => ({ name: r.label, v: r.score, faint: !(r.padj < 0.05), mark: r.padj < 0.05 ? ' *' : '', note: `adjusted p ${fmtP(r.padj)}, ${num(r.targets)} genes` }));
  return `<section class="card"><div class="card-head"><div><div class="card-title">Signaling pathway activity (PROGENy)</div><div class="card-sub">Activity of 14 signaling pathways inferred from their response genes, ${esc(c.test)} vs ${esc(c.reference)} (* adjusted p < 0.05)</div></div></div>
    <div class="card-body">${items.length ? divergingBars(items, `Pathway activity score (${c.test} vs ${c.reference})`, { labelWidth: 110, width: 420, row: 22 }) : '<div class="empty">Pathway activity is not available for this comparison.</div>'}</div></section>`;
}
function themesCard(c) {
  const P = c.pathways || {}, th = P.themes || [], bm = (P.bestMatches || []).filter(r => r.query_padj < 0.05);
  const rows = th.map(t => `<tr><td><b style="font-weight:600">${esc(t.theme_label)}</b><small>${esc(t.top_set || '')}</small></td><td><span class="badge ${t.call === 'up' ? 'warn' : 'accent'}">${t.call === 'up' ? `Higher in ${esc(c.test)}` : `Lower in ${esc(c.test)}`}</span></td><td>${esc(String(t.collections_up || t.collections_down || '').replace(/,/g, ', '))}</td><td class="num">${num(t.n_sig_sets)} of ${num(t.n_tested)}</td></tr>`).join('');
  const bmRows = bm.map(r => `<tr><td>${esc(GS_LABEL[r.query_collection] || r.query_collection)}: ${esc(String(r.query_set).replace(/^(HALLMARK|PROGENY)_/, '').replace(/_/g, ' ').toLowerCase())}</td><td class="num">${sig(r.query_score)}</td><td class="num">${num(r.n_matches_sig_same_sign)} of ${num(r.n_matches_tested)}</td><td class="num">${num(r.n_matches_sig_opposite)}</td></tr>`).join('');
  return `<section class="card"><div class="card-head"><div><div class="card-title">Themes consistent across databases</div><div class="card-sub">Themes of related gene sets that change in the same direction in more than one database</div></div></div>
    <div class="card-body">${rows ? `<div class="table-wrap"><table class="table"><thead><tr><th>Theme</th><th>Direction</th><th>Databases</th><th class="num">Significant sets</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="note">No theme changed consistently across databases.</p>'}
    ${bmRows ? `<div class="note" style="margin:14px 0 4px">Significant Hallmark and PROGENy sets and their best-matching sets in other databases</div><div class="table-wrap"><table class="table"><thead><tr><th>Gene set</th><th class="num">Score</th><th class="num">Matches, same direction</th><th class="num">Matches, opposite</th></tr></thead><tbody>${bmRows}</tbody></table></div>` : ''}
    <p class="note">${esc(P.themeCaveat || '')}</p></div></section>`;
}
function deTableCard(c) {
  const q = state.cmp.geneSearch; let rows = c.de.table;
  if (q) rows = rows.filter(r => r.gene.toLowerCase().includes(q));
  const shown = rows.slice(0, state.cmp.geneLimit);
  return `<section class="card"><div class="card-head"><div><div class="card-title">Differentially expressed genes</div><div class="card-sub">The ${num(c.de.table.length)} genes with the smallest adjusted p; the full table is in the results download</div></div>
    <label class="search">${icon('search')}<input class="input" id="cmp-gene-search" type="search" placeholder="Search genes" value="${esc(state.cmp.geneSearch)}" aria-label="Search genes"></label></div>
    <div class="card-body table-wrap" style="max-height:520px"><table class="table"><thead><tr><th>Gene</th><th class="num">Mean normalized count</th><th class="num">log2 fold change</th><th class="num">Shrunken log2 fold change</th><th class="num">Standard error</th><th class="num">p</th><th class="num">Adjusted p</th><th>Direction</th></tr></thead>
    <tbody>${shown.map(r => `<tr><td><i style="font-style:italic;font-weight:600">${esc(r.gene)}</i>${r.signDiscordant ? '<small>fold change changes sign under shrinkage</small>' : ''}</td><td class="num">${num(r.baseMean, 1)}</td><td class="num">${sig(r.log2FC)}</td><td class="num">${sig(r.log2FCShrunk)}</td><td class="num">${sig(r.lfcSE)}</td><td class="num">${fmtP(r.pvalue)}</td><td class="num">${fmtP(r.padj)}</td><td>${r.direction === 'up' ? `Higher in ${esc(c.test)}` : r.direction === 'down' ? `Lower in ${esc(c.test)}` : 'Not significant'}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No genes match.</td></tr>'}</tbody></table></div>
    <div class="card-foot"><span>Fold changes: test (${esc(c.test)}) vs reference (${esc(c.reference)}); adjusted p: false discovery rate</span>${rows.length > shown.length ? `<button class="link-btn" data-action="cmpgenemore">Show 50 more</button>` : '<span></span>'}</div></section>`;
}
function exportDE() {
  const c = state.data.comparison; if (!c) return toast('This result has no comparison.');
  const rows = [['gene', 'mean_normalized_count', 'log2_fold_change', 'log2_fold_change_shrunk', 'log2_fold_change_se', 'pvalue', 'padj', 'direction', 'shrinkage_changes_sign'], ...c.de.table.map(r => [r.gene, r.baseMean, r.log2FC, r.log2FCShrunk, r.lfcSE, r.pvalue, r.padj, r.direction, r.signDiscordant])];
  download('cellaris-comparison-genes.csv', rows.map(r => r.map(csvCell).join(',')).join('\n'));
}
function exportEnrichment() {
  const c = state.data.comparison; if (!c) return toast('This result has no comparison.');
  const rows = [['collection', 'gene_set', 'label', 'normalized_enrichment_score', 'set_size', 'pvalue', 'padj', 'theme', 'consistency', 'top_contributing_genes']];
  for (const [k, col] of Object.entries(c.pathways?.collections || {})) for (const r of col.sets || []) rows.push([GS_LABEL[k] || k, r.id, r.label, r.nes, r.size, r.pvalue, r.padj, r.theme, CONSENSUS[r.consensus]?.[0] || '', (r.leadingGenes || []).join(';')]);
  for (const r of c.pathways?.progeny || []) rows.push(['PROGENy', r.id, r.label, r.score, r.targets, r.pvalue, r.padj, '', '', '']);
  download('cellaris-comparison-pathways.csv', rows.map(r => r.map(csvCell).join(',')).join('\n'));
}

/* ---------- Figures ---------- */
function viewFigures() {
  const own = state.data.figures.length ? state.data.figures : null, figs = own || window.CELLARIS_DEMO?.figures || [];
  const note = !own ? '<div class="banner">' + icon('info') + `<div>These figures describe the islet donor demo cohort. ${state.data.origin === 'demo' ? 'The results of this demo are in the other views and in its results download.' : 'Your own results are in the other views and in the results download.'}</div></div>` : '';
  return `${pageHead('Report', 'Figures', 'Summary figures for the demo analysis. Each figure is available as PNG and SVG.')}${note}
  <div class="figure-grid">${figs.map((f, i) => `<article class="card figure-card"><div class="card-body"><div class="fig-num">Figure ${i + 1}</div><div class="card-title" style="margin:2px 0 12px">${esc(f.title)}</div>
    <img src="${esc(f.png)}" alt="${esc(f.title)}" loading="lazy" data-figure="${i}"><div class="caption">${esc(f.caption)}</div>
    <div class="downloads"><a href="${esc(f.png)}" download>PNG</a><a href="${esc(f.svg)}" download>SVG</a></div></div></article>`).join('')}</div>`;
}


/* ---------- About ---------- */
function viewAbout() {
  const d = state.data, demo = DEMO();
  const nSets = d.genesets ? Object.values(d.genesets.collections).reduce((a, k) => a + (k.scorableSets || 0), 0) : null;
  const facts = [['Samples', num(d.counts.samples)], ['Single-cell profiles', num(d.counts.cells)], ['Cell types', num(d.cellTypes.length)],
    ...(d.metabolic ? [['KEGG pathways scored', num(d.pathways.length)], ['Metabolic reactions', num(d.counts.reactions)]] : [['Metabolic model', 'Not run']]),
    ...(nSets ? [['Gene sets scored', num(nSets)]] : []), ...(d.comparison ? [['Groups compared', `${esc(d.comparison.test)} vs ${esc(d.comparison.reference)}`]] : [])];
  return `${pageHead('About', 'Cellaris AI Demo', 'Cell-type and metabolic insight from bulk RNA-seq of human pancreas.')}
  <div class="steps">
    <div class="step"><div class="n">INPUT</div><h4>Bulk RNA-seq counts</h4><p>Raw integer counts from human pancreas or isolated islets: genes (HGNC symbols) in rows, samples in columns, CSV or TSV, up to 100 samples.</p></div>
    <div class="step"><div class="n">OUTPUT</div><h4>Cell-type composition</h4><p>Estimated share of beta, alpha, delta, PP, acinar, ductal, endothelial, stellate and immune cells in every sample.</p></div>
    <div class="step"><div class="n">OUTPUT</div><h4>Single-cell profiles</h4><p>Single-cell expression profiles estimated from each bulk sample, with marker-gene summaries and a metabolic map.</p></div>
    <div class="step"><div class="n">OUTPUT</div><h4>Metabolic activity</h4><p>Activity of KEGG metabolic pathways and reactions in each cell type, with interactive pathway maps.</p></div>
    <div class="step"><div class="n">OUTPUT</div><h4>Signaling and functional pathways</h4><p>Activity of Hallmark, PROGENy, Reactome, WikiPathways and GO Biological Process gene sets in each cell type and sample.</p></div>
    <div class="step"><div class="n">OPTIONAL</div><h4>Group comparison</h4><p>Two groups of samples compared: differential expression with a volcano plot, pathway enrichment and composition by group.</p></div>
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
  <p class="note">Download: <a href="${publicFile(d.origin === 'demo' && d.download ? d.download : 'downloads/cellaris-demo-results.zip')}" download>demo results (CSV tables)</a></p></div></section>
  <section class="card section"><div class="card-head"><div><div class="card-title">Gene-set resources</div><div class="card-sub">Definitions behind the signaling and functional pathways and the pathway enrichment of comparisons</div></div></div>
  <div class="card-body table-wrap"><table class="table"><thead><tr><th>Resource</th><th>Version</th><th>License</th><th>Citation</th></tr></thead><tbody>${GENESET_CREDITS.map(([n, v, l, c, dois]) => `<tr><td><b style="font-weight:600">${esc(n)}</b></td><td>${esc(v)}</td><td>${esc(l)}</td><td>${esc(c)}${[].concat(dois || []).map(x => ` <a href="https://doi.org/${esc(x)}" target="_blank" rel="noopener">doi:${esc(x)}</a>`).join(';')}</td></tr>`).join('')}</tbody></table>
  <p class="note">MSigDB gene sets: © Broad Institute, Inc., Massachusetts Institute of Technology and Regents of the University of California, used under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. PROGENy under the <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener">Apache License 2.0</a>. Changes: gene symbols were matched to the genes of the built-in reference; sets were filtered by size (Hallmark 5–1,000 genes; Reactome, WikiPathways and GO Biological Process 10–500 genes); PROGENy was limited to the 500 top-weighted genes per pathway. Results downloads include the license texts. No endorsement by the source projects is implied.</p></div></section>`;
}
const GENESET_CREDITS = [
  ['Molecular Signatures Database (MSigDB)', 'v2026.2.Hs', 'CC BY 4.0', 'Liberzon et al., Bioinformatics 2011', '10.1093/bioinformatics/btr260'],
  ['MSigDB Hallmark gene sets', 'v2026.2.Hs', 'CC BY 4.0', 'Liberzon et al., Cell Systems 2015', '10.1016/j.cels.2015.12.004'],
  ['Reactome pathways (MSigDB C2:CP:Reactome)', 'Reactome release 97', 'CC0 1.0 (Reactome); CC BY 4.0 (MSigDB)', 'Milacic et al., Nucleic Acids Research 2024', '10.1093/nar/gkad1025'],
  ['WikiPathways (MSigDB C2:CP:WikiPathways)', 'Release 2026-10-10', 'CC0 1.0 (WikiPathways); CC BY 4.0 (MSigDB)', 'Agrawal et al., Nucleic Acids Research 2024', '10.1093/nar/gkad960'],
  ['Gene Ontology, Biological Process (MSigDB C5:GO:BP)', 'GO release 2026-07-26', 'CC BY 4.0', 'Ashburner et al., Nature Genetics 2000; The Gene Ontology Consortium, Genetics 2023. GO data archive (concept DOI; no version DOI is listed for the 2026-07-26 release):', ['10.1038/75556', '10.1093/genetics/iyad031', '10.5281/zenodo.1205166']],
  ['PROGENy pathway-responsive genes', 'model_human_full, 500 genes per pathway', 'Apache-2.0', 'Schubert et al., Nature Communications 2018', '10.1038/s41467-017-02391-6'],
];

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
  state.bulk = null; state.bulkInfo = null; state.groups = {};
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
        <label class="check full"><input type="checkbox" id="metabolic-on" checked> Model metabolism: KEGG pathway activity, maps and literature support (most of the run time)</label>
      </div></details>
    <details class="advanced" id="compare-box"><summary>Compare two groups (optional)</summary>
      <p class="note" style="margin:0 0 10px">Assign samples to a test group and a reference group (at least 2 samples each) to add differential expression, pathway enrichment and composition by group.</p>
      <div class="form-grid"><label class="field">Test group name<input class="input" id="grp-test" value="Test" maxlength="40"></label><label class="field">Reference group name<input class="input" id="grp-ref" value="Reference" maxlength="40"></label></div>
      <div id="grp-assign">${groupAssign()}</div></details>
    <p class="note"><span id="runtime-estimate">Upload a count matrix to see an estimated run time.</span> Files are sent only to the Cellaris workspace you connect.</p>`,
    `<span id="worker-note">${state.worker.ready ? 'Workspace connected' : 'Connect a Cellaris workspace to run analyses'}</span><div class="controls">${state.worker.ready ? '' : '<button class="btn btn-secondary" data-action="worker">Connect workspace</button>'}<button class="btn btn-primary" id="run-analysis">Run analysis</button></div>`);
  const zone = $('#bulk-zone');
  zone.ondragover = e => { e.preventDefault(); zone.classList.add('drag'); };
  zone.ondragleave = () => zone.classList.remove('drag');
  zone.ondrop = e => { e.preventDefault(); zone.classList.remove('drag'); handleBulk(e.dataTransfer.files[0]); };
  $('#bulk-file').onchange = e => handleBulk(e.target.files[0]);
  $('#schedule').onchange = e => { $('#schedule-note').textContent = SCHEDULES[e.target.value].note; updateEstimate(); };
  $('#max-cells').addEventListener('input', updateEstimate);
  $('#metabolic-on').addEventListener('change', updateEstimate);
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
  let ensembl = 0;
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
    if (row.length !== header.length) throw new Error(`Row ${i + 1} has ${row.length} columns; the header has ${header.length}.`);
    if (ENSEMBL_ID.test(row[0])) { ensembl++; continue; }  /* the workspace ignores Ensembl-identified rows */
    if (!row[0] || genes.has(row[0])) throw new Error(`Missing or duplicate gene symbol at row ${i + 1}.`);
    genes.add(row[0]);
    for (let j = 1; j < row.length; j++) {
      const n = Number(row[j]);
      if (row[j] === '' || !Number.isFinite(n) || n < 0 || Math.abs(n - Math.round(n)) > 1e-6) throw new Error(`Row ${i + 1}: values must be raw non-negative integer counts (TPM, CPM or log values are not accepted).`);
      sums[j - 1] += n;
    }
  }
  if (!genes.size && ensembl) throw new Error('Convert Ensembl IDs to HGNC gene symbols before upload.');
  if (genes.size < 200) throw new Error(`The matrix needs at least 200 genes with HGNC symbols (found ${genes.size}).`);
  if (sums.some(v => v === 0)) throw new Error('Every sample must contain counts.');
  const markers = ['INS', 'GCG', 'SST', 'PPY', 'PRSS1', 'KRT19', 'PECAM1', 'COL1A1'].filter(g => genes.has(g));
  return { genes: genes.size, ensembl, samples: header.slice(1), markers, medianDepth: sums.slice().sort((a, b) => a - b)[sums.length >> 1] };
}
async function handleBulk(file) {
  if (!file) return;
  const err = $('#analysis-error'), ok = $('#bulk-summary'); err.classList.add('hidden'); ok.classList.add('hidden');
  try {
    state.bulkInfo = await validateBulk(file); state.bulk = file; state.groups = {};
    const z = $('#bulk-zone'); z.classList.add('loaded'); $('b', z).textContent = file.name;
    $('small', z).textContent = `${num(state.bulkInfo.genes)} genes · ${state.bulkInfo.samples.length} samples · median library ${num(state.bulkInfo.medianDepth)} counts`;
    ok.textContent = `Format check passed. Pancreatic markers found: ${state.bulkInfo.markers.join(', ') || 'none of INS, GCG, SST, PPY, PRSS1, KRT19 (check gene symbols)'}.${state.bulkInfo.ensembl ? ` ${num(state.bulkInfo.ensembl)} rows with Ensembl gene IDs will be ignored; only rows with HGNC gene symbols are analyzed.` : ''}`;
    ok.classList.toggle('warn', state.bulkInfo.ensembl > 0); ok.classList.remove('hidden'); renderGroupAssign(); updateEstimate();
  } catch (e) {
    state.bulk = null; state.bulkInfo = null; state.groups = {}; $('#bulk-zone').classList.remove('loaded'); renderGroupAssign(); updateEstimate();
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
    cfg.metabolic_model = $('#metabolic-on') ? $('#metabolic-on').checked : true;
    const assigned = Object.entries(state.groups);
    if (assigned.length) {
      const test = $('#grp-test').value.trim(), reference = $('#grp-ref').value.trim();
      if (!test || !reference || test.toLowerCase() === reference.toLowerCase()) throw new Error('Enter two different group names for the comparison.');
      const nT = assigned.filter(([, v]) => v === 't').length, nR = assigned.length - nT;
      if (nT < 2 || nR < 2) throw new Error(`Each comparison group needs at least 2 samples (${test}: ${nT}, ${reference}: ${nR}).`);
      cfg.comparison = { groups: Object.fromEntries(assigned.map(([sm, v]) => [sm, v === 't' ? test : reference])), test, reference };
      if (Math.min(nT, nR) < 3) toast('Fewer than 3 samples in a group: the comparison has low statistical power.');
    }
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
  return { queued: 'Queued', starting: 'Starting', validating: 'Checking input', reconstruction: 'Estimating composition and profiles', pathway_activity: 'Scoring signaling and functional pathways', comparison: 'Comparing the groups', metabolic_model: 'Modeling metabolism', packaging: 'Packaging results', completed: 'Complete', failed: 'Failed' }[s] || s;
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
      <button class="btn btn-secondary" data-action="exportliterature" ${state.data.metabolic ? '' : 'disabled'}>${icon('download')} Literature support per reaction (CSV)</button>
      <button class="btn btn-secondary" data-action="exportgenesets" ${state.data.genesets || state.data.genesetsUrl ? '' : 'disabled'}>${icon('download')} Signaling and functional pathway activity (CSV)</button>
      <button class="btn btn-secondary" data-action="exportde" ${state.data.comparison ? '' : 'disabled'}>${icon('download')} Comparison: differential expression (CSV)</button>
      <button class="btn btn-secondary" data-action="exportenrich" ${state.data.comparison ? '' : 'disabled'}>${icon('download')} Comparison: pathway enrichment (CSV)</button>
      ${state.data.origin === 'demo' ? `<a class="btn btn-secondary" href="${publicFile(state.data.download || 'downloads/cellaris-demo-results.zip')}" download>${icon('download')} Demo results (ZIP)</a>` : ''}
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
const ENSEMBL_ID = /^ENS[A-Z]*G\d+/;
function groupAssign() {
  const info = state.bulkInfo;
  if (!info) return '<p class="note">Upload a count matrix to assign its samples to the two groups.</p>';
  const g = state.groups, nT = Object.values(g).filter(v => v === 't').length, nR = Object.values(g).filter(v => v === 'r').length;
  return `<div class="controls" style="margin:6px 0 8px"><button class="btn btn-secondary" id="grp-load" type="button">Load assignments (CSV)</button><input type="file" id="grp-file" accept=".csv,.tsv,.txt" hidden><button class="btn btn-ghost" id="grp-clear" type="button">Clear</button><span class="note" id="grp-count">Test group: ${nT} · reference group: ${nR}</span></div>
    <div class="table-wrap" style="max-height:230px"><table class="table"><thead><tr><th>Sample</th><th>Group</th></tr></thead><tbody>${info.samples.map((sm, i) => `<tr><td>${esc(sm)}</td><td><select class="select" data-grp="${i}" aria-label="Group of sample ${esc(sm)}"><option value="">Not compared</option><option value="t" ${g[sm] === 't' ? 'selected' : ''}>Test group</option><option value="r" ${g[sm] === 'r' ? 'selected' : ''}>Reference group</option></select></td></tr>`).join('')}</tbody></table></div>
    <small class="note">Assignment file: two columns, sample and group, with group values equal to the two group names (or test and reference).</small>`;
}
function renderGroupAssign() {
  const box = $('#grp-assign'); if (!box) return;
  box.innerHTML = groupAssign();
  $('#grp-load')?.addEventListener('click', () => $('#grp-file').click());
  $('#grp-clear')?.addEventListener('click', () => { state.groups = {}; renderGroupAssign(); updateEstimate(); });
  $('#grp-file')?.addEventListener('change', async e => { const f = e.target.files[0]; if (f) applyGroupFile(await f.text()); renderGroupAssign(); updateEstimate(); });
}
function applyGroupFile(text) {
  const names = { t: $('#grp-test').value.trim().toLowerCase(), r: $('#grp-ref').value.trim().toLowerCase() };
  const known = new Set(state.bulkInfo.samples); let matched = 0, unknown = 0, other = 0;
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [sm, grp] = line.split(line.includes('\t') ? '\t' : ',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (sm.toLowerCase() === 'sample') continue;
    if (!known.has(sm)) { unknown++; continue; }
    const v = (grp || '').toLowerCase(), k = v === names.t || v === 'test' ? 't' : v === names.r || v === 'reference' ? 'r' : null;
    if (!k) { other++; continue; }
    state.groups[sm] = k; matched++;
  }
  toast(`Assignments loaded for ${matched} samples${unknown ? `; ${unknown} sample names are not in the matrix` : ''}${other ? `; ${other} rows name another group` : ''}.`);
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
  const el = e.target.closest('[data-view],[data-action],[data-pathway],[data-litsort],[data-type],[data-color],[data-gene],[data-figure],[data-src],[data-gscol],[data-gs],[data-cmpcol],[data-demo],.modal-close,.menu-btn,.overlay');
  if (!el) return;
  if (el.classList.contains('overlay')) { if (e.target === el) closeModal(); return; }
  if (el.classList.contains('modal-close')) { closeModal(); return; }
  if (el.classList.contains('menu-btn')) { $('#sidebar').classList.toggle('open'); return; }
  if (el.dataset.view) { $('#modal-root').innerHTML = ''; setView(el.dataset.view); return; }
  if (el.dataset.pathway) { state.pathway = el.dataset.pathway; setView('pathways'); return; }
  if (el.dataset.demo) { $('#modal-root').innerHTML = ''; openDemo(el.dataset.demo); return; }
  if (el.dataset.gscol) { const k = el.dataset.gscol; if (state.gs.on.has(k)) { if (state.gs.on.size > 1) state.gs.on.delete(k); } else state.gs.on.add(k); state.gs.limit = 40; render(); return; }
  if (el.dataset.gs) { const wrap = $('.gs-table')?.closest('.table-wrap'), top = wrap?.scrollTop || 0; state.gs.set = el.dataset.gs; render(); const w2 = $('.gs-table')?.closest('.table-wrap'); if (w2) w2.scrollTop = top; return; }
  if (el.dataset.cmpcol) { state.cmp.collection = el.dataset.cmpcol; state.cmp.setLimit = 30; render(); return; }
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
    case 'demo': openDemo('islets'); break;
    case 'exportjson': exportWorkspace(); break;
    case 'gsmore': state.gs.limit += 40; render(); break;
    case 'exportgenesets': exportGenesets(); break;
    case 'exportgssamples': exportGenesetSamples(); break;
    case 'exportde': exportDE(); break;
    case 'exportenrich': exportEnrichment(); break;
    case 'cmpsetmore': state.cmp.setLimit += 30; render(); break;
    case 'cmpgenemore': state.cmp.geneLimit += 50; render(); break;
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
  if (e.target.id === 'gs-sort') { state.gs.sort = e.target.value; render(); }
  if (e.target.id === 'demo-select' && e.target.value) openDemo(e.target.value);
  if (e.target.dataset?.grp !== undefined && state.bulkInfo) {
    const sm = state.bulkInfo.samples[Number(e.target.dataset.grp)];
    if (e.target.value) state.groups[sm] = e.target.value; else delete state.groups[sm];
    const g = Object.values(state.groups), c = $('#grp-count'); if (c) c.textContent = `Test group: ${g.filter(v => v === 't').length} · reference group: ${g.filter(v => v === 'r').length}`;
    updateEstimate();
  }
});
document.addEventListener('input', e => {
  const live = { 'pathway-search': v => { state.search = v; }, 'gs-search': v => { state.gs.search = v; state.gs.limit = 40; }, 'cmp-set-search': v => { state.cmp.setSearch = v; }, 'cmp-gene-search': v => { state.cmp.geneSearch = v; } }[e.target.id];
  if (live) {
    const id = e.target.id, pos = e.target.selectionStart; live(e.target.value.toLowerCase()); render();
    const input = $(`#${id}`); if (input) { input.focus(); input.setSelectionRange(pos, pos); }
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('.overlay')) closeModal();
  if (e.key === 'Enter' && e.target.dataset?.pathway) { state.pathway = e.target.dataset.pathway; setView('pathways'); }
  if (e.key === 'Enter' && e.target.dataset?.gs) { state.gs.set = e.target.dataset.gs; render(); }
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
  state.gs.set = null; state.gs.limit = 40; state.gs.search = ''; state.cmp.setSearch = ''; state.cmp.geneSearch = ''; state.cmp.geneLimit = 50; state.cmp.setLimit = 30;
}
async function openDemo(key = 'islets', view = null) {
  try {
    if (!DEMOS[key]) key = 'islets';
    let raw = window.CELLARIS_DEMO;
    if (key !== 'islets') { const r = await fetch(DEMOS[key].url); if (!r.ok) throw new Error(`HTTP ${r.status}`); raw = await r.json(); }
    state.demoRaw = raw; state.demoKey = key; state.job = state.polling ? state.job : null; loadDemo();
    history.replaceState(null, '', `${key === 'islets' ? location.pathname : `?demo=${key}`}${location.hash}`);
    setView(view || (DEMOS[key].comparison ? 'compare' : 'overview'));
  } catch (e) { toast(`The demo could not be loaded (${e.message}).`); render(); }
}
function exportWorkspace() {
  const d = state.data;
  download('cellaris-workspace.json', JSON.stringify({ title: d.title, description: d.description, samples: d.samples, result: { cellTypes: d.cellTypes, pathways: d.pathways, cells: d.cells, geneExpression: d.geneExpression, counts: d.counts, metadata: { ...d.metadata, metabolicModel: d.metabolic }, warnings: d.warnings, genesets: d.genesets || undefined, comparison: d.comparison || undefined } }), 'application/json');
}
function init() {
  $$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  try { state.demoRaw = window.CELLARIS_DEMO; loadDemo(); } catch (e) { $('#view').innerHTML = `<div class="card"><div class="empty">The demo data could not be loaded: ${esc(e.message)}</div></div>`; return; }
  const hash = location.hash.slice(1), demo = new URLSearchParams(location.search).get('demo');
  if (demo && demo !== 'islets' && DEMOS[demo]) { openDemo(demo, VIEWS[hash] ? hash : null); return; }
  setView(VIEWS[hash] ? hash : 'overview');
}
init();
