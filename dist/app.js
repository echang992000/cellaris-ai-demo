'use strict';
/* Cellaris AI Demo: cell-type, metabolic and signaling insight from bulk RNA-seq of pancreatic ductal adenocarcinoma (PDAC). */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d = 0) => (v !== null && v !== '' && Number.isFinite(Number(v))) ? Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const sig = v => !Number.isFinite(v) ? '—' : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
const pct = (v, d = 1) => Number.isFinite(v) ? `${(v * 100).toFixed(d)}%` : '—';
const plural = (n, one, many = `${one}s`) => `${num(n)} ${Number(n) === 1 ? one : many}`;

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
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

const TYPE_STYLE = {
  beta: ['Beta', '#0072b2'], alpha: ['Alpha', '#e69f00'], delta: ['Delta', '#009e73'], gamma: ['PP (gamma)', '#cc79a7'],
  acinar: ['Acinar', '#ddcc77'], ductal: ['Ductal', '#56b4e9'], endothelial: ['Endothelial', '#d55e00'],
  stellate: ['Stellate', '#5f6b76'], immune: ['Immune', '#882255'], epsilon: ['Epsilon', '#9c755f'], schwann: ['Schwann', '#4477aa'],
};
const FALLBACK = ['#4e79a7', '#f28e2b', '#59a14f', '#b07aa1', '#76b7b2', '#edc948', '#ff9da7', '#9c755f', '#bab0ac', '#e15759'];
const typeLabel = n => TYPE_STYLE[n]?.[0] || String(n).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const typeColor = (n, i = 0) => TYPE_STYLE[n]?.[1] || FALLBACK[i % FALLBACK.length];
const typeNoun = n => { const l = typeLabel(n); return /^[A-Z]{2}/.test(l) ? l : l.charAt(0).toLowerCase() + l.slice(1); };
const VIEWS = { overview: 'Overview', samples: 'Samples', genes: 'Gene expression', compare: 'Bulk signaling', signaling: 'Cell-type signaling', pathways: 'Metabolic pathways', figures: 'Figures', about: 'About' };
const SCHEDULES = {
  quick: { label: 'Quick', note: 'Fastest; suited to a first look', t1: 300, t2: 100 },
  standard: { label: 'Standard', note: 'Recommended for final results', t1: 1000, t2: 1000 },
  extended: { label: 'Extended', note: 'Longest training', t1: 3500, t2: 1500 },
};
const FIXED = { replicates: 5 };
const GROUP_COLOR = ['#b42318', '#175cd3'];
/* Run-time estimate of the hosted workspace (4 CPUs); mirrors the estimate the workspace itself uses. */
function runtimeEstimate() {
  const samples = state.bulkInfo?.samples.length;
  if (!samples) return 'Upload a count matrix to see an estimated run time.';
  const sch = SCHEDULES[$('#schedule')?.value] || SCHEDULES.quick, per = Number($('#max-cells')?.value) || 0, profiles = samples * per;
  const metabolic = $('#metabolic-on') ? $('#metabolic-on').checked : true, compare = Object.keys(state.groups).length > 0;
  const seconds = 500 + 0.013 * profiles + (metabolic ? FIXED.replicates * sch.t2 * profiles * 6.5e-4 : 0) + (compare ? 90 : 0), minutes = seconds / 60;
  const text = minutes < 90 ? `${Math.max(5, Math.round(minutes / 5) * 5)} min` : `${(minutes / 60).toFixed(1)} h`;
  return `Estimated run time for ${plural(samples, 'sample')} × ${num(per)} estimated profiles per sample${metabolic ? '' : ' without the metabolic model'}: up to about ${text}. Analyses estimated to exceed the workspace limit run at Quick depth.`;
}
function updateEstimate() { const el = $('#runtime-estimate'); if (el) el.textContent = runtimeEstimate(); }

const state = {
  data: null, view: 'overview', colorBy: 'type', mapSpace: 'expression', sample: 'all', group: 'all', hidden: new Set(), pathway: null, heatType: null,
  search: '', category: 'all', gene: null, selSample: null, heatAll: false, heatScale: 'z',
  gs: { on: new Set(['H', 'PROGENY']), search: '', set: null, limit: 60, type: null },
  lit: { type: null },
  cmp: { collection: 'H', setSearch: '', setLimit: 40, geneSearch: '', geneLimit: 60, gene: null, set: null, comp: null },
  lit: { conn: null, filter: 'genes' },
  sort: {}, groups: {}, demoRaw: null,
  compView: 'samples', healthyView: 'markers', lookup: { q: '', gene: null, all: false }, spatial: { section: null, regions: false },
  worker: { url: localStorage.getItem('cellaris-worker-url') || '', token: '', ready: false, info: null },
  job: null, polling: false, bulk: null, bulkInfo: null,
};
const DEMO = () => state.demoRaw || window.CELLARIS_DEMO || {};
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
const spreadOf = v => { const x = v.filter(Number.isFinite); const m = x.reduce((a, b) => a + b, 0) / (x.length || 1); return m > 0 ? (Math.max(...x) - Math.min(...x)) / m : 0; };
const zscores = v => { const x = v.filter(Number.isFinite), m = x.reduce((a, b) => a + b, 0) / (x.length || 1); const sd = Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, x.length - 1)); return v.map(y => Number.isFinite(y) && sd > 0 ? (y - m) / sd : null); };

function toast(message) {
  const t = $('#toast'); t.textContent = message; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 4200);
}

/* ---------- Sortable tables (click a column header; first click ascending, again descending; blanks last) ---------- */
const blank = v => v === null || v === undefined || v === '' || (typeof v === 'number' && !Number.isFinite(v));
function sortState(id, defKey, defDir = 1) { return state.sort[id] || { key: defKey, dir: defDir }; }
function sortRows(id, rows, cols, defKey, defDir = 1) {
  const s = sortState(id, defKey, defDir), col = cols[s.key];
  if (!col) return rows.slice();
  const get = col.v || (r => r[s.key]);
  const keyed = rows.map((r, i) => ({ r, i, v: get(r) }));
  const full = keyed.filter(x => !blank(x.v)), empty = keyed.filter(x => blank(x.v));
  const isNum = full.every(x => typeof x.v === 'number');
  full.sort((a, b) => (isNum ? a.v - b.v : String(a.v).localeCompare(String(b.v), 'en', { numeric: true, sensitivity: 'base' })) * s.dir || a.i - b.i);
  return [...full, ...empty].map(x => x.r);
}
function sortTh(id, key, label, { num: isNum = false, title = '', defKey, defDir = 1, cls = '', style = '' } = {}) {
  const s = sortState(id, defKey, defDir), on = s.key === key;
  const aria = on ? (s.dir > 0 ? 'ascending' : 'descending') : 'none';
  const tip = `${title ? `${title}. ` : ''}Select to sort${on ? (s.dir > 0 ? ' (now ascending)' : ' (now descending)') : ''}`;
  return `<th class="sortable${isNum ? ' num' : ''}${cls ? ` ${cls}` : ''}${on ? (s.dir > 0 ? ' asc' : ' desc') : ''}" aria-sort="${aria}" scope="col"${style ? ` style="${style}"` : ''}><button type="button" class="th-sort" data-sort-table="${esc(id)}" data-sort-key="${esc(key)}" title="${esc(tip)}">${label}<span class="sort-ind" aria-hidden="true"></span></button></th>`;
}
function toggleSort(id, key) {
  const cur = state.sort[id];
  state.sort[id] = cur && cur.key === key ? { key, dir: -cur.dir } : { key, dir: 1 };
}
/* Re-render the current view, keeping the page and table scroll positions. */
function rerender() {
  const keep = $$('[data-scroll-id]').map(el => [el.dataset.scrollId, el.scrollTop, el.scrollLeft]);
  const y = window.scrollY;
  render();
  for (const [id, t, l] of keep) { const el = $(`[data-scroll-id="${id}"]`); if (el) { el.scrollTop = t; el.scrollLeft = l; } }
  window.scrollTo(0, y);
}

/* ---------- Data ---------- */
function prepare(raw, origin) {
  const result = raw.result || raw;
  if (!result || !Array.isArray(result.cellTypes) || !Array.isArray(result.pathways) || !Array.isArray(result.cells) || !result.counts)
    throw new Error('This file is not a Cellaris result: cellTypes, pathways, cells and counts are required.');
  if (result.cells.length > 20000 || result.pathways.length > 1000 || result.cellTypes.length > 60)
    throw new Error('The result is too large to display.');
  const species = result.metadata?.species || result.provenance?.species;
  if (species && species !== 'human') throw new Error('This demo displays human analyses.');
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
  const pathways = result.pathways.filter(p => inHumanScope(p.id)).map(p => {
    const v = p.activity, best = v.reduce((b, x, i) => (Number.isFinite(x) && (b < 0 || x > v[b]) ? i : b), -1);
    return { ...p, category: pathwayGroup(p), spread: spreadOf(v), top: best >= 0 ? cellTypes[best].name : null, z: zscores(v) };
  });
  const comparison = checkComparison(result.comparison || null), genesets = checkGenesets(result.genesets || null);
  const outside = new Set(Object.values(comparison?.composition?.flaggedSamples || {}).flat());
  const fit = comparison?.composition?.fit?.samples || {};
  const samples = (raw.samples || result.samples || []).map(s => ({
    id: String(s.id), label: s.label || String(s.id), profiles: s.profiles ?? null, fractions: s.fractions || {}, profilesByType: s.profilesByType || null,
    fit: fit[String(s.id)] || null,
    meta: comparison ? { Group: comparison.samples?.[String(s.id)] ?? 'Not compared', ...(s.meta || {}), ...(comparison.composition ? { 'Healthy reference': outside.has(String(s.id)) ? 'Outside' : 'Within' } : {}) } : (s.meta || {}),
  }));
  return {
    origin, title: raw.title || 'Pancreas analysis', subtitle: raw.subtitle || '', description: raw.description || '',
    cellTypes, pathways, cells: result.cells, geneExpression: result.geneExpression || {}, markerInfo: raw.markerInfo || result.markerInfo || null,
    counts: { ...result.counts, pathways: pathways.length }, samples, metadata: result.metadata || result.provenance || {}, warnings: result.warnings || [],
    figures: raw.figures || [], maps: raw.maps || {}, literature: raw.literature || {}, literatureMeta: result.metadata?.literature || raw.literatureMeta || null,
    metabolic: result.metadata?.metabolicModel !== false, genesets, genesetsUrl: raw.genesetsUrl || null, comparison, comparisonUrl: raw.comparisonUrl || null,
    pathwayInfo: raw.pathwayInfo || {}, mapComparison: raw.mapComparison || null, glossary: raw.glossary || null,
    bulkExpression: raw.bulkExpression || result.bulkExpression || null, typeExpression: raw.typeExpression || result.typeExpression || null,
    bulkAllUrl: raw.bulkAllUrl || null, bulkAll: null, genesetGenesUrl: raw.genesetGenesUrl || null, genesetGenes: null,
    geneLitUrl: raw.geneLitUrl || null, geneLit: null, genesetLitUrl: raw.genesetLitUrl || null, genesetLit: null, celltypeLitUrl: raw.celltypeLitUrl || null, celltypeLit: null,
    geneLookupUrl: raw.geneLookupUrl || null, geneLookup: null, geneTumorUrl: raw.geneTumorUrl || null, geneTumor: null, spatialUrl: raw.spatialUrl || null, spatial: null, spatialChunks: {}, healthyUrl: raw.healthyUrl || null, healthy: null,
    download: raw.download || null, lazy: {},
  };
}
function meanComposition(d, sampleFilter = null) {
  const types = d.cellTypes.map(t => t.name);
  const withFractions = d.samples.filter(s => (!sampleFilter || sampleFilter(s)) && types.some(t => Number.isFinite(s.fractions[t])));
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
const groupNames = d => d.comparison ? [d.comparison.test, d.comparison.reference] : [];
const groupColor = (d, g) => { const i = groupNames(d).indexOf(g); return i >= 0 ? GROUP_COLOR[i] : '#667085'; };
const HEALTHY = 'Healthy reference cells';
/* Group shown in color on the map ('all', one of the two compared groups, or the healthy reference cells). Display filter only. */
const mapGroup = d => (groupNames(d).includes(state.group) || (state.group === HEALTHY && d.healthy?.referenceCells) ? state.group : 'all');
const inMapGroup = (d, sampleId) => { const g = mapGroup(d); return g === 'all' || d.comparison?.samples?.[sampleId] === g; };

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
  $('#pathway-count').textContent = d.pathways.length || '';
  $('#dataset-name').textContent = d.origin === 'demo' ? DEMO().shortTitle || d.title : d.title;
  $('#dataset-meta').textContent = `${plural(d.counts.samples, 'sample')}${d.counts.cells ? ` · ${num(d.counts.cells)} estimated profiles` : ''}`;
  const back = $('#demo-return'); if (back) back.classList.toggle('hidden', d.origin === 'demo');
  const views = { overview: viewOverview, samples: viewSamples, pathways: viewPathways, signaling: viewSignaling, compare: viewCompare, genes: viewGenes, figures: viewFigures, about: viewAbout };
  $('#view').innerHTML = views[state.view]();
  if (state.view === 'samples') { drawEmbedding(); drawEmbedding('.embedding.mini', { sampleOnly: state.selSample }); }
  if (state.view === 'pathways' && d.metabolic) { drawPathwayHeatmap(); loadPathwayMap(); loadLiterature(); }
  if (state.view === 'genes' && d.comparison) { drawVolcano(); loadBulkAll(); }
  drawSpatial();
  const bl = $('#build-label'); if (bl) bl.textContent = d.origin === 'demo' && DEMO().build?.label ? ` · ${DEMO().build.label}` : '';
}

/* ---------- Shared: key terms ---------- */
function cohortFacts(d) {
  const c = d.comparison, n = d.samples.length || d.counts.samples || 0;
  const groups = c ? groupNames(d).map(g => [g, Object.values(c.samples || {}).filter(x => x === g).length]) : [];
  const patients = new Set(d.samples.map(s => s.meta?.Patient).filter(Boolean)).size;
  const perSample = n && d.counts.cells ? Math.round(d.counts.cells / n) : null;
  return { n, groups, patients, perSample };
}
function glossary(d, { compact = false } = {}) {
  const f = cohortFacts(d);
  const grp = f.groups.length ? ` (${f.groups.map(([g, k]) => `${num(k)} ${esc(g)}`).join(', ')}${f.patients ? `, from ${plural(f.patients, 'patient')}` : ''})` : '';
  const items = [
    ['Sample', `One bulk RNA-seq library from one tissue specimen. This analysis has ${plural(f.n, 'sample')}${grp}. Composition, comparisons and per-sample values are reported per sample.`],
    ['Estimated profile', `One computationally estimated single-cell expression profile. Cellaris generates profiles from each bulk sample${f.perSample ? ` (${num(f.perSample)} per sample here, ${num(d.counts.cells)} in total)` : ''}, divided among cell types in proportion to the sample's estimated composition. Profiles are model estimates conditioned on the reference, not measured cells.`],
    ['Cell type', `One of the ${num(d.cellTypes.length)} cell types of the built-in healthy human pancreas reference. Malignant cells and cancer-associated fibroblasts have no type of their own; their expression is attributed to the most similar reference types.`],
    ...(f.patients ? [['Patient', 'The CPTAC case a sample comes from. Each patient contributed one tumor and one adjacent pancreas sample, and the comparison is adjusted for the patient.']] : []),
  ];
  return `<section class="card glossary${compact ? ' compact' : ''}"><div class="card-head"><div><div class="card-title">Key terms</div><div class="card-sub">How samples, estimated profiles and cell types relate</div></div></div>
    <div class="card-body"><dl class="terms">${items.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl></div></section>`;
}

/* ---------- Overview ---------- */
function viewOverview() {
  const d = state.data, c = d.comparison, isDemo = d.origin === 'demo', f = cohortFacts(d);
  const banner = isDemo
    ? `<div class="banner">${icon('info')}<div><b>Demo dataset.</b> ${esc(DEMO().bannerText || 'Public data analyzed with Cellaris.')}</div><div class="controls banner-actions"><button class="btn btn-primary" data-action="new">Analyze your data</button></div></div>`
    : `<div class="banner">${icon('info')}<div><b>${d.origin === 'job' ? 'Computed analysis.' : 'Imported analysis.'}</b> Results for ${esc(d.title)} from your Cellaris workspace.</div><button class="btn btn-secondary" data-action="demo">Return to the PDAC demo</button></div>`;
  const nSets = d.genesets ? Object.values(d.genesets.collections).reduce((a, k) => a + (k.shownSets || 0), 0) : (DEMO().genesetCount || null);
  const kpis = [
    ['Samples', f.n, f.groups.length ? `${f.groups.map(([g, k]) => `${num(k)} ${g}`).join(' · ')}${f.patients ? ` · ${plural(f.patients, 'patient')}` : ''}` : 'Bulk RNA-seq samples'],
    ['Estimated single-cell profiles', d.counts.cells, f.perSample ? `${num(f.perSample)} per sample, estimated from the bulk data` : 'Estimated from the bulk data'],
    ['Reference cell types', d.cellTypes.length, 'Healthy human pancreas reference'],
    d.metabolic ? ['Pathways scored', d.pathways.length, `KEGG metabolic pathways${nSets ? ` · ${num(nSets)} signaling and functional gene sets` : ''}`]
      : c ? ['Differentially expressed genes', c.de.summary?.n_sig, `${c.test} vs ${c.reference}, adjusted p < 0.05`] : ['Gene sets scored', nSets, 'Signaling and functional pathways'],
  ].map(([k, v, ft]) => `<div class="card kpi"><div class="k-label">${esc(k)}</div><div class="k-value">${num(v)}</div><div class="k-foot">${esc(ft)}</div></div>`).join('');
  const flow = d.metabolic ? ['Bulk RNA-seq samples', 'Cell-type composition', 'Estimated single-cell profiles', 'Metabolic and signaling activity', c ? 'Group comparison (bulk)' : 'Pathway insights']
    : ['Bulk RNA-seq samples', 'Cell-type composition', c ? 'Group comparison' : 'Estimated single-cell profiles', 'Pathway enrichment'];
  return `${pageHead(isDemo ? 'Demo analysis' : 'Analysis', d.title, esc(d.description || d.subtitle))}
  ${banner}${oodBanner(d)}
  <div class="flow">${flow.map(x => `<span>${x}</span>`).join('<i>→</i>')}</div>
  <div class="grid kpis">${kpis}</div>
  ${lookupCard(d)}
  ${c ? differencesSection(d, c) : ''}
  ${d.metabolic ? `<div class="section">${pathwayTable(5)}</div>` : ''}
  <div class="section">${exploreCard(d)}</div>
  <div class="section">${glossary(d)}</div>`;
}
/* Where each result lives (the map and the composition are on the Samples tab). */
function exploreCard(d) {
  const c = d.comparison, items = [
    ['samples', 'Samples', `The map of the estimated profiles, the cell-type composition of every sample${c?.composition ? ' and of each group' : ''}${d.healthyUrl || d.healthy ? ', and the comparison with healthy pancreas' : ''}.`],
    ['genes', 'Gene expression', `${c ? 'Differential expression between the groups (volcano plot and gene table) and marker' : 'Marker'} genes across cell types.`],
    ...(c ? [['compare', 'Bulk signaling', 'Pathway enrichment, signaling pathway activity and themes that agree across databases, between the groups of bulk samples.']] : []),
    ['signaling', 'Cell-type signaling', 'Activity of signaling and functional gene sets in each cell type, with their genes and literature support.'],
    ...(d.metabolic ? [['pathways', 'Metabolic pathways', 'Estimated activity of KEGG metabolic pathways in each cell type, with pathway maps and literature support.']] : []),
  ];
  return `<section class="card" id="explore"><div class="card-head"><div><div class="card-title">Where to look next</div><div class="card-sub">Each tab answers one question</div></div></div>
    <div class="card-body"><dl class="terms">${items.map(([v, k, t]) => `<div><dt><button type="button" class="link-btn" data-view="${v}">${esc(k)} →</button></dt><dd>${esc(t)}</dd></div>`).join('')}</dl></div></section>`;
}
/* Overview summary of the group comparison: the largest differences, each linking to its tab. */
function ovGenes(c, dir, n = 6) {
  return c.de.table.filter(x => x.direction === dir && Number.isFinite(x.padj)).sort((a, b) => a.padj - b.padj || Math.abs(b.log2FCShrunk) - Math.abs(a.log2FCShrunk)).slice(0, n);
}
function ovSets(c, sign, n = 5) {
  const P = c.pathways || {}, k = ['H', 'REACTOME', 'WIKIPATHWAYS', 'GOBP'].find(x => P.collections?.[x]?.sets?.length);
  if (!k) return { k: null, rows: [] };
  return { k, rows: P.collections[k].sets.filter(r => r.padj < 0.05 && Math.sign(r.nes) === sign).sort((a, b) => Math.abs(b.nes) - Math.abs(a.nes)).slice(0, n) };
}
function differencesSection(d, c) {
  const t = esc(c.test), r = esc(c.reference), s = c.de.summary || {}, up = ovGenes(c, 'up'), down = ovGenes(c, 'down'), su = ovSets(c, 1), sd = ovSets(c, -1);
  const gRow = x => `<tr class="clickable" data-ovgene="${esc(x.gene)}"><td><button type="button" class="name-link gene" data-ovgene="${esc(x.gene)}">${esc(x.gene)}</button></td><td class="num"><span class="heat" style="${diverge(x.log2FCShrunk, 4)}">${sig(x.log2FCShrunk)}</span></td><td class="num">${fmtP(x.padj)}</td></tr>`;
  const gTable = (rows, title) => `<div class="note" style="margin:10px 0 4px">${title}</div><table class="table compact"><thead><tr><th>Gene</th><th class="num" title="Shrunken log2 fold change, ${t} vs ${r}">log2 fold change</th><th class="num">Adjusted p</th></tr></thead><tbody>${rows.map(gRow).join('') || '<tr><td colspan="3" class="empty">None.</td></tr>'}</tbody></table>`;
  const sRow = k => x => `<tr class="clickable" data-ovset="${esc(x.id)}" data-ovcol="${k}"><td><button type="button" class="name-link" data-ovset="${esc(x.id)}" data-ovcol="${k}">${esc(x.label)}</button></td><td class="num"><span class="heat" style="${diverge(x.nes, 3)}">${sig(x.nes)}</span></td><td class="num">${fmtP(x.padj)}</td></tr>`;
  const sTable = (o, title) => `<div class="note" style="margin:10px 0 4px">${title}</div><table class="table compact"><thead><tr><th>Gene set</th><th class="num" title="Normalized enrichment score">Score</th><th class="num">Adjusted p</th></tr></thead><tbody>${o.rows.map(sRow(o.k)).join('') || '<tr><td colspan="3" class="empty">None.</td></tr>'}</tbody></table>`;
  const prog = (c.pathways?.progeny || []).filter(x => x.padj < 0.05).sort((a, b) => b.score - a.score);
  const progLine = prog.length ? `<p class="note" id="ov-progeny">Signaling pathways with a different activity (PROGENy, adjusted p < 0.05): ${prog.map(x => `${esc(x.label)} ${x.score > 0 ? '↑' : '↓'}`).join(', ')}.</p>` : '';
  const comp = c.composition?.table ? [...c.composition.table].sort((a, b) => a.padj - b.padj) : null, nComp = comp ? comp.filter(x => x.padj < 0.05).length : 0;
  const compCard = comp ? `<section class="card" id="ov-composition"><div class="card-head"><div><div class="card-title">Cell-type composition</div><div class="card-sub">${num(nComp)} of ${plural(comp.length, 'cell type')} differ in estimated fraction at adjusted p < 0.05</div></div></div>
    <div class="card-body"><table class="table compact"><thead><tr><th>Cell type</th><th class="num" title="Median estimated fraction, percent">${t}</th><th class="num" title="Median estimated fraction, percent">${r}</th><th class="num" title="Difference of the medians, percentage points">Difference</th><th class="num">Adjusted p</th></tr></thead><tbody>${comp.map(x => `<tr${x.padj < 0.05 ? '' : ' class="faint"'}><td><span class="swatch" style="background:${typeColor(x.cell_type)};margin-right:6px"></span>${esc(typeLabel(x.cell_type))}</td><td class="num">${sig(x.median_test_pct)}</td><td class="num">${sig(x.median_reference_pct)}</td><td class="num">${x.median_difference_pp > 0 ? '+' : ''}${sig(x.median_difference_pp)}</td><td class="num">${fmtP(x.padj)}</td></tr>`).join('')}</tbody></table>
    <p class="note">Median estimated fraction of cells (%) in each group. Tumor cells and cancer-associated fibroblasts have no reference type; their share is absorbed into the nearest types.</p></div>
    <div class="card-foot"><span></span><button class="link-btn" data-view="samples">Map, samples and composition →</button></div></section>` : '';
  return `<h2 class="section-title" id="ov-differences">Biggest differences: ${t} vs ${r}</h2>
  <p class="note" style="margin:-4px 0 12px">From the comparison of the bulk samples. Select a gene or a gene set to open it in its tab.</p>
  <div class="grid three">
    <section class="card" id="ov-genes"><div class="card-head"><div><div class="card-title">Genes</div><div class="card-sub">${num(s.n_sig)} genes differ at adjusted p < 0.05 (${num(s.n_sig_up)} higher, ${num(s.n_sig_down)} lower in ${t}); the most significant are listed</div></div></div>
      <div class="card-body">${gTable(up, `Higher in ${t}`)}${gTable(down, `Lower in ${t}`)}</div>
      <div class="card-foot"><span></span><button class="link-btn" data-view="genes">Volcano plot and all genes →</button></div></section>
    <section class="card" id="ov-pathways"><div class="card-head"><div><div class="card-title">Pathways</div><div class="card-sub">${su.k ? `${esc(GS_LABEL[su.k])} gene sets with the strongest enrichment (adjusted p < 0.05)` : 'Pathway enrichment is not available'}</div></div></div>
      <div class="card-body">${su.k ? sTable(su, `Higher in ${t}`) + sTable(sd, `Lower in ${t}`) : ''}${progLine}</div>
      <div class="card-foot"><span></span><button class="link-btn" data-view="compare">All databases and signaling activity →</button></div></section>
    ${compCard}
  </div>
  ${(c.pathways?.themes || []).length ? `<div class="section">${themesCard(c, { limit: 8 })}</div>` : ''}`;
}

/* ---------- Target lookup (Overview): one gene, everything the analysis shows for it ---------- */
function checkLookup(b) {
  if (!b || !Array.isArray(b.genes) || !b.de || !Array.isArray(b.typeExpr) || b.typeExpr.length !== b.genes.length || !b.sets || !Array.isArray(b.geneSetsDelta)) throw new Error('Invalid lookup table.');
  const key = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const index = new Map(b.genes.map((g, i) => [g, i])), lc = new Map(b.genes.map(g => [g.toLowerCase(), g])), byKey = new Map();
  for (const g of b.genes) { const k = key(g); byKey.set(k, byKey.has(k) ? null : g); }   /* null: two symbols share the key */
  return { ...b, index, lc, byKey, key, aliasKeys: Object.keys(b.aliases || {}) };
}
/* Resolve a typed name: exact symbol (any case), then the symbol's letters and digits, then a unique alias, then an ambiguous alias. */
function lookupFind(L, q) {
  const raw = String(q || '').trim(), K = L.key(raw);
  if (!K) return { exact: null, via: null, matches: [], ambiguous: null };
  const sym = L.lc.get(raw.toLowerCase()) || L.byKey.get(K) || null, a = sym ? null : L.aliases?.[K], al = a && L.index.has(a) ? a : null, matches = [];
  if (K.length >= 2) {
    for (const [k, g] of L.byKey) if (g && k.startsWith(K)) matches.push([g, null]);
    matches.sort((x, y) => x[0].length - y[0].length || x[0].localeCompare(y[0]));
    matches.length = Math.min(matches.length, 8);
    if (matches.length < 8) for (const k of L.aliasKeys) { const g = L.aliases[k]; if (k.startsWith(K) && L.index.has(g) && !matches.some(m => m[0] === g)) matches.push([g, k]); if (matches.length >= 8) break; }
  }
  return { exact: sym || al, via: al ? raw : null, matches, ambiguous: sym || al ? null : (L.ambiguousAliases?.[K] || null) };
}
function enrichmentIndex(c) {
  if (!c) return new Map();
  if (!c._enr) { c._enr = new Map(); for (const [k, col] of Object.entries(c.pathways?.collections || {})) for (const r of col.sets || []) c._enr.set(r.id, { nes: r.nes, padj: r.padj, col: k }); for (const r of c.pathways?.progeny || []) if (!c._enr.has(r.id)) c._enr.set(r.id, { nes: r.score, padj: r.padj, col: 'PROGENY', progeny: true }); }
  return c._enr;
}
function lookupCard(d) {
  if (!d.geneLookupUrl && !d.geneLookup) return '';
  const q = state.lookup.q, L = d.geneLookup, st = String(d.lazy.geneLookup || ''), active = !!(q || state.lookup.gene);
  const ex = (DEMO().lookupExamples || []).map(g => `<button data-lookup="${esc(g)}">${esc(g)}</button>`).join('');
  let body;
  if (!active) body = '<p class="note" id="lookup-hint">Type a gene symbol or a common name. The panel gathers the result of the bulk comparison, the estimated expression by cell type, the pathways that contain the gene, the cell types that express it in public single-cell tumor data, and its literature support.</p>';
  else if (!L) {
    if (!st.startsWith('error')) ensureLazy('geneLookup', checkLookup);
    body = `<p class="note">${st.startsWith('error') ? `The lookup table could not be loaded (${esc(st.replace(/^error: /, ''))}).` : 'Loading the lookup table…'}</p>`;
  } else {
    const f = lookupFind(L, q), picked = state.lookup.gene && L.index.has(state.lookup.gene) ? state.lookup.gene : null, gene = picked || f.exact;
    const via = gene && f.exact === gene ? f.via : null;
    const chips = f.matches.filter(m => m[0] !== gene).map(([g, a]) => `<button data-lookup="${esc(g)}">${esc(g)}${a ? `<small>${esc(a)}</small>` : ''}</button>`).join('');
    const amb = f.ambiguous && !picked ? `<p class="note" id="lookup-ambiguous">“${esc(q.trim())}” can mean more than one gene: ${f.ambiguous.map(g => (L.index.has(g) ? `<button type="button" class="link-btn" data-lookup="${esc(g)}">${esc(g)}</button>` : esc(g))).join(', ')}. Choose one.</p>` : '';
    body = `${chips ? `<div class="toggle-chips" id="lookup-matches" role="group" aria-label="Matching genes" style="margin-top:10px">${chips}</div>` : ''}${amb}${gene ? lookupPanel(d, L, gene, via) : (!chips && !amb ? `<p class="note" id="lookup-none">“${esc(q.trim())}” is not among the ${num(L.genes.length)} genes tested in this analysis. Either its expression was too low in these samples to be tested, or the name is not a known gene symbol or common name.</p>` : '')}`;
  }
  return `<section class="card section" id="lookup"><div class="card-head"><div><div class="card-title">Look up a gene or target</div><div class="card-sub">Everything this analysis shows for one gene, on one panel</div></div></div>
    <div class="card-body"><div class="controls"><label class="search">${icon('search')}<input class="input" id="lookup-input" type="search" placeholder="Gene symbol or common name" value="${esc(q)}" aria-label="Look up a gene or target" autocomplete="off" spellcheck="false"></label>${ex ? `<span class="note" style="margin:0">For example</span><div class="toggle-chips" id="lookup-examples">${ex}</div>` : ''}</div>${body}</div></section>`;
}
function lookupPanel(d, L, sym, via) {
  const i = L.index.get(sym), c = d.comparison, lt = L.cellTypes || d.cellTypes.map(t => t.name);
  const lfc = L.de.lfc?.[i], padj = L.de.padj?.[i], bm = L.de.baseMean?.[i], dv = L.de.dir?.[i], tested = Number.isFinite(lfc);
  const dir = dv === 1 ? 'up' : dv === -1 ? 'down' : 'ns';
  const bulk = c ? (tested
    ? `<div class="metrics small"><div class="metric"><small>Shrunken log2 fold change</small><b>${sig(lfc)}</b></div><div class="metric"><small>Adjusted p</small><b>${fmtP(padj)}</b></div><div class="metric"><small>Mean normalized count</small><b>${Number.isFinite(bm) ? num(bm, 0) : '—'}</b></div></div><p class="note" id="lookup-call"><b>${dir === 'up' ? `Higher in ${esc(c.test)}` : dir === 'down' ? `Lower in ${esc(c.test)}` : 'No clear difference'}</b> between the bulk samples (${esc(c.test)} vs ${esc(c.reference)}). Higher or lower means adjusted p below 0.05 and at least a 2-fold change. A tissue-level difference can come from a change in which cells make up the tissue, from a change within cells, or both.</p>`
    : '<p class="note">This gene was not tested in the bulk comparison.</p>') : '';
  const te = L.typeExpr[i];
  let where;
  if (Array.isArray(te)) {
    const vals = te.map((v, k) => ({ v, n: lt[k] })).filter(x => Number.isFinite(x.v)).sort((a, b) => b.v - a.v), vmax = Math.max(...vals.map(x => x.v), 1e-9);
    where = vals.map(x => `<div class="hbar"><span>${esc(typeLabel(x.n))}</span><span class="track"><i style="width:${(Math.max(0, x.v) / vmax * 100).toFixed(1)}%;background:${typeColor(x.n)}"></i></span><b>${sig(x.v)}</b></div>`).join('')
      + '<p class="note">Estimated from the bulk samples with the healthy pancreas reference. Tumor cells are not a reference cell type, so expression that comes from tumor cells is spread over the healthy types, mostly ductal.</p>';
  } else where = '<p class="note">Not available: this gene is not among the genes shared with the healthy reference.</p>';
  let acc = 0;
  const si = (L.geneSetsDelta[i] || []).map(x => (acc += x)), lead = new Set((L.leadingPos?.[i] || []).map(p => si[p])), enr = enrichmentIndex(c);
  const rows = si.map(j => { const id = L.sets.id[j], e = enr.get(id) || null, nes = L.sets.nes?.[j] ?? (e ? e.nes : null), p = L.sets.padj?.[j] ?? (e ? e.padj : null); return { id, col: L.sets.collection[j], label: L.sets.label[j], lead: lead.has(j), nes, padj: p, top: L.sets.topType?.[j] ?? null, onSite: !!e && !e.progeny }; })
    .sort((a, b) => (b.lead - a.lead) || ((b.padj !== null && b.padj < 0.05) - (a.padj !== null && a.padj < 0.05)) || (Math.abs(b.nes || 0) - Math.abs(a.nes || 0)) || GS_ORDER.indexOf(a.col) - GS_ORDER.indexOf(b.col) || a.label.localeCompare(b.label));
  const shown = state.lookup.all ? rows : rows.slice(0, 10);
  const setRows = shown.map(x => `<tr><td>${esc(x.label)}<small>${esc(x.id)}</small></td><td><span class="badge db-${String(x.col).toLowerCase()}">${esc(GS_LABEL[x.col] || x.col)}</span></td><td class="num">${Number.isFinite(x.nes) ? `<span class="heat" style="${diverge(x.nes, 3)}">${sig(x.nes)}</span>` : '—'}</td><td class="num">${Number.isFinite(x.padj) ? fmtP(x.padj) : '—'}</td><td>${x.lead ? '<span class="badge accent" title="Among the leading-edge genes: the genes that drive this set\u2019s enrichment in the bulk comparison">drives the score</span>' : ''}</td><td>${x.top !== null && lt[x.top] ? esc(typeLabel(lt[x.top])) : '—'}</td><td class="nowrap">${x.onSite ? `<button type="button" class="link-btn" data-ovset="${esc(x.id)}" data-ovcol="${esc(x.col)}">Bulk</button>` : ''}${x.top !== null ? ` <button type="button" class="link-btn" data-gsjump="${esc(x.id)}" data-gscolj="${esc(x.col)}">Cell types</button>` : ''}</td></tr>`).join('');
  const sets = si.length ? `<div class="table-wrap" style="max-height:380px" data-scroll-id="lookup-sets"><table class="table compact" id="lookup-sets"><thead><tr><th>Gene set</th><th>Database</th><th class="num" title="Enrichment score of the whole set in the bulk comparison (PROGENy: pathway activity score)">Bulk score</th><th class="num">Adjusted p</th><th></th><th title="Cell type with the highest estimated activity of the whole set, not of this gene">Highest in</th><th>Open</th></tr></thead><tbody>${setRows}</tbody></table></div>${rows.length > shown.length ? `<button class="link-btn" data-action="lookupall">Show all ${num(rows.length)} gene sets</button>` : ''}<p class="note">Membership comes from the gene-set databases, not from this data. Bulk score and highest cell type describe the whole set.</p>`
    : '<p class="note">Not a member of any gene set shown on this site.</p>';
  const kegg = (L.kegg?.[i] || []).map(id => d.pathways.find(p => p.id === id)).filter(Boolean), notScored = (L.keggNotScored || []).includes(sym);
  const keggLine = kegg.length ? `<div class="note" style="margin:14px 0 6px"><b style="color:var(--ink-2)">Metabolic pathways</b> · enzyme gene in</div><div class="chips" id="lookup-kegg">${kegg.map(p => `<button type="button" class="chip link" data-pathway="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div>${notScored ? '<p class="note">This gene was not used to estimate the activity of these pathways.</p>' : ''}` : '';
  const also = (L.symbolAlsoAlias?.[sym] || []).filter(g => L.index.has(g));
  return `<div id="lookup-panel" class="detail-sub" data-lookup-gene="${esc(sym)}"><div class="lookup-head"><div><span class="card-title"><i>${esc(sym)}</i></span>${via ? ` <span class="note" style="margin:0" id="lookup-via">“${esc(via)}” is listed as a name of ${esc(sym)}</span>` : ''}${also.length ? ` <span class="note" style="margin:0" id="lookup-also">${esc(sym)} is also used as a name for ${also.map(g => `<button type="button" class="link-btn" data-lookup="${esc(g)}">${esc(g)}</button>`).join(', ')}</span>` : ''}</div><div class="controls">${c ? `<button class="btn btn-secondary" data-ovgene="${esc(sym)}">Open in Gene expression</button>` : ''}<a class="badge" href="https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(sym)}%5Bsym%5D+AND+human%5Borgn%5D" target="_blank" rel="noopener">NCBI Gene</a></div></div>
    <div class="grid halves" style="margin-top:12px"><div>
      ${c ? `<div class="note" style="margin:0 0 6px"><b style="color:var(--ink-2)">Bulk comparison</b></div>${bulk}` : ''}
      <div class="note" style="margin:16px 0 6px"><b style="color:var(--ink-2)">Cell types</b> · estimated expression in the healthy reference cell types, log(1 + counts per 10,000)</div>${where}
      ${tumorNote(d, sym, { full: true })}</div>
    <div><div class="note" style="margin:0 0 6px"><b style="color:var(--ink-2)">Pathways</b> · member of ${plural(rows.length, 'gene set')} shown on this site${rows.some(x => x.lead) ? '; sets whose bulk enrichment it drives come first' : ''}</div>${sets}${keggLine}
      ${geneLiterature(d, sym, { compact: true, id: 'lookup-lit' })}</div></div></div>`;
}
/* Where a gene is expressed in real tumors (public single-cell data of other patients), next to the estimates on healthy cell types. */
function checkTumor(b) {
  if (!b || !Array.isArray(b.genes) || !Array.isArray(b.values) || b.values.length !== b.genes.length || !Array.isArray(b.types)) throw new Error('Invalid tumor table.');
  return { ...b, index: new Map(b.genes.map((g, i) => [g, i])) };
}
function tumorNote(d, gene, { full = false } = {}) {
  if (!d.geneTumorUrl && !d.geneTumor) return '';
  const T = d.geneTumor, st = String(d.lazy.geneTumor || '');
  if (!T) { if (!st.startsWith('error')) ensureLazy('geneTumor', checkTumor); return full ? `<p class="note">${st.startsWith('error') ? 'The single-cell tumor data could not be loaded.' : 'Loading the single-cell tumor data…'}</p>` : ''; }
  const i = T.index.get(gene);
  if (i === undefined) return full ? '<p class="note" data-tumor-note="none"><b>In tumors:</b> not measured in the public single-cell tumor data.</p>' : '';
  const top = T.top?.[i], fold = T.fold?.[i], lab = k => T.typeLabels?.[k] || T.types[k], low = s => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s), det = T.refDetected?.[i];
  const lead = top === null || top === undefined ? 'it is not detected in any cell type'
    : Number.isFinite(fold) && fold < 1.5 ? `no single cell type stands out (highest: ${esc(low(lab(top)))}, ${sig(fold)} times the next cell type)`
      : `it is highest in ${esc(low(lab(top)))}${Number.isFinite(fold) ? ` (${sig(fold)} times the next cell type)` : ''}`;
  const ref = det === 0 || det === false ? ' It is not detected in the healthy reference cell types, so the estimates on healthy cell types cannot locate it.' : '';
  let bars = '';
  if (full) {
    const vals = T.values[i].map((v, k) => ({ v, k })).filter(x => Number.isFinite(x.v)).sort((a, b) => b.v - a.v).slice(0, 5), vmax = Math.max(...vals.map(x => x.v), 1e-9);
    bars = `<div class="note" style="margin:16px 0 6px"><b style="color:var(--ink-2)">In tumors</b> · mean expression in public single-cell data from PDAC tumors of other patients, counts per 10,000 (the five highest cell types)</div><div id="lookup-tumor">${vals.map(x => `<div class="hbar"><span>${esc(lab(x.k))}</span><span class="track"><i style="width:${(x.v / vmax * 100).toFixed(1)}%;background:${T.typeGroups?.[x.k] === 'malignant' ? '#b42318' : T.typeGroups?.[x.k] === 'fibroblast' ? '#5f6b76' : '#98a2b3'}"></i></span><b>${sig(x.v)}</b></div>`).join('')}</div>`;
  }
  return `<div data-tumor-note="${top === null || top === undefined ? 'undetected' : 'ok'}">${bars}<p class="note"><b>In tumors:</b> in public single-cell data from PDAC tumors of other patients, ${lead}.${ref}${full && T.caveat ? ` ${esc(T.caveat)}` : ' These values are not from the samples of this analysis.'}</p></div>`;
}
function sampleLabel(id) {
  const s = state.data.samples.find(x => x.id === id);
  return s?.label || id;
}
function pathwayTable(limit = 8) {
  const d = state.data, [lo, hi] = activityRange(d), types = d.cellTypes, id = 'ov-pathways';
  let rows = d.pathways.filter(p => !isOverviewMap(p.id)).sort((a, b) => b.spread - a.spread).slice(0, limit);
  const cols = { name: { v: p => p.name }, category: { v: p => p.category }, top: { v: p => typeLabel(p.top || '') }, spread: { v: p => p.spread },
    ...Object.fromEntries(types.map((t, i) => [`t${i}`, { v: p => p.activity[i] }])) };
  rows = sortRows(id, rows, cols, 'spread', -1);
  const th = (k, l, o = {}) => sortTh(id, k, l, { defKey: 'spread', defDir: -1, ...o });
  return `<section class="card"><div class="card-head"><div><div class="card-title">Pathways that differ most between cell types</div><div class="card-sub">Mean estimated activity of each KEGG pathway in each cell type (relative units). The ${limit} pathways with the largest spread between cell types; overview maps excluded. Select a pathway to open it.</div></div>
    <button class="btn btn-secondary" data-view="pathways">All ${d.pathways.length} pathways</button></div>
    <div class="card-body table-wrap" data-scroll-id="${id}"><table class="table"><thead><tr>${th('name', 'Pathway')}${th('category', 'Category')}${th('top', 'Highest in')}${th('spread', 'Spread', { num: true, title: '(highest − lowest) ÷ mean across cell types' })}${types.map((t, i) => th(`t${i}`, `<span class="swatch" style="background:${t.color};margin-right:5px"></span>${esc(t.label)}`, { num: true })).join('')}</tr></thead>
    <tbody>${rows.map(p => `<tr class="clickable" data-pathway="${esc(p.id)}"><td><button type="button" class="name-link" data-pathway="${esc(p.id)}">${esc(p.name)}</button><small>${esc(p.id)} · ${plural(p.reactionCount, 'reaction')}</small></td><td><span class="badge">${esc(p.category)}</span></td><td>${esc(typeLabel(p.top || '—'))}</td><td class="num">${sig(p.spread)}</td>${types.map((t, i) => `<td class="num"><span class="heat" style="${heat(p.activity[i], lo, hi)}" title="${esc(`${p.name} in ${t.label}: ${sig(p.activity[i])} (relative units); z-score across cell types ${sig(p.z[i])}`)}">${sig(p.activity[i])}</span></td>`).join('')}</tr>`).join('') || `<tr><td colspan="${4 + types.length}" class="empty">No pathways.</td></tr>`}</tbody></table></div></section>`;
}

function mix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
}
/* Scatter of the estimated profiles on the metabolic (x, y) or expression (ex, ey) map. Profiles outside the chosen
   group or sample stay on the map in gray; healthy reference cells share the expression map. */
function drawEmbedding(sel = '.embedding.main', { sampleOnly = null } = {}) {
  const svg = $(sel); if (!svg) return;
  const d = state.data, mg = sampleOnly ? 'all' : mapGroup(d), R = !sampleOnly ? d.healthy?.referenceCells : null;
  const expr = ((svg.dataset.space || state.mapSpace) === 'expression' || mg === HEALTHY) && d.cells.some(c => Number.isFinite(c.ex));
  const gx = c => (expr ? c.ex : c.x), gy = c => (expr ? c.ey : c.y);
  const W = Number(svg.dataset.w || 640), H = Number(svg.dataset.h || 400), pad = 24;
  const base = d.cells.filter(c => Number.isFinite(gx(c)) && Number.isFinite(gy(c)));
  const ht = d.healthy?.cellTypes || [];
  /* reference cells are stored in blocks by cell type and donor; draw them in a fixed mixed order so that no type hides another */
  const ref = expr && R && mg === HEALTHY ? R.ex.map((x, i) => ({ ex: x, ey: R.ey[i], x, y: R.ey[i], type: ht[R.type[i]], donor: R.donors?.[R.donor?.[i]] ?? R.donor?.[i], ref: true })).map((p, i, a) => (a.length % 7919 ? a[(i * 7919) % a.length] : p)) : [];
  const inSel = c => inMapGroup(d, c.sample) && (state.sample === 'all' || c.sample === state.sample);
  const fg = sampleOnly ? base.filter(c => c.sample === sampleOnly) : mg === HEALTHY ? ref : base.filter(inSel);
  const bg = sampleOnly ? base.filter(c => c.sample !== sampleOnly) : mg === HEALTHY ? base : base.filter(c => !inSel(c));
  /* the frame covers the profiles and, once loaded, the healthy reference cells, so it does not move when the group changes */
  const xs = base.map(gx).concat(expr && R ? R.ex : []), ys = base.map(gy).concat(expr && R ? R.ey : []);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const X = v => pad + (v - x0) / ((x1 - x0) || 1) * (W - 2 * pad), Y = v => H - pad - (v - y0) / ((y1 - y0) || 1) * (H - 2 * pad);
  const scores = base.map(c => c.score).filter(Number.isFinite);
  const [s0, s1] = [Math.min(...scores), Math.max(...scores)];
  const color = Object.fromEntries(d.cellTypes.map(t => [t.name, t.color]));
  const viridis = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'];
  const ramp = v => { const t = Math.max(0, Math.min(.999, (v - s0) / ((s1 - s0) || 1))) * 4; const i = Math.floor(t); return mix(viridis[i], viridis[i + 1], t - i); };
  const r = base.length > 1500 ? 2.1 : 2.8, byType = state.colorBy === 'type' || sampleOnly || mg === HEALTHY;
  let html = bg.length ? `<g class="map-bg">${bg.map(c => `<circle cx="${X(gx(c)).toFixed(1)}" cy="${Y(gy(c)).toFixed(1)}" r="1.6" fill="#d0d5dd" fill-opacity=".55"/>`).join('')}</g>` : '';
  html += `<g class="map-fg">${fg.map((c, i) => `<circle cx="${X(gx(c)).toFixed(1)}" cy="${Y(gy(c)).toFixed(1)}" r="${sampleOnly ? 2.9 : r}" fill="${byType ? (color[c.type] || typeColor(c.type)) : ramp(c.score)}" fill-opacity="${!sampleOnly && state.hidden.has(c.type) ? .05 : .8}" data-i="${i}"/>`).join('')}</g>`;
  html += `<g font-size="11" fill="#667085"><path d="M${pad} ${H - 8}h28M${pad} ${H - 8}v-28" stroke="#98a2b3" stroke-width="1"/><text x="${pad + 34}" y="${H - 4}">UMAP 1</text><text x="8" y="${H - 44}" transform="rotate(-90 8 ${H - 44})">UMAP 2</text></g>`;
  if (!sampleOnly && byType) {
    /* label each cell type at its densest region; nudge or skip labels that would overlap (types that share a neighborhood) */
    const placed = [], cand = d.cellTypes.map(t => ({ t, pts: fg.filter(c => c.type === t.name) })).filter(x => x.pts.length >= 8 && !state.hidden.has(x.t.name)).sort((a, b) => b.pts.length - a.pts.length);
    const hit = (b) => placed.some(p => b.x0 < p.x1 && b.x1 > p.x0 && b.y0 < p.y1 && b.y1 > p.y0);
    for (const { t, pts } of cand) {
      const xy = pts.map(c => [X(gx(c)), Y(gy(c))]), step = Math.max(1, Math.floor(xy.length / 250));
      let best = xy[0], bestN = -1;
      for (let a = 0; a < xy.length; a += step) { let n = 0; for (const b of xy) if ((b[0] - xy[a][0]) ** 2 + (b[1] - xy[a][1]) ** 2 < 324) n++; if (n > bestN) { bestN = n; best = xy[a]; } }
      const [mx, my] = best;
      const w = t.label.length * 6.6 + 6;
      const spot = [0, -15, 15, -30, 30].map(dy => ({ x: mx, y: my - 10 + dy, x0: mx - w / 2, x1: mx + w / 2, y0: my - 10 + dy - 11, y1: my - 10 + dy + 3 })).find(b => !hit(b));
      if (!spot) continue;
      placed.push(spot);
      html += `<text x="${spot.x.toFixed(1)}" y="${spot.y.toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#0b1f33" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(t.label)}</text>`;
    }
  } else if (!sampleOnly) {
    html += `<g font-size="10.5" fill="#667085"><defs><linearGradient id="vir" x1="0" x2="1">${viridis.map((c, i) => `<stop offset="${i / 4}" stop-color="${c}"/>`).join('')}</linearGradient></defs><rect x="${W - 170}" y="10" width="140" height="8" rx="4" fill="url(#vir)"/><text x="${W - 170}" y="32">${sig(s0)}</text><text x="${W - 30}" y="32" text-anchor="end">${sig(s1)}</text><text x="${W - 100}" y="32" text-anchor="middle">mean metabolic activity (relative units)</text></g>`;
  }
  svg.innerHTML = html;
  const wrap = svg.closest('.embed-wrap'), tip = wrap?.querySelector('.tip'); if (!tip) return;
  svg.onpointermove = e => {
    const i = e.target.dataset?.i; if (i === undefined) { tip.classList.add('hidden'); return; }
    const c = fg[Number(i)], box = wrap.getBoundingClientRect();
    tip.textContent = c.ref ? `${typeLabel(c.type)} cell of the healthy reference${c.donor !== undefined && c.donor !== null ? ` · donor ${c.donor}` : ''}` : `${typeLabel(c.type)} profile · from ${sampleLabel(c.sample)} · mean metabolic activity ${sig(c.score)}`;
    tip.style.left = `${Math.max(0, Math.min(e.clientX - box.left + 12, box.width - 300))}px`; tip.style.top = `${Math.max(4, e.clientY - box.top - 34)}px`;
    tip.classList.remove('hidden');
  };
  svg.onpointerleave = () => tip.classList.add('hidden');
}

/* ---------- Samples ---------- */
const numericMeta = new Set(['Age']);
function metaValue(s, k) { const v = s.meta?.[k]; if (numericMeta.has(k) && v !== null && v !== '' && Number.isFinite(Number(v))) return Number(v); return v ?? null; }
/* Map of the estimated profiles (expression or metabolic), with the group filter and the healthy reference cells. */
function mapCard(d) {
  const samples = [...new Set(d.cells.map(x => x.sample))];
  const mapGroups = groupNames(d).filter(g => samples.some(s => d.comparison?.samples?.[s] === g)), mg = mapGroup(d);
  const hasExpr = d.cells.some(x => Number.isFinite(x.ex)), R = d.healthy?.referenceCells, canHealthy = hasExpr && !!(R || d.healthyUrl);
  const space = hasExpr && (state.mapSpace === 'expression' || mg === HEALTHY) ? 'expression' : 'metabolic';
  const shownSamples = samples.filter(s => inMapGroup(d, s)), shownCells = mg === 'all' ? d.cells.length : d.cells.filter(x => inMapGroup(d, x.sample)).length;
  if (state.sample !== 'all' && !shownSamples.includes(state.sample)) state.sample = 'all';
  const count = mg === HEALTHY
    ? `Showing in color ${num(R.ex.length)}${R.n > R.ex.length ? ` of the ${num(R.n)}` : ''} healthy reference cells${R.n > R.ex.length ? ' (a random subset)' : ''}; the ${num(d.cells.length)} displayed estimated profiles are in gray. ${esc(DEMO().healthyText?.mapNote || 'The estimated profiles are generated from these reference cells, so the two overlap by construction.')}`
    : mg === 'all' ? (d.cells.length < d.counts.cells ? `Showing ${num(d.cells.length)} of ${num(d.counts.cells)} estimated profiles (a random subset)` : `Showing all ${num(d.cells.length)} estimated profiles`)
      : `Showing in color ${num(shownCells)} of the ${num(d.cells.length)} displayed profiles: those estimated from the ${num(shownSamples.length)} ${esc(mg)} samples; the other profiles are in gray. The filter changes the map only; cell-type values on this site summarize all samples.`;
  return `<section class="card" id="map-card"><div class="card-head"><div><div class="card-title">${space === 'expression' ? 'Expression map' : 'Metabolic map'}</div><div class="card-sub">Each point is one ${mg === HEALTHY ? 'healthy reference cell (color) or estimated single-cell profile (gray)' : 'estimated single-cell profile'}, placed by ${space === 'expression' ? 'similarity of gene expression' : 'similarity of estimated metabolic activity'} (UMAP; axes have no units)</div></div>
      <div class="controls">${hasExpr ? `<div class="segmented" role="group" aria-label="Map"><button class="${space === 'expression' ? 'active' : ''}" data-space="expression">Expression</button><button class="${space === 'metabolic' ? 'active' : ''}" data-space="metabolic">Metabolic</button></div>` : ''}
      <div class="segmented" role="group" aria-label="Color"><button class="${state.colorBy === 'type' || mg === HEALTHY ? 'active' : ''}" data-color="type">Cell type</button><button class="${state.colorBy === 'score' && mg !== HEALTHY ? 'active' : ''}" data-color="score"${mg === HEALTHY ? ' disabled' : ''}>Metabolic activity</button></div>
      ${mapGroups.length || canHealthy ? `<div class="segmented" role="group" aria-label="Group shown in color on the map"><button class="${mg === 'all' ? 'active' : ''}" data-mapgroup="all">All samples</button>${mapGroups.map(g => `<button class="${mg === g ? 'active' : ''}" data-mapgroup="${esc(g)}">${esc(g)}</button>`).join('')}${canHealthy ? `<button class="${mg === HEALTHY ? 'active' : ''}" data-mapgroup="${HEALTHY}"${R ? '' : ' disabled title="Loading the healthy reference cells"'}>${HEALTHY}</button>` : ''}</div>` : ''}
      <select class="select" id="sample-select" aria-label="Show the profiles of one sample in color"${mg === HEALTHY ? ' disabled' : ''}><option value="all">${mg === 'all' || mg === HEALTHY ? 'All samples' : `All ${esc(mg)} samples`}</option>${shownSamples.map(s => `<option value="${esc(s)}" ${state.sample === s ? 'selected' : ''}>${esc(sampleLabel(s))}</option>`).join('')}</select></div></div>
      <div class="card-body"><div class="embed-wrap"><svg class="embedding main" viewBox="0 0 640 400" data-w="640" data-h="400" role="img" aria-label="Map of estimated single-cell profiles"></svg><div class="tip hidden"></div></div>
      <div class="legend">${d.cellTypes.map(t => `<button class="${state.hidden.has(t.name) ? 'off' : ''}" data-type="${esc(t.name)}"><span class="swatch" style="background:${t.color}"></span>${esc(t.label)}</button>`).join('')}</div></div>
      <div class="card-foot"><span id="map-count">${count}${hasExpr && mg === 'all' ? ' · both maps show the same profiles' : ''}</span>${d.figures.length ? '<button class="link-btn" data-view="figures">How to read this map →</button>' : '<span>Select a cell type to hide it</span>'}</div></section>`;
}
/* Mean composition of each group, with the test between the groups when a comparison exists. */
function compositionMeansCard(d) {
  const groups = groupNames(d), c = d.comparison;
  const compRows = groups.length && d.samples.some(s => s.meta?.Group)
    ? groups.map(g => ({ g, comp: meanComposition(d, s => s.meta?.Group === g), n: d.samples.filter(s => s.meta?.Group === g).length }))
    : [{ g: null, comp: meanComposition(d), n: d.samples.length }];
  const order = compRows[0].comp.map(t => t.name), test = c?.composition?.table ? new Map(c.composition.table.map(r => [r.cell_type, r])) : null;
  return `<section class="card" id="comp-means"><div class="card-head"><div><div class="card-title">Cell-type composition</div><div class="card-sub">Mean estimated fraction of cells${groups.length ? ' in each group of samples' : ` across ${plural(d.samples.length, 'sample')}`} (%)</div></div></div>
    <div class="card-body">${compRows.map(r => `<div class="comp-group">${r.g ? `<div class="comp-label"><span class="swatch" style="background:${groupColor(d, r.g)}"></span><b>${esc(r.g)}</b> <small>${plural(r.n, 'sample')}</small></div>` : ''}<div class="stack">${order.map(name => { const t = r.comp.find(x => x.name === name); return `<span style="width:${(t.share * 100).toFixed(2)}%;background:${t.color}" title="${esc(t.label)} ${pct(t.share)}"></span>`; }).join('')}</div></div>`).join('')}
    <table class="table comp-table"><thead><tr><th>Cell type</th>${compRows.map(r => `<th class="num">${esc(r.g || 'Mean')}</th>`).join('')}${test ? '<th class="num" title="Median of the test group minus median of the reference group, percentage points">Median difference</th><th class="num" title="Two-sided rank-sum test per cell type, adjusted across cell types">Adjusted p</th>' : ''}</tr></thead><tbody>${order.map(name => { const t = compRows[0].comp.find(x => x.name === name), q = test?.get(name); return `<tr><td><span class="swatch" style="background:${t.color};margin-right:6px"></span>${esc(t.label)}</td>${compRows.map(r => `<td class="num">${pct(r.comp.find(x => x.name === name).share)}</td>`).join('')}${test ? `<td class="num">${q ? `${q.median_difference_pp > 0 ? '+' : ''}${sig(q.median_difference_pp)}` : '—'}</td><td class="num">${q ? fmtP(q.padj) : '—'}</td>` : ''}</tr>`; }).join('')}</tbody></table>
    ${test ? `<p class="note">Group columns: mean fraction. Median difference: ${esc(c.test)} minus ${esc(c.reference)}, in percentage points; test: ${esc(c.composition.test || 'two-sided rank-sum test per cell type, adjusted across cell types')}.</p>` : ''}</div>
    <div class="card-foot"><span>Fractions sum to 100% in each sample</span><span></span></div></section>`;
}
function checkHealthy(b) {
  if (!b || typeof b !== 'object' || (!b.referenceCells && !b.typeSimilarity && !b.bulk)) throw new Error('Invalid healthy-group file.');
  const R = b.referenceCells;
  if (R && (!Array.isArray(R.ex) || !Array.isArray(R.ey) || R.ex.length !== R.ey.length || !Array.isArray(R.type) || R.type.length !== R.ex.length || !Array.isArray(b.cellTypes))) throw new Error('Invalid healthy reference cells.');
  return b;
}
/* Descriptive similarity of each group's estimated profiles to healthy reference cells of the same type (no test). */
function healthyTypeCard(d) {
  const Hh = d.healthy, ts = Hh?.typeSimilarity, V = ts?.values; if (!V?.meanExprCorr || !V.nnDistRatioOtherCells) return '';
  const types = Hh.cellTypes, groups = ts.groups || [], tx = DEMO().healthyText || {}, f2 = v => (Number.isFinite(v) ? v.toFixed(2) : '—');
  const def = k => (ts.metrics || []).find(m => m.key === k)?.definition || '';
  const only = d.cellTypes.filter(t => !state.hidden.has(t.name)), focus = only.length === 1 ? only[0].name : null;
  const rows = types.map((t, ti) => `<tr class="clickable${focus === t ? ' selected' : ''}" data-focustype="${esc(t)}" tabindex="0"><td><span class="swatch" style="background:${typeColor(t, ti)};margin-right:6px"></span>${esc(typeLabel(t))}</td>${groups.map((g, gi) => `<td class="num">${f2(V.meanExprCorr[gi]?.[ti])}<small>healthy cells: ${f2(V.meanExprCorrHealthy?.[gi]?.[ti])}</small></td>`).join('')}${groups.map((g, gi) => `<td class="num">${f2(V.nnDistRatioOtherCells[gi]?.[ti])}</td>`).join('')}${V.nearestIsSource ? groups.map((g, gi) => `<td class="num">${pct(V.nearestIsSource[gi]?.[ti], 0)}</td>`).join('') : ''}${groups.map((g, gi) => `<td class="num">${num(ts.nProfiles?.[gi]?.[ti])}</td>`).join('')}</tr>`).join('');
  const gh = () => groups.map(g => `<th class="num">${esc(g)}</th>`).join('');
  return `<section class="card section" id="healthy-types"><div class="card-head"><div><div class="card-title">Cell types next to the healthy reference cells</div><div class="card-sub">How close the estimated profiles of each group are to healthy reference cells of the same type. Descriptions, not tests. Select a row to show only that cell type on the map.</div></div><span class="badge">Descriptive</span></div>
    <div class="card-body"><div class="table-wrap"><table class="table compact" id="healthy-type-table"><thead><tr><th rowspan="2">Cell type</th><th class="num" colspan="${groups.length}" title="${esc(def('meanExprCorr'))}">Correlation with healthy cells</th><th class="num" colspan="${groups.length}" title="${esc(def('nnDistRatioOtherCells'))}">Distance to the nearest healthy cell (× healthy spacing)</th>${V.nearestIsSource ? `<th class="num" colspan="${groups.length}" title="${esc(def('nearestIsSource'))}">Nearest healthy cell is the profile's own source</th>` : ''}<th class="num" colspan="${groups.length}">Estimated profiles</th></tr><tr>${gh()}${gh()}${V.nearestIsSource ? gh() : ''}${gh()}</tr></thead><tbody>${rows}</tbody></table></div>
    ${tx.tableCaption ? `<p class="note">${esc(tx.tableCaption)}</p>` : ''}${tx.tableReading ? `<p class="note"><b>Reading.</b> ${esc(tx.tableReading)}</p>` : ''}
    <p class="note" id="healthy-caveat"><b>Read with care.</b> ${esc(tx.tableCaveat || ts.note || 'Descriptive values only; no test was run.')}</p></div></section>`;
}
const HEALTHY_COLOR = '#12805c';
function healthyGroupColor(d, g) { const i = groupNames(d).indexOf(g); return i >= 0 ? GROUP_COLOR[i] : HEALTHY_COLOR; }
/* Bulk samples next to healthy pancreas samples of another project: on marker genes (default) or on all shared genes. */
function healthyBulkCard(d) {
  const b = d.healthy?.bulk; if (!b || !Array.isArray(b.samples) || !Array.isArray(b.x) || !Array.isArray(b.y)) return '';
  const tx = DEMO().healthyText || {}, mk = b.markerOnly && state.healthyView !== 'all' ? b.markerOnly : null;
  const xs = mk ? mk.x : b.x, ys = mk ? mk.y : b.y, axes = mk ? mk.axes : b.axes, usePos = !!(mk && Array.isArray(mk.position));
  const val = usePos ? mk.position : mk ? mk.corrHealthy : b.corrHealthy, valLabel = usePos ? 'Position on marker genes (0 = healthy average, 1 = tumor average)' : 'Correlation with the healthy pancreas average';
  const cmp = groupNames(d), groups = [...new Set(b.samples.map(s => s.group))].sort((p, q) => (cmp.includes(p) ? 2 - cmp.indexOf(p) : 0) - (cmp.includes(q) ? 2 - cmp.indexOf(q) : 0));
  const note = i => b.sampleNote?.[i] || null, title = (i, extra = '') => `${esc(b.samples[i].label || b.samples[i].id)} · ${esc(b.samples[i].group)}${extra}${note(i) ? ` · ${esc(note(i))}` : ''}`;
  const dot = (i, cx, cy, r) => { const k = healthyGroupColor(d, b.samples[i].group), m = !!note(i); return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${m ? '#fff' : k}" fill-opacity="${m ? 1 : .8}" stroke="${m ? k : '#fff'}" stroke-width="${m ? 1.6 : .8}"${m ? ' data-marked="1"' : ''}><title>${title(i, Number.isFinite(val?.[i]) ? `: ${val[i].toFixed(2)}` : '')}</title></circle>`; };
  const L = 52, W = 430, T = 12, H = 300, x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), px = (x1 - x0) * .05 || 1, py = (y1 - y0) * .05 || 1;
  const X = v => L + (v - x0 + px) / (x1 - x0 + 2 * px) * W, Y = v => T + H - (v - y0 + py) / (y1 - y0 + 2 * py) * H;
  const idx = b.samples.map((s, i) => i).sort((p, q) => (cmp.includes(b.samples[p].group) ? 1 : 0) - (cmp.includes(b.samples[q].group) ? 1 : 0));
  const tk = (a, z, f) => ticksFor(a, z, 5).map(f).join('');
  const scatter = `<svg class="svgplot" id="healthy-scatter" viewBox="0 0 ${L + W + 10} ${T + H + 44}" role="img" aria-label="Healthy, adjacent and tumor samples by expression similarity"><g font-size="11.5" fill="#667085">${tk(x0, x1, v => `<line x1="${X(v).toFixed(1)}" x2="${X(v).toFixed(1)}" y1="${T + H}" y2="${T + H + 5}" stroke="#98a2b3"/><text x="${X(v).toFixed(1)}" y="${T + H + 18}" text-anchor="middle">${sig(v)}</text>`)}${tk(y0, y1, v => `<line x1="${L - 5}" x2="${L}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#98a2b3"/><text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${sig(v)}</text>`)}<line x1="${L}" x2="${L}" y1="${T}" y2="${T + H}" stroke="#98a2b3"/><line x1="${L}" x2="${L + W}" y1="${T + H}" y2="${T + H}" stroke="#98a2b3"/>
    <text class="axis-title" x="${L + W / 2}" y="${T + H + 38}" text-anchor="middle" fill="#344054">${esc(axes?.[0] || 'Component 1')}</text><text class="axis-title" transform="translate(13 ${T + H / 2}) rotate(-90)" text-anchor="middle" fill="#344054">${esc(axes?.[1] || 'Component 2')}</text></g>${idx.map(i => dot(i, X(xs[i]), Y(ys[i]), 4)).join('')}</svg>`;
  let strip = '';
  if (Array.isArray(val)) {
    const pts = b.samples.map((s, i) => i).filter(i => Number.isFinite(val[i]));
    const lo = Math.min(...pts.map(i => val[i]), usePos ? 0 : Infinity), hi = Math.max(...pts.map(i => val[i]), usePos ? 1 : -Infinity), pad = (hi - lo) * .08 || .01, a = lo - pad, z = hi + pad, L2 = 56, W2 = 300, cw = W2 / groups.length, Y2 = v => T + H - (v - a) / (z - a) * H;
    const sd = pts.map((i, n) => { const k = groups.indexOf(b.samples[i].group), x = L2 + cw * (k + .5) + ((((n + 1) * 7919) % 97) / 97 - .5) * cw * .5; return dot(i, x, Y2(val[i]), 3.6); }).join('');
    const med = groups.map((g, k) => { const v = pts.filter(i => b.samples[i].group === g).map(i => val[i]).sort((p, q) => p - q); if (!v.length) return ''; const m = v.length % 2 ? v[v.length >> 1] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2, x = L2 + cw * (k + .5); return `<line x1="${(x - cw * .3).toFixed(1)}" x2="${(x + cw * .3).toFixed(1)}" y1="${Y2(m).toFixed(1)}" y2="${Y2(m).toFixed(1)}" stroke="#0b1f33" stroke-width="2"><title>Median of the samples shown, ${esc(g)}: ${m.toFixed(2)}</title></line>`; }).join('');
    const refs = usePos ? [0, 1].map(v => `<line x1="${L2}" x2="${L2 + W2}" y1="${Y2(v).toFixed(1)}" y2="${Y2(v).toFixed(1)}" stroke="#d0d5dd" stroke-dasharray="3 3"/>`).join('') : '';
    const xl = groups.map((g, k) => `<text x="${(L2 + cw * (k + .5)).toFixed(1)}" y="${T + H + 17}" text-anchor="middle" fill="#344054">${esc(g.replace(/ \(GTEx\)$/, ''))}</text><text x="${(L2 + cw * (k + .5)).toFixed(1)}" y="${T + H + 31}" text-anchor="middle">n = ${pts.filter(i => b.samples[i].group === g).length}</text>`).join('');
    strip = `<svg class="svgplot" id="healthy-strip" viewBox="0 0 ${L2 + W2 + 8} ${T + H + 44}" role="img" aria-label="${esc(valLabel)} by group"><g font-size="11.5" fill="#667085">${tk(a, z, v => `<line x1="${L2 - 5}" x2="${L2}" y1="${Y2(v).toFixed(1)}" y2="${Y2(v).toFixed(1)}" stroke="#98a2b3"/><text x="${L2 - 8}" y="${(Y2(v) + 4).toFixed(1)}" text-anchor="end">${v.toFixed(2)}</text>`)}${refs}<line x1="${L2}" x2="${L2}" y1="${T}" y2="${T + H}" stroke="#98a2b3"/><line x1="${L2}" x2="${L2 + W2}" y1="${T + H}" y2="${T + H}" stroke="#98a2b3"/>${xl}<text class="axis-title" transform="translate(13 ${T + H / 2}) rotate(-90)" text-anchor="middle" fill="#344054">${esc(valLabel)}</text></g>${sd}${med}</svg>`;
  }
  const g = b.gtex || {}, nMarked = (b.sampleNote || []).filter(Boolean).length;
  const toggle = b.markerOnly ? `<div class="segmented" role="group" aria-label="Genes used"><button class="${mk ? 'active' : ''}" data-healthyview="markers">Marker genes</button><button class="${mk ? '' : 'active'}" data-healthyview="all">All genes</button></div>` : '';
  return `<section class="card section" id="healthy-bulk"><div class="card-head"><div><div class="card-title">Bulk samples next to healthy pancreas</div><div class="card-sub">${mk ? `Healthy pancreas samples of another project (GTEx), adjacent pancreas and PDAC on ${num(mk.nGenes)} marker genes of acinar, ductal, islet and stromal cells` : `Healthy pancreas samples of another project (GTEx), adjacent pancreas and PDAC on all ${num(b.nGenes)} shared genes; the main axis separates the two data sources`}</div></div><div class="controls">${toggle}<span class="badge">Descriptive</span></div></div>
    <div class="card-body">${mk ? '' : `<div class="alert warn" id="healthy-source-warning">${esc(tx.bulkCaveat || 'The horizontal axis mainly separates the two data sources, not healthy from diseased tissue.')}</div>`}
    <div class="grid halves"><div>${scatter}</div><div>${strip}</div></div>
    <div class="legend static">${groups.map(x => `<span><span class="swatch" style="background:${healthyGroupColor(d, x)}"></span>${esc(x)} (${num(b.samples.filter(s => s.group === x).length)}${x.includes('GTEx') && g.n ? ` of ${num(g.n)} shown` : ''})</span>`).join('')}${nMarked ? `<span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#fff" stroke="#667085" stroke-width="1.6"/></svg>Sample with a known issue (${num(nMarked)})</span>` : ''}</div>
    <p class="note">${esc(mk ? (tx.markerCaption || '') : (tx.bulkCaption || ''))}${usePos && mk.positionDefinition ? ` ${esc(mk.positionDefinition)}` : ''}</p>
    ${mk && tx.markerReading ? `<p class="note" id="healthy-reading"><b>Reading.</b> ${esc(tx.markerReading)}</p>` : ''}${!mk && tx.corrNote ? `<p class="note">${esc(tx.corrNote)}</p>` : ''}
    ${tx.markedNote ? `<p class="note">Marked samples: ${esc(tx.markedNote)}</p>` : ''}
    ${b.batchNote ? `<details class="advanced" id="healthy-batch"><summary>How much of the difference between the two data sources is technical</summary><p class="note">${esc(b.batchNote)}</p></details>` : ''}
    ${g.release ? `<p class="note">Healthy pancreas: ${esc(g.release)}, pancreas, ${num(g.n)} samples${g.nShown && g.nShown < g.n ? ` (${num(g.nShown)} shown, chosen at random; averages and components use all)` : ''}${g.url ? ` · <a href="${esc(g.url)}" target="_blank" rel="noopener">GTEx Portal</a>` : ''}. Credit in About.</p>` : ''}</div></section>`;
}
function viewSamples() {
  const d = state.data, c = d.comparison;
  if (!d.healthy && d.healthyUrl && !String(d.lazy.healthy || '').startsWith('error')) ensureLazy('healthy', checkHealthy);
  const hasFractions = d.samples.length && d.samples.some(s => Object.keys(s.fractions).length);
  if (!hasFractions)
    return `${pageHead('Samples', 'Samples and map', '')}${d.metabolic ? mapCard(d) : ''}<div class="card section"><div class="empty">This result does not include per-sample fractions.</div></div>`;
  const order = meanComposition(d).map(t => t.name), types = d.cellTypes.map(t => t.name);
  const metaKeys = [...new Set(d.samples.flatMap(s => Object.keys(s.meta)))].filter(k => k !== 'Tissue');
  const cols = { label: { v: s => s.label }, profiles: { v: s => s.profiles }, ...Object.fromEntries(metaKeys.map(k => [`m:${k}`, { v: s => metaValue(s, k) }])), ...Object.fromEntries(order.map(t => [`f:${t}`, { v: s => s.fractions[t] }])) };
  const defKey = metaKeys.includes('Group') ? 'm:Group' : 'label';
  const rows = sortRows('samples', d.samples, cols, defKey, 1);
  const sel = rows.find(s => s.id === state.selSample) || rows[0]; state.selSample = sel.id;
  const s = sortState('samples', defKey, 1);
  const L = 58, W = 940, H = 250, T = 8, bw = W / rows.length;
  const bars = rows.map((x, i) => {
    let y = T + H;
    const segs = order.map(t => { const v = x.fractions[t] || 0, h = v * H; y -= h; return `<rect x="${(L + i * bw + .5).toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(.5, bw - 1).toFixed(2)}" height="${h.toFixed(2)}" fill="${typeColor(t, types.indexOf(t))}"><title>${esc(x.label)} · ${esc(typeLabel(t))} ${pct(v)}</title></rect>`; }).join('');
    const on = x.id === sel.id;
    return `<g class="bar-sample${on ? ' on' : ''}" data-sample-pick="${esc(x.id)}" opacity="${on ? 1 : .82}">${segs}${on ? `<rect x="${(L + i * bw + .5).toFixed(2)}" y="${T}" width="${Math.max(.5, bw - 1).toFixed(2)}" height="${H}" fill="none" stroke="#0b1f33" stroke-width="2"/>` : ''}</g>`;
  }).join('');
  const groupStripRects = c ? rows.map((x, i) => `<rect x="${(L + i * bw + .5).toFixed(2)}" y="${T + H + 4}" width="${Math.max(.5, bw - 1).toFixed(2)}" height="6" fill="${groupColor(d, x.meta.Group)}"><title>${esc(x.label)}: ${esc(x.meta.Group)}</title></rect>`).join('') : '';
  const axis = [0, 25, 50, 75, 100].map(v => { const y = T + H - v / 100 * H; return `<line x1="${L - 5}" x2="${L}" y1="${y}" y2="${y}" stroke="#98a2b3"/><text x="${L - 9}" y="${y + 4}" text-anchor="end">${v}</text>`; }).join('');
  const sortedBy = s.key === 'label' ? 'sample name' : s.key.startsWith('f:') ? `${typeLabel(s.key.slice(2)).toLowerCase()} fraction` : s.key.startsWith('m:') ? s.key.slice(2).toLowerCase() : 'estimated profiles';
  const th = (k, l, o = {}) => sortTh('samples', k, l, { defKey, defDir: 1, ...o });
  const table = `<table class="table"><thead><tr>${th('label', 'Sample')}${metaKeys.map(k => th(`m:${k}`, esc(k), { num: numericMeta.has(k) })).join('')}${order.map(t => th(`f:${t}`, `${esc(typeLabel(t))} (%)`, { num: true })).join('')}${th('profiles', 'Estimated profiles', { num: true, title: 'Single-cell profiles estimated from this sample' })}</tr></thead>
  <tbody>${rows.map(x => `<tr class="clickable${x.id === sel.id ? ' selected' : ''}" data-sample-pick="${esc(x.id)}"><td><button type="button" class="name-link" data-sample-pick="${esc(x.id)}">${esc(x.label)}</button>${x.label !== x.id ? `<small>${esc(x.id)}</small>` : ''}</td>${metaKeys.map(k => `<td${numericMeta.has(k) ? ' class="num"' : ''}>${k === 'Healthy reference' && x.meta[k] === 'Outside' ? '<span class="badge warn">Outside</span>' : esc(x.meta[k] ?? '—')}</td>`).join('')}${order.map(t => `<td class="num">${Number.isFinite(x.fractions[t]) ? (x.fractions[t] * 100).toFixed(1) : '—'}</td>`).join('')}<td class="num">${num(x.profiles)}</td></tr>`).join('')}</tbody></table>`;
  const byGroup = !!c?.composition, cv = byGroup && state.compView === 'groups' ? 'groups' : 'samples';
  const stacked = `<svg viewBox="0 0 ${L + W + 4} ${T + H + 52}" style="width:100%;height:auto" role="img" aria-label="Stacked composition per sample">
    <g font-size="12" fill="#667085">${axis}<line x1="${L}" x2="${L}" y1="${T}" y2="${T + H}" stroke="#98a2b3"/>
    <text transform="translate(14 ${T + H / 2}) rotate(-90)" text-anchor="middle" fill="#344054">Estimated fraction of cells (%)</text>
    <text x="${L + W / 2}" y="${T + H + 40}" text-anchor="middle" fill="#344054">Samples (n = ${num(rows.length)}) in table order, sorted by ${esc(sortedBy)}${c ? '; strip under the bars: group' : ''}</text></g>${bars}${groupStripRects}</svg>
  <div class="legend static">${order.map(t => `<span><span class="swatch" style="background:${typeColor(t, types.indexOf(t))}"></span>${esc(typeLabel(t))}</span>`).join('')}${c ? groupNames(d).map(g => `<span><span class="swatch" style="background:${groupColor(d, g)};border-radius:1px"></span>${esc(g)} (strip)</span>`).join('') : ''}</div>`;
  const compSamples = `<section class="card section" id="comp-samples"><div class="card-head"><div><div class="card-title">${cv === 'groups' ? 'Composition by group' : 'Composition of every sample'}</div><div class="card-sub">${cv === 'groups' ? 'Estimated fraction of cells of each type in every sample (%), by group, with the test between the groups' : 'Estimated fraction of cells of each type in every sample (%). The chart follows the order of the table below; select a bar to see the sample.'}</div></div>
    ${byGroup ? `<div class="segmented" role="group" aria-label="Composition view"><button class="${cv === 'samples' ? 'active' : ''}" data-compview="samples">Per sample</button><button class="${cv === 'groups' ? 'active' : ''}" data-compview="groups">By group and cell type</button></div>` : ''}</div>
    <div class="card-body">${cv === 'groups' ? compositionCompare(c, { body: true }) : stacked}</div></section>`;
  return `${pageHead('Samples', 'Samples, map and cell-type composition', `The estimated single-cell profiles on the map, and the estimated share of cells of each type in each of the ${plural(rows.length, 'bulk sample')}${c ? ' and in each group' : ''}. Select a column header to sort a table and a sample to see its details on the right.`,
    `<div class="controls">${c && byGroup ? `<span class="note" style="margin:0">Groups compared on the bulk samples: ${esc(c.test)} vs ${esc(c.reference)}</span>` : ''}<button class="btn btn-secondary" data-action="exportcomposition">${icon('download')} CSV</button></div>`)}
  ${oodBanner(d)}
  ${d.metabolic ? `<div class="grid two">${mapCard(d)}${compositionMeansCard(d)}</div>` : compositionMeansCard(d)}
  ${healthyTypeCard(d)}
  ${compSamples}
  ${healthyBulkCard(d)}
  <div class="split section" id="sample-split"><section class="card"><div class="card-head"><div><div class="card-title">Composition table</div><div class="card-sub">Estimated fraction of cells per type (%); patient characteristics as reported by the source study</div></div></div>
    <div class="card-body table-wrap tall" data-scroll-id="samples-table">${table}</div></section>
    <aside class="detail">${sampleDetail(d, sel, order)}</aside></div>
  <div class="section">${glossary(d, { compact: true })}</div>`;
}
function sampleDetail(d, s, order) {
  const g = s.meta?.Group, peers = g ? d.samples.filter(x => x.meta?.Group === g) : d.samples;
  const median = t => { const v = peers.map(x => x.fractions[t]).filter(Number.isFinite).sort((a, b) => a - b); return v.length ? (v.length % 2 ? v[v.length >> 1] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; };
  const vmax = Math.max(...order.map(t => Math.max(s.fractions[t] || 0, median(t) || 0)), .05);
  const bars = order.map(t => { const v = s.fractions[t] || 0, m = median(t); return `<div class="hbar med"><span>${esc(typeLabel(t))}</span><span class="track"><i style="width:${(v / vmax * 100).toFixed(1)}%;background:${typeColor(t)}"></i>${Number.isFinite(m) ? `<em style="left:${(m / vmax * 100).toFixed(1)}%" title="Median of ${esc(g || 'all')} samples: ${pct(m)}"></em>` : ''}</span><b>${pct(v)}</b></div>`; }).join('');
  const pair = s.meta?.Patient ? d.samples.find(x => x.id !== s.id && x.meta?.Patient === s.meta.Patient) : null;
  const facts = ['Group', 'Patient', 'Stage', 'Grade', 'Sex', 'Age'].filter(k => s.meta?.[k] !== undefined && s.meta[k] !== null && s.meta[k] !== '').map(k => `<div class="metric"><small>${esc(k)}</small><b>${esc(s.meta[k])}</b></div>`).join('');
  const fit = s.fit ? `<p class="note">Fit to the healthy reference: correlation ${sig(s.fit.fit_r)}, unexplained share ${Number.isFinite(s.fit.unexplained) ? (s.fit.unexplained * 100).toFixed(1) : '—'}% · ${s.fit.outside_reference ? '<span class="badge warn">Outside the reference</span>' : 'within the reference'}</p>` : '';
  const pbt = s.profilesByType ? `<p class="note">Estimated profiles from this sample, by cell type: ${order.filter(t => s.profilesByType[t]).map(t => `${esc(typeLabel(t))} ${num(s.profilesByType[t])}`).join(' · ')}</p>` : '';
  const hasMap = d.metabolic && d.cells.some(c => c.sample === s.id);
  return `<section class="card"><div class="card-head"><div><div class="card-title">${esc(s.label)}</div><div class="card-sub">${esc(s.meta?.Tissue || s.id)}${s.profiles ? ` · ${plural(s.profiles, 'estimated profile')}` : ''}</div></div>${g ? `<span class="badge" style="background:${groupColor(d, g)}1a;color:${groupColor(d, g)}">${esc(g)}</span>` : ''}</div>
    <div class="card-body">${facts ? `<div class="metrics small">${facts}</div>` : ''}
    <div class="note" style="margin:14px 0 4px">Estimated composition of this sample (bars) and the median of ${esc(g ? `${g} samples` : 'all samples')} (marks)</div>${bars}${fit}${pbt}
    ${pair ? `<p class="note">Same patient: <button type="button" class="link-btn" data-sample-pick="${esc(pair.id)}">${esc(pair.label)}</button></p>` : ''}
    ${hasMap ? `<div class="note" style="margin:16px 0 4px">Profiles estimated from this sample on the metabolic map (colored by cell type; other samples' profiles in gray)</div><div class="embed-wrap"><svg class="embedding mini" viewBox="0 0 440 280" data-w="440" data-h="280" data-space="metabolic" role="img" aria-label="Profiles of this sample on the metabolic map"></svg><div class="tip hidden"></div></div>` : ''}</div></section>`;
}

/* ---------- Metabolic pathways ---------- */
const CAT_COLORS = ['#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#76b7b2', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac', '#86bcb6', '#d37295'];
function filteredPathways(d) {
  const q = state.search;
  return d.pathways.filter(x => (!q || `${x.name} ${x.id} ${x.category}`.toLowerCase().includes(q)) && (state.category === 'all' || x.category === state.category));
}
function heatRows(d) {
  let rows = filteredPathways(d).filter(p => !isOverviewMap(p.id) || state.category === 'Overview map');
  if (!state.heatAll) rows = rows.slice().sort((a, b) => b.spread - a.spread).slice(0, 40);
  const cats = [...new Set(d.pathways.map(p => p.category))].sort();
  return rows.slice().sort((a, b) => cats.indexOf(a.category) - cats.indexOf(b.category) || b.spread - a.spread);
}
function pathwayHover(d, p, i) {
  const t = d.cellTypes[i], v = p.activity[i], order = p.activity.map((x, k) => [x, k]).filter(x => Number.isFinite(x[0])).sort((a, b) => b[0] - a[0]);
  const rank = order.findIndex(x => x[1] === i) + 1, info = d.pathwayInfo[p.id];
  return `<b>${esc(p.name)}</b> (${esc(p.id)})<br>${esc(p.category)} · ${plural(p.reactionCount, 'reaction')} · ${plural(p.genes.length, 'enzyme gene')} in the data` +
    (info?.description ? `<br><i>${esc(info.description)}</i>` : '') +
    `<br><br><b>${esc(t.label)}</b>: activity ${sig(v)} (relative units)<br>z-score across cell types: ${sig(p.z[i])} · rank ${rank} of ${order.length}` +
    `<br>Highest in: ${esc(typeLabel(p.top || '—'))} · mean over cell types ${sig(p.score)}<br><span style="color:#667085">Select to open this pathway</span>`;
}
/* Outlines on the heatmap: the selected pathway (row) and cell type (column) in dark, the hovered ones in gray. */
function heatMarks(sel, hov) {
  const rect = (o, color, width) => ({ type: 'rect', layer: 'above', fillcolor: 'rgba(0,0,0,0)', line: { color, width }, ...o });
  const row = (i, color, width) => rect({ xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: i - .5, y1: i + .5 }, color, width);
  const col = (j, color, width) => rect({ xref: 'x', x0: j - .5, x1: j + .5, yref: 'paper', y0: 0, y1: 1 }, color, width);
  const shapes = [];
  if (hov && hov.row >= 0 && hov.row !== sel.row) shapes.push(row(hov.row, '#667085', 1.5));
  if (hov && hov.col >= 0 && hov.col !== sel.col) shapes.push(col(hov.col, '#667085', 1.5));
  if (sel.row >= 0) shapes.push(row(sel.row, '#0b1f33', 2));
  if (sel.col >= 0) shapes.push(col(sel.col, '#0b1f33', 2));
  return shapes;
}
async function drawPathwayHeatmap() {
  const holder = $('#pathway-heat'); if (!holder) return;
  const d = state.data, rows = heatRows(d), types = d.cellTypes;
  if (!rows.length) { holder.innerHTML = '<div class="empty">No pathways match the filter.</div>'; return; }
  try {
    const Plotly = await loadPlotly(); if (state.view !== 'pathways' || !$('#pathway-heat')) return;
    const zmode = state.heatScale === 'z', cats = [...new Set(d.pathways.map(p => p.category))].sort();
    const z = rows.map(p => (zmode ? p.z : p.activity).map(v => (Number.isFinite(v) ? v : null)));
    const lim = zmode ? Math.max(1.5, ...z.flat().filter(Number.isFinite).map(Math.abs)) : null;
    const main = { type: 'heatmap', z, x: types.map(t => t.label), y: rows.map(p => p.name), text: rows.map(p => types.map((t, i) => pathwayHover(d, p, i))), hoverinfo: 'text',
      colorscale: zmode ? [[0, '#2166ac'], [.5, '#f7f7f7'], [1, '#b2182b']] : [[0, '#f0f9f7'], [1, '#0f766e']], zmid: zmode ? 0 : undefined, zmin: zmode ? -lim : undefined, zmax: zmode ? lim : undefined,
      xgap: 1, ygap: 1, colorbar: { title: { text: zmode ? 'z-score across<br>cell types' : 'Activity<br>(relative units)', side: 'right' }, thickness: 12, len: Math.min(1, 360 / (rows.length * 18 + 60)), y: 1, yanchor: 'top', outlinewidth: 0 } };
    const n = Math.max(1, cats.length), scale = cats.flatMap((c, k) => [[k / n, CAT_COLORS[k % CAT_COLORS.length]], [(k + 1) / n, CAT_COLORS[k % CAT_COLORS.length]]]);
    const strip = { type: 'heatmap', z: rows.map(p => [cats.indexOf(p.category) + .5]), x: ['Category'], y: rows.map(p => p.name), xaxis: 'x2', yaxis: 'y', zmin: 0, zmax: n,
      text: rows.map(p => [`<b>${esc(p.category)}</b><br>${esc(p.name)}`]), hoverinfo: 'text', colorscale: scale, showscale: false, xgap: 0, ygap: 1 };
    const height = Math.max(320, rows.length * 18 + 110);
    const sel = { row: rows.findIndex(x => x.id === state.pathway), col: types.findIndex(t => t.name === state.heatType) };
    const at = pt => ({ row: rows.findIndex(x => x.name === pt?.y), col: pt?.curveNumber === 1 ? types.findIndex(t => t.label === pt?.x) : -1 });
    const bold = (label, on) => (on ? `<b>${label}</b>` : label);
    holder.style.height = `${height}px`; holder.innerHTML = '';
    await Plotly.newPlot(holder, [strip, main], {
      height, margin: { l: 250, r: 20, t: 10, b: 90 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff',
      font: { family: 'Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif', size: 11.5, color: '#1d2939' },
      xaxis: { domain: [.05, 1], side: 'bottom', tickangle: -35, title: { text: 'Cell type', standoff: 8 }, tickmode: 'array', tickvals: types.map(t => t.label), ticktext: types.map((t, j) => bold(t.label, j === sel.col)) }, xaxis2: { domain: [0, .035], showticklabels: false, ticks: '' },
      yaxis: { autorange: 'reversed', automargin: true, tickfont: { size: 11 }, anchor: 'x2', tickmode: 'array', tickvals: rows.map(x => x.name), ticktext: rows.map((x, i) => bold(x.name, i === sel.row)) }, shapes: heatMarks(sel, null), hoverlabel: { align: 'left', bgcolor: '#fff', bordercolor: '#d0d5dd', font: { size: 12 } },
    }, { displaylogo: false, responsive: true, modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'] });
    let last = '';
    const mark = hov => { const key = hov ? `${hov.row}:${hov.col}` : ''; if (key === last) return; last = key; Plotly.relayout(holder, { shapes: heatMarks(sel, hov) }); };
    holder.on('plotly_hover', ev => mark(at(ev?.points?.[0])));
    holder.on('plotly_unhover', () => mark(null));
    holder.on('plotly_click', ev => { const k = at(ev?.points?.[0]), p = rows[k.row]; if (p) { state.pathway = p.id; if (k.col >= 0) state.heatType = types[k.col].name; rerender(); $('#pathway-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  } catch (e) { if ($('#pathway-heat')) $('#pathway-heat').innerHTML = `<div class="empty">The heatmap could not be drawn (${esc(e.message)}).</div>`; }
}
function viewPathways() {
  const d = state.data;
  if (!d.metabolic) return `${pageHead('Metabolic pathways', 'Metabolic pathway explorer', '')}<div class="card"><div class="empty">The metabolic model was not run for this analysis, so KEGG pathway activity is not available. Signaling and functional pathways and the group comparison have their own views.</div></div>`;
  const p = d.pathways.find(x => x.id === state.pathway) || d.pathways[0];
  if (!p) return `${pageHead('Metabolic pathways', 'Metabolic pathway explorer', '')}<div class="card"><div class="empty">No pathways were scored.</div></div>`;
  state.pathway = p.id;
  const categories = [...new Set(d.pathways.map(x => x.category))].sort(), list = filteredPathways(d);
  const cols = { name: { v: x => x.name }, category: { v: x => x.category }, score: { v: x => x.score }, top: { v: x => typeLabel(x.top || '') }, spread: { v: x => x.spread }, rx: { v: x => x.reactionCount }, genes: { v: x => x.genes.length } };
  const rows = sortRows('pathways', list, cols, 'score', -1);
  const th = (k, l, o = {}) => sortTh('pathways', k, l, { defKey: 'score', defDir: -1, ...o });
  const controls = `<div class="controls"><label class="search">${icon('search')}<input class="input" id="pathway-search" type="search" placeholder="Search pathways" value="${esc(state.search)}" aria-label="Search pathways"></label>
    <select class="select" id="category-select" aria-label="Pathway category"><option value="all">All categories</option>${categories.map(c => `<option ${state.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>`;
  const nHeat = heatRows(d).length;
  return `${pageHead('Metabolic pathways', 'Metabolic pathway explorer', `Estimated activity of ${plural(d.pathways.length, 'KEGG metabolic pathway')} in each cell type, from the metabolic model applied to the estimated single-cell profiles (relative units; compare values within this analysis). Select a pathway in the heatmap or the table to see its details, map and literature support.`, `<div class="controls"><button class="btn btn-secondary" data-action="exportpathways">${icon('download')} CSV</button></div>`)}
  <section class="card"><div class="card-head"><div><div class="card-title">Pathway activity heatmap</div><div class="card-sub">Rows: KEGG pathways, grouped by category (left strip); columns: cell types. Color: ${state.heatScale === 'z' ? 'z-score of the pathway\u2019s activity across cell types (red: above the pathway\u2019s average over cell types; blue: below)' : 'mean activity in relative units'}. Hover a cell to outline its pathway (row) and cell type (column) and to see the category, reactions, enzyme genes, value and rank. Select a cell to keep its pathway and cell type outlined and to open the pathway below.</div></div></div>
    <div class="card-body"><div class="controls" style="margin-bottom:10px">${controls}<div class="segmented" role="group" aria-label="Rows"><button class="${state.heatAll ? '' : 'active'}" data-heat-all="0">40 most variable</button><button class="${state.heatAll ? 'active' : ''}" data-heat-all="1">All</button></div>
    <div class="segmented" role="group" aria-label="Color scale"><button class="${state.heatScale === 'z' ? 'active' : ''}" data-heat-scale="z">z-score</button><button class="${state.heatScale === 'raw' ? 'active' : ''}" data-heat-scale="raw">Activity</button></div><span class="note" style="margin:0">${plural(nHeat, 'pathway')} shown</span></div>
    <div id="pathway-heat" class="heatmap-frame"><div class="empty">Loading the heatmap…</div></div>
    <div class="legend static">${categories.filter(c => heatRows(d).some(x => x.category === c)).map(c => `<span><span class="swatch" style="background:${CAT_COLORS[categories.indexOf(c) % CAT_COLORS.length]}"></span>${esc(c)}</span>`).join('')}</div></div></section>
  <div class="split section" id="pathway-detail"><section class="card"><div class="card-head"><div><div class="card-title">All pathways</div><div class="card-sub">${plural(rows.length, 'pathway')}${list.length < d.pathways.length ? ` match the filter (of ${num(d.pathways.length)})` : ''}. Select a column header to sort.</div></div></div>
    <div class="card-body table-wrap tall" data-scroll-id="pathways-table"><table class="table"><thead><tr>${th('name', 'Pathway')}${th('category', 'Category')}${th('score', 'Mean activity', { num: true, title: 'Mean over cell types, relative units' })}${th('top', 'Highest in')}${th('spread', 'Spread', { num: true, title: '(highest − lowest) ÷ mean across cell types' })}${th('rx', 'Reactions', { num: true })}${th('genes', 'Enzyme genes', { num: true, title: 'Enzyme genes of the pathway present in the data' })}</tr></thead>
    <tbody>${rows.map(x => `<tr class="clickable${x.id === p.id ? ' selected' : ''}" data-pathway="${esc(x.id)}"><td><button type="button" class="name-link" data-pathway="${esc(x.id)}">${esc(x.name)}</button><small>${esc(x.id)}</small></td><td><span class="badge">${esc(x.category)}</span></td><td class="num">${sig(x.score)}</td><td>${esc(typeLabel(x.top || '—'))}</td><td class="num">${sig(x.spread)}</td><td class="num">${num(x.reactionCount)}</td><td class="num">${num(x.genes.length)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No pathways match the filter.</td></tr>'}</tbody></table></div></section>
    <aside class="detail">${pathwayDetail(d, p)}</aside></div>
  <section class="card section"><div class="card-head"><div><div class="card-title">Pathway map: ${esc(p.name)}</div><div class="card-sub">Lines are reaction steps and points are metabolites. Line color: mean reaction activity across all estimated profiles (relative units). Hover a line for its enzymes and literature; select a row of the literature table to highlight its step.</div></div><a class="badge accent" href="https://www.kegg.jp/pathway/hsa${esc(p.id.slice(2))}" target="_blank" rel="noopener" title="Open the human KEGG map">KEGG ${esc(p.id.replace('rn', 'hsa'))}</a></div>
    <div class="card-body"><div id="pathway-map" class="map-frame"><div class="empty">Loading pathway map…</div></div></div></section>
  <section class="card section" id="literature-card"><div class="card-head"><div><div class="card-title">Literature support</div><div class="card-sub">${esc(literatureScopeText())}</div></div><span class="badge accent">${esc(literatureScopeBadge())}</span></div>
    <div class="card-body" id="literature-body"><div class="empty">Loading literature support…</div></div></section>`;
}
function pathwayDetail(d, p) {
  const vals = p.activity.map((v, i) => ({ v, t: d.cellTypes[i], z: p.z[i] })).filter(x => Number.isFinite(x.v)).sort((a, b) => b.v - a.v);
  const vmax = Math.max(...vals.map(x => x.v), 1e-9), info = d.pathwayInfo[p.id];
  return `<section class="card"><div class="card-head"><div><div class="card-title">${esc(p.name)}</div><div class="card-sub">${esc(p.id)} · ${esc(p.category)}</div></div><span class="badge accent">KEGG</span></div>
    <div class="card-body">${info?.description ? `<p class="lead">${esc(info.description)}</p>` : ''}${p.note ? `<p class="note" style="margin:0 0 12px">${esc(p.note)}</p>` : ''}
    <div class="metrics"><div class="metric"><small>Mean activity</small><b>${sig(p.score)}</b></div><div class="metric"><small>Reactions</small><b>${num(p.reactionCount)}</b></div><div class="metric"><small>Enzyme genes</small><b>${num(p.genes.length)}</b></div><div class="metric"><small>Highest activity</small><b>${esc(typeLabel(p.top || '—'))}</b></div></div>
    <div class="note" style="margin:16px 0 6px">Activity by cell type (relative units; z-score across cell types in brackets)</div>${vals.map(x => `<div class="hbar"><span>${esc(x.t.label)}</span><span class="track"><i style="width:${(x.v / vmax * 100).toFixed(1)}%;background:${x.t.color}"></i></span><b>${sig(x.v)} <small>(${x.z >= 0 ? '+' : ''}${sig(x.z)})</small></b></div>`).join('')}
    ${spatialPanel(d, 'metabolic', p.id, p.name)}
    <div class="note" style="margin:16px 0 6px">Enzyme genes in the data (${num(p.genes.length)})</div><div class="chips">${p.genes.slice(0, 48).map(g => `<span class="chip">${esc(g)}</span>`).join('') || '<span class="note">No mapped genes.</span>'}</div>${p.genes.length > 48 ? `<p class="note">${num(p.genes.length - 48)} more in the CSV export.</p>` : ''}
    <p class="note">Highest activity compares the pathway's mean activity between cell types. The literature section below uses the <b>most specific</b> cell type, which first divides each profile's activities by that profile's overall activity; the two can differ.</p></div></section>`;
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
  const empty = msg => { if (state.view === 'pathways' && state.pathway === id && $('#pathway-map')) $('#pathway-map').innerHTML = `<div class="empty">${msg}</div>`; };
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
    const hover = fig.data.find(t => t.mode === 'markers' && Array.isArray(t.text) && String(t.text[0] || '').startsWith('Reaction:'));
    if (lit?.connections?.length && hover) {
      const byIndex = new Map(lit.connections.map(c => [c.i, c]));
      hover.text = hover.text.map((txt, j) => byIndex.has(j) ? `${txt}${hoverLiterature(byIndex.get(j))}` : txt);
    }
    for (const t of fig.data) {
      if (t.marker?.colorbar && t.marker.showscale !== false)
        t.marker.colorbar = { ...t.marker.colorbar, title: { text: 'Mean reaction activity<br>(relative units)', side: 'right' }, x: 1.01, xanchor: 'left', len: 0.7, thickness: 14, outlinewidth: 0 };
    }
    const layout = { ...fig.layout, autosize: true, height: 580, margin: { l: 16, r: 150, t: 20, b: 16 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff', showlegend: false,
      xaxis: { visible: false }, yaxis: { visible: false, autorange: 'reversed' }, title: undefined, hoverlabel: { align: 'left', bgcolor: '#fff', bordercolor: '#d0d5dd' },
      font: { family: 'Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif', size: 12, color: '#1d2939' } };
    const el = $('#pathway-map'); if (!el) return;
    el.innerHTML = '';
    await Plotly.newPlot(el, fig.data, layout, { displaylogo: false, responsive: true, modeBarButtonsToRemove: ['lasso2d', 'select2d'] });
    state.mapFig = { id, x: hover?.x || [], y: hover?.y || [] };
    if (state.lit.conn) highlightStep(state.lit.conn);
  } catch (e) { empty(`The pathway map could not be loaded (${esc(e.message)}).`); }
}
function highlightStep(key) {
  const el = $('#pathway-map'), m = state.mapFig; if (!el || !m || m.id !== state.pathway || !window.Plotly) return;
  const row = (state.litRows || []).find(r => r.key === key); if (!row) return;
  const pts = row.steps.map(s => [m.x[s.i], m.y[s.i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  const shapes = pts.map(([x, y]) => ({ type: 'circle', xref: 'x', yref: 'y', x0: x - 14, x1: x + 14, y0: y - 14, y1: y + 14, line: { color: '#b42318', width: 2.5 } }));
  const annotations = pts.slice(0, 1).map(([x, y]) => ({ x, y, text: `<b>${esc(row.steps[0].a)} – ${esc(row.steps[0].b)}</b>`, showarrow: true, arrowhead: 2, arrowcolor: '#b42318', ax: 60, ay: -40, bgcolor: '#fff', bordercolor: '#b42318', font: { size: 11.5, color: '#b42318' } }));
  window.Plotly.relayout(el, { shapes, annotations });
}

/* ---------- Literature support ---------- */
const pubmedUrl = pmids => pmids.length === 1 ? `https://pubmed.ncbi.nlm.nih.gov/${pmids[0]}/` : `https://pubmed.ncbi.nlm.nih.gov/?term=${pmids.map(x => `${x}[pmid]`).join('+OR+')}&sort=date`;
const paperLink = (n, pmids, what) => !Number.isFinite(n) ? '—' : n && pmids?.length ? `<a href="${pubmedUrl(pmids)}" target="_blank" rel="noopener" title="Open the ${pmids.length === 1 ? 'paper' : `${pmids.length} most recent papers`} (${esc(what)}) in PubMed">${num(n)}</a>` : num(n);
function literatureMeta() { const d = state.data; return d.literatureMeta || (d.origin === 'demo' ? DEMO().literatureMeta : null) || null; }
function litScope() { const m = literatureMeta(); return m?.scope || (m?.excludesCancerPapers === false ? 'all' : 'no_cancer'); }
const SCOPE = {
  cancer: { badge: 'Pancreatic cancer', noun: 'pancreatic cancer papers', short: 'pancreatic cancer', col: 'Pancreatic cancer papers' },
  no_cancer: { badge: 'Human pancreas', noun: 'human pancreas papers (pancreatic cancer excluded)', short: 'human pancreas', col: 'Human pancreas papers' },
  all: { badge: 'Human pancreas', noun: 'human pancreas papers', short: 'human pancreas', col: 'Human pancreas papers' },
};
const scopeInfo = () => SCOPE[litScope()] || SCOPE.all;
function literatureScopeText() { return `Published evidence on the enzymes of each reaction step drawn on the map: ${scopeInfo().noun} in PubMed (gene annotations from PubTator3) and curated enzyme evidence (UniProtKB/Swiss-Prot). Paper counts show that an enzyme has been studied, not that the reaction is active.`; }
function literatureScopeBadge() { return scopeInfo().badge; }
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
  if (!c.genes?.length) return '<br>Enzyme genes: none in the data';
  const genes = c.genes.slice(0, 4).join(', ') + (c.genes.length > 4 ? ` +${c.genes.length - 4}` : '');
  return `<br>Enzymes: ${esc(genes)}<br>${esc(scopeInfo().col)}: ${num(c.pancreas)}` +
    (c.top ? `<br>Most specific cell type: ${esc(typeLabel(c.top))}; papers in ${esc(typeNoun(c.top))} cells: ${num(c.cell)} (expected ${sig(c.expected)})` : '') +
    (c.hypothesis ? '<br><b>Candidate hypothesis</b>' : '');
}
/* One row per reaction step: connections drawn more than once with the same reactions, genes and cell type are merged. */
function literatureRows(lit) {
  const groups = new Map();
  for (const c of lit.connections || []) {
    const key = `${c.reactions}|${(c.genes || []).join(',')}|${c.top}`;
    if (!groups.has(key)) groups.set(key, { ...c, key: `s${c.i}`, steps: [] });
    groups.get(key).steps.push({ a: c.a, b: c.b, i: c.i });
  }
  return [...groups.values()];
}
function evidenceStatus(r) {
  if (!r.genes?.length) return ['none', 'No enzyme gene in the data'];
  if (r.hypothesis) return ['hyp', 'Candidate hypothesis'];
  if ((r.cell || 0) > 0) return ['cell', `Studied in ${typeNoun(r.top)} cells`];
  if ((r.pancreas || 0) > 0) return ['scope', `Studied in ${scopeInfo().short}`];
  if ((r.pancreasInclCancer || 0) > 0) return ['other', 'Other pancreas research only'];
  return ['unstudied', 'No pancreas papers found'];
}
const STATUS_ORDER = { hyp: 0, cell: 1, scope: 2, other: 3, unstudied: 4, none: 5 };
function specificity(r) {
  if (!r.top) return '';
  const m = r.margin;
  const how = !Number.isFinite(m) ? '' : m >= 1 ? `clearly highest (${sig(m)} SD ahead of ${typeNoun(r.second)})` : m >= .25 ? `ahead of ${typeNoun(r.second)} by ${sig(m)} SD` : `near tie with ${typeNoun(r.second)} (${sig(m)} SD)`;
  return how;
}
function ratioText(obs, exp) {
  if (!Number.isFinite(obs) || !Number.isFinite(exp)) return '';
  const r = (obs + .5) / (exp + .5);
  return r >= 1.5 ? 'more often than expected' : r <= 1 / 1.5 ? 'less often than expected' : 'about as often as expected';
}
function paperList(pmids, titles, limit = 5) {
  const items = (pmids || []).slice(0, limit).map(p => { const t = titles?.[p] || titles?.[String(p)]; return `<li><a href="https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(p)}/" target="_blank" rel="noopener">${esc(t?.t || `PMID ${p}`)}</a><small>${esc([t?.j, t?.y].filter(Boolean).join(', '))}${t ? ' · ' : ''}PMID ${esc(p)}</small></li>`; }).join('');
  return items ? `<ol class="papers">${items}</ol>` : '';
}
function literatureBody(p, lit) {
  const d = state.data, sc = scopeInfo(), s = lit.summary || {}, rowsAll = literatureRows(lit);
  state.litRows = rowsAll;
  const withGenes = rowsAll.filter(r => r.genes?.length);
  const nScope = withGenes.filter(r => r.pancreas > 0).length, nCell = withGenes.filter(r => (r.cell || 0) > 0).length, nHyp = rowsAll.filter(r => r.hypothesis).length;
  const top = s.topCellType, label = top ? typeLabel(top) : '—', noun = top ? typeNoun(top) : '';
  const differ = top && p.top && top !== p.top;
  const filter = state.lit.filter || 'genes';
  let rows = filter === 'hyp' ? rowsAll.filter(r => r.hypothesis) : filter === 'genes' ? withGenes : rowsAll;
  const cols = { step: { v: r => `${r.steps[0].a} ${r.steps[0].b}` }, genes: { v: r => r.genes?.[0] || null }, top: { v: r => (r.top ? typeLabel(r.top) : null) }, pancreas: { v: r => (r.genes?.length ? r.pancreas : null) },
    cell: { v: r => (r.genes?.length && r.top ? r.cell : null) }, ratio: { v: r => (r.genes?.length && Number.isFinite(r.expected) ? (r.cell + .5) / (r.expected + .5) : null) }, curated: { v: r => (r.genes?.length ? r.curated : null) }, status: { v: r => STATUS_ORDER[evidenceStatus(r)[0]] } };
  rows = sortRows('lit', rows, cols, 'pancreas', -1);
  const sel = rowsAll.find(r => r.key === state.lit.conn) || null;
  const th = (k, l, o = {}) => sortTh('lit', k, l, { defKey: 'pancreas', defDir: -1, ...o });
  const body = rows.map(r => {
    const g = r.genes?.length > 0, [st, stLabel] = evidenceStatus(r);
    const genes = g ? esc(r.genes.slice(0, 3).join(', ')) + (r.genes.length > 3 ? ` <small>+${r.genes.length - 3} more</small>` : '') : '<span class="note">None in the data</span>';
    const rx = String(r.reactions || '').split(';').filter(Boolean);
    return `<tr class="clickable${sel && sel.key === r.key ? ' selected' : ''}" data-litrow="${esc(r.key)}"><td><button type="button" class="name-link" data-litrow="${esc(r.key)}">${r.steps.map(x => `${esc(x.a)} – ${esc(x.b)}`).join('<br>')}</button><small>${esc(rx.slice(0, 3).join(', '))}${rx.length > 3 ? ` +${rx.length - 3}` : ''}</small></td>
      <td>${genes}</td><td>${r.top ? esc(typeLabel(r.top)) : '—'}<small>${esc(specificity(r))}</small></td>
      <td class="num">${g ? paperLink(r.pancreas, r.pancreasPmids, sc.noun) : '—'}</td>
      <td class="num">${g && r.top ? paperLink(r.cell, r.cellPmids, `${typeNoun(r.top)} cells`) : '—'}${g && Number.isFinite(r.expected) ? `<small>expected ${sig(r.expected)}</small>` : ''}</td>
      <td class="num">${g && Number.isFinite(r.expected) ? sig((r.cell + .5) / (r.expected + .5)) : '—'}</td>
      <td class="num">${g ? paperLink(r.curated, r.curatedPmids, 'curated enzyme evidence') : '—'}</td>
      <td><span class="status s-${st}">${esc(stLabel)}</span></td></tr>`;
  }).join('');
  const recent = paperList(s.pancreasPmids, lit.titles, 5);
  const summary = `<div class="metrics five"><div class="metric"><small>Reaction steps on the map</small><b>${num(rowsAll.length)}</b></div><div class="metric"><small>With enzyme genes in the data</small><b>${num(withGenes.length)}</b></div><div class="metric"><small>Studied in ${esc(sc.short)}</small><b>${num(nScope)} <span class="of">of ${num(withGenes.length)}</span></b></div><div class="metric"><small>Studied in the most specific cell type</small><b>${num(nCell)} <span class="of">of ${num(withGenes.length)}</span></b></div><div class="metric"><small>Candidate hypotheses</small><b>${num(nHyp)}</b></div></div>
    <div class="lit-summary">${top ? `<p><b>Most specific cell type for this pathway: ${esc(label)}</b> (highest relative activity)${differ ? `; the highest absolute activity is in ${esc(typeNoun(p.top))} cells (see the definitions below)` : ''}.</p>
      <p>The pathway's enzymes appear in ${paperLink(s.pancreasPapers, s.pancreasPmids, sc.noun)} ${esc(sc.noun)}; ${paperLink(s.cellTypePapers, s.cellTypePmids, `${noun} cells`)} of them concern ${esc(noun)} cells, ${esc(ratioText(s.cellTypePapers, s.expected))} for enzymes studied this often (expected ${sig(s.expected)}).</p>` : '<p>No cell type stands out for this pathway.</p>'}
      ${recent ? `<div class="note" style="margin:10px 0 4px">Most recent ${esc(sc.noun)} on this pathway's enzymes</div>${recent}` : ''}</div>`;
  const toolbar = `<div class="lit-toolbar"><div class="segmented" role="group" aria-label="Rows"><button class="${filter === 'genes' ? 'active' : ''}" data-litfilter="genes">With enzyme genes (${num(withGenes.length)})</button><button class="${filter === 'all' ? 'active' : ''}" data-litfilter="all">All steps (${num(rowsAll.length)})</button><button class="${filter === 'hyp' ? 'active' : ''}" data-litfilter="hyp">Candidate hypotheses (${num(nHyp)})</button></div><span class="note">Select a column header to sort; select a step to see its papers and highlight it on the map.</span></div>`;
  const table = `<div class="table-wrap lit-table" data-scroll-id="lit-table"><table class="table"><colgroup><col class="c-rxn"><col class="c-genes"><col class="c-top"><col class="c-num"><col class="c-num"><col class="c-num"><col class="c-num"><col class="c-status"></colgroup><thead><tr>${th('step', 'Reaction step (metabolites)')}${th('genes', 'Enzyme genes')}${th('top', 'Most specific cell type')}${th('pancreas', esc(sc.col), { num: true })}${th('cell', 'Papers in that cell type', { num: true })}${th('ratio', 'Observed ÷ expected', { num: true, title: '(papers in the cell type + 0.5) ÷ (expected + 0.5)' })}${th('curated', 'Curated enzyme papers', { num: true })}${th('status', 'Evidence')}</tr></thead>
    <tbody>${body || `<tr><td colspan="8"><div class="empty">${filter === 'hyp' ? 'No candidate hypotheses on this map.' : 'No reaction steps on this map.'}</div></td></tr>`}</tbody></table></div>`;
  return `${summary}${toolbar}${table}${sel ? stepDetail(sel, lit) : ''}${literatureDefinitions()}`;
}
function stepDetail(r, lit) {
  const sc = scopeInfo(), rx = String(r.reactions || '').split(';').filter(Boolean), [st, stLabel] = evidenceStatus(r);
  return `<div class="step-detail" id="step-detail"><div class="step-head"><b>${r.steps.map(x => `${esc(x.a)} – ${esc(x.b)}`).join('; ')}</b><span class="status s-${st}">${esc(stLabel)}</span></div>
    <p class="note">KEGG reactions: ${rx.map(x => `<a href="https://www.kegg.jp/entry/${esc(x)}" target="_blank" rel="noopener">${esc(x)}</a>`).join(', ') || '—'}${r.steps.length > 1 ? ` · drawn as ${r.steps.length} lines on the map` : ''}</p>
    ${r.genes?.length ? `<div class="chips">${r.genes.map(g => `<span class="chip">${esc(g)}</span>`).join('')}</div>` : '<p class="note">No enzyme gene of this step is in the data, so no literature is counted.</p>'}
    ${r.top ? `<p class="note">Most specific cell type: <b>${esc(typeLabel(r.top))}</b>${specificity(r) ? `, ${esc(specificity(r))}` : ''}.</p>` : ''}
    ${r.genes?.length ? `<p class="note">${num(r.pancreas)} ${esc(sc.noun)} mention these enzymes; ${num(r.cell)} concern ${esc(typeNoun(r.top || ''))} cells (expected ${sig(r.expected)}); ${num(r.pancreasInclCancer)} human pancreas papers in total; ${num(r.curated)} papers with curated experimental evidence of the enzymes' activity.</p>` : ''}
    <div class="grid halves">${r.pancreasPmids?.length ? `<div><div class="note" style="margin:8px 0 4px">Most recent ${esc(sc.noun)}</div>${paperList(r.pancreasPmids, lit.titles)}</div>` : ''}${r.cellPmids?.length ? `<div><div class="note" style="margin:8px 0 4px">Most recent of these in ${esc(typeNoun(r.top))} cells</div>${paperList(r.cellPmids, lit.titles)}</div>` : ''}</div>
    ${r.curatedPmids?.length ? `<p class="note">Curated enzyme evidence (UniProtKB/Swiss-Prot): ${r.curatedPmids.map(x => `<a href="https://pubmed.ncbi.nlm.nih.gov/${esc(x)}/" target="_blank" rel="noopener">PMID ${esc(x)}</a>`).join(', ')}</p>` : ''}</div>`;
}
function literatureDefinitions() {
  const m = literatureMeta(), sc = scopeInfo();
  return `<details class="lit-defs"><summary>How these numbers are computed</summary><dl>
    <dt>Reaction step</dt><dd>One line on the pathway map between two metabolites. A step can include several KEGG reactions catalyzed by the same enzymes; a step drawn as several lines is listed once.</dd>
    <dt>Most specific cell type</dt><dd>Each estimated profile's reaction activities are divided by that profile's mean activity over all reactions, which removes differences in overall activity between profiles. These relative activities are averaged per cell type and compared across cell types as z-scores; the most specific cell type has the highest z-score. The margin is its lead over the second cell type in standard deviations (SD): at least 1 SD is a clear lead, below 0.25 SD a near tie. The pathway's <i>highest activity</i> shown above uses absolute activity instead, so the two can name different cell types.</dd>
    <dt>${esc(sc.col)}</dt><dd>PubMed records indexed with the MeSH term Humans that concern the pancreas${litScope() === 'cancer' ? ' and pancreatic cancer' : litScope() === 'no_cancer' ? ', excluding pancreatic cancer' : ''}, and that are annotated with at least one enzyme gene of the step (PubTator3 gene annotations). Each paper counts once.</dd>
    <dt>Papers in that cell type</dt><dd>The subset that also concerns the most specific cell type (for example, “ductal cells” for ductal).</dd>
    <dt>Expected and observed ÷ expected</dt><dd>Expected = ${esc(sc.noun)} on the enzymes × the share of ${esc(sc.noun)} that concern the cell type. Observed ÷ expected = (papers in the cell type + 0.5) ÷ (expected + 0.5): above 1, the enzymes are discussed in that cell type more often than an average gene studied in ${esc(sc.short)}.</dd>
    <dt>Curated enzyme papers</dt><dd>Papers cited as experimental evidence for the enzyme's catalytic activity in reviewed human UniProtKB/Swiss-Prot entries, matched to the step by EC number.</dd>
    <dt>Evidence</dt><dd>Studied in the cell type: at least one paper in the most specific cell type. Studied in ${esc(sc.short)}: papers exist, but none in that cell type. Candidate hypothesis: the predicted activity is specific to one cell type (margin of at least 1 SD), at least one paper in that cell type would be expected, and none exists in any human pancreas literature. Hypotheses are predictions for follow-up, not findings.</dd>
    <dt>Reading the counts</dt><dd>Paper counts show that enzymes have been studied. They do not show that a reaction is active, and well-studied genes collect more papers.</dd>
  </dl>${m ? `<p class="note" style="margin:10px 0 0">Literature index ${esc(m.version || '')}, built ${esc(m.built || '')}: ${num(m.papers)} ${esc(sc.noun)}${m.papersAllPancreas ? ` (of ${num(m.papersAllPancreas)} human pancreas papers)` : ''} annotated with ${num(m.genes)} enzyme genes.</p>` : ''}</details>`;
}
async function loadLiterature() {
  const holder = $('#literature-body'); if (!holder) return;
  const id = state.pathway || defaultPathway();
  const lit = await getLiterature(id);
  if (state.view !== 'pathways' || (state.pathway || defaultPathway()) !== id || !$('#literature-body')) return;
  const p = state.data.pathways.find(x => x.id === id);
  $('#literature-body').innerHTML = lit ? literatureBody(p, lit) : `<div class="empty">${isOverviewMap(id) ? 'Literature support is shown for drawn pathway maps; overview maps are not drawn.' : 'Literature support is not available for this pathway.'}</div>`;
}
function rerenderLiterature() {
  const wrap = $('[data-scroll-id="lit-table"]'), top = wrap?.scrollTop || 0, y = window.scrollY;
  loadLiterature().then(() => { const w = $('[data-scroll-id="lit-table"]'); if (w) w.scrollTop = top; window.scrollTo(0, y); if (state.lit.conn) highlightStep(state.lit.conn); });
}
async function exportLiterature() {
  const d = state.data, sc = scopeInfo(), cols = ['pathway_id', 'pathway_name', 'metabolite_pairs', 'kegg_reactions', 'enzyme_genes', 'most_specific_cell_type', 'second_cell_type', 'specificity_margin_sd', 'literature_scope', 'scope_papers', 'scope_papers_in_cell_type', 'expected_scope_papers_in_cell_type', 'observed_over_expected', 'all_human_pancreas_papers', 'curated_enzyme_papers', 'recent_pmids_scope', 'recent_pmids_cell_type', 'curated_pmids', 'evidence', 'candidate_hypothesis'];
  const q = v => { const t = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const lines = [cols.join(',')];
  for (const p of d.pathways) {
    const lit = await getLiterature(p.id); if (!lit) continue;
    for (const r of literatureRows(lit))
      lines.push([p.id, p.name, r.steps.map(x => `${x.a} - ${x.b}`).join('; '), r.reactions, (r.genes || []).join(';'), r.top, r.second, r.margin, sc.noun, r.pancreas, r.cell, r.expected, Number.isFinite(r.expected) ? ((r.cell + .5) / (r.expected + .5)).toFixed(3) : '', r.pancreasInclCancer, r.curated, (r.pancreasPmids || []).join(';'), (r.cellPmids || []).join(';'), (r.curatedPmids || []).join(';'), evidenceStatus(r)[1], r.hypothesis ? 'True' : 'False'].map(q).join(','));
  }
  if (lines.length === 1) return toast('No literature support is available for this result.');
  download('cellaris-literature-support.csv', lines.join('\n'));
}

/* ---------- Gene expression ---------- */
const argmax = v => v.reduce((b, x, i) => (Number.isFinite(x) && (b < 0 || x > v[b]) ? i : b), -1);
const patientOf = s => s?.meta?.Patient || s?.meta?.patient || s?.meta?.Case || null;
/* ---------- Literature support for genes, gene sets and cell types ---------- */
function checkGeneLit(b) { if (!b || typeof b.genes !== 'object' || !Array.isArray(b.cellTypes) || typeof b.expectedByScopePapers !== 'object') throw new Error('Invalid literature table.'); return b; }
function checkSetLit(b) { if (!b || typeof b.sets !== 'object' || !Array.isArray(b.cellTypes)) throw new Error('Invalid literature table.'); return b; }
function checkTypeLit(b) { if (!b || typeof b.cellTypes !== 'object') throw new Error('Invalid literature table.'); return b; }
/* null when the block is loaded; otherwise the text to show while it loads or when it failed */
function lazyState(key, check) {
  const d = state.data, st = d.lazy[key];
  if (d[key]) return null;
  if (d[`${key}Url`] && !String(st || '').startsWith('error')) { ensureLazy(key, check); return '<p class="note">Loading literature support…</p>'; }
  return `<p class="note">${st ? `Literature support could not be loaded (${esc(String(st).replace(/^error: /, ''))}).` : 'Literature support is not available for this result.'}</p>`;
}
function geneLitRecord(L, gene) {
  const sym = L.genes[gene] ? gene : L.aliases?.[gene], r = sym && L.genes[sym];
  if (!r) return null;
  return { sym, scope: r[0], pancreas: r[1], obs: r[2], enr: r[3], top: r[4], exp: L.expectedByScopePapers[String(r[0])] || [], links: L.links?.[sym] || null };
}
const ratioCell = v => (Number.isFinite(v) && v > 0 ? `<span class="heat" style="${diverge(Math.log2(v), 3)}">${sig(v)}</span>` : '—');
function litTypeTable(types, obs, exp, enr, top) {
  return `<table class="table compact lit-types"><thead><tr><th>Cell type</th><th class="num" title="Pancreatic cancer papers that also concern the cell type">Papers</th><th class="num" title="Papers × the share of pancreatic cancer papers that concern the cell type">Expected</th><th class="num" title="(papers + 0.5) ÷ (expected + 0.5)">Observed ÷ expected</th></tr></thead><tbody>${types.map((t, i) => `<tr class="${t === top ? 'selected' : ''}"><td><span class="swatch" style="background:${typeColor(t, i)};margin-right:6px"></span>${esc(typeLabel(t))}</td><td class="num">${num(obs[i])}</td><td class="num">${sig(exp[i])}</td><td class="num">${ratioCell(enr[i])}</td></tr>`).join('')}</tbody></table>`;
}
function litCaution(gene) { const c = DEMO().litCautions?.[gene]; return c ? `<p class="note" data-lit-caution><b>Check this gene name.</b> ${esc(c)}</p>` : ''; }
const LIT_READING = 'Papers are human pancreatic cancer papers in PubMed in which the gene is recognized automatically (PubTator3). Expected = the papers on the gene × the share of pancreatic cancer papers that concern the cell type; observed ÷ expected = (papers + 0.5) ÷ (expected + 0.5). The highlighted cell type has the highest ratio among cell types with at least 3 papers. Counts show how much a gene has been studied in a context, not that it is expressed or active there, and automatic gene recognition makes mistakes.';
const LIT_HOWTO_HTML = '<p class="note lit-howto"><b>How to read this.</b> A ratio above 1 means the gene is discussed together with that cell type more often than expected from how often each is studied on its own. It measures attention in the literature; it is not evidence that the gene is expressed or active in that cell type.</p>';
function geneLiterature(d, gene, { compact = false, id = 'gene-lit' } = {}) {
  if (!d.geneLitUrl && !d.geneLit) return '';
  const head = `<div class="note" style="margin:18px 0 6px"><b style="color:var(--ink-2)">Literature support</b> · human pancreatic cancer papers on this gene</div>`;
  const wait = lazyState('geneLit', checkGeneLit);
  if (wait !== null) return `<div id="${id}" class="detail-sub">${head}${wait}</div>`;
  const L = d.geneLit, r = geneLitRecord(L, gene);
  if (!r) return `<div id="${id}" class="detail-sub">${head}<p class="note">No human pancreatic cancer paper is annotated with this gene.</p></div>`;
  const ti = r.top ? L.cellTypes.indexOf(r.top) : -1;
  const metrics = `<div class="metrics small"><div class="metric"><small>Pancreatic cancer papers</small><b>${num(r.scope)}</b></div><div class="metric"><small>All human pancreas papers</small><b>${num(r.pancreas)}</b></div><div class="metric"><small>Most associated cell type</small><b>${r.top ? `${esc(typeLabel(r.top))} <span class="of">× ${sig(r.enr[ti])}</span>` : '—'}</b></div></div>`;
  const recent = r.links?.[0]?.length ? `<div class="note" style="margin:12px 0 4px">Most recent pancreatic cancer papers</div>${paperList(r.links[0], L.titles, compact ? 3 : 5)}` : '';
  const inType = !compact && r.top && r.links?.[1]?.length ? `<div class="note" style="margin:12px 0 4px">Most recent papers that also concern ${esc(typeNoun(r.top))} cells</div>${paperList(r.links[1], L.titles, 5)}` : '';
  return `<div id="${id}" class="detail-sub">${head}${metrics}${litCaution(r.sym)}${compact ? '' : LIT_HOWTO_HTML + litTypeTable(L.cellTypes, r.obs, r.exp, r.enr, r.top)}${recent}${inType}<p class="note">${compact ? 'Counts show how much a gene has been studied, not that it is expressed or active. The marker-gene panel of the Gene expression tab shows the breakdown by cell type.' : esc(LIT_READING)}${r.sym !== gene ? ` Counted under the current symbol ${esc(r.sym)}.` : ''}</p></div>`;
}
/* Genes studied most in connection with each cell type (Gene expression tab). */
function celltypeLiteratureCard(d) {
  if (!d.celltypeLitUrl && !d.celltypeLit) return '';
  const wait = lazyState('celltypeLit', checkTypeLit);
  const shell = body => `<section class="card section" id="lit-celltypes"><div class="card-head"><div><div class="card-title">Literature support by cell type</div><div class="card-sub">Genes discussed in connection with a cell type more often than expected, among human pancreatic cancer papers</div></div><span class="badge accent">Pancreatic cancer</span></div><div class="card-body">${body}</div></section>`;
  if (wait !== null) return shell(wait);
  const C = d.celltypeLit, types = d.cellTypes.map(t => t.name).filter(t => C.cellTypes[t]);
  const t = types.includes(state.lit.type) ? state.lit.type : types.find(x => (C.cellTypes[x].topGenes || []).length >= 20) || types[0], k = C.cellTypes[t];
  const picker = `<div class="toggle-chips" role="group" aria-label="Cell type for the literature table" id="lit-type">${types.map((x, i) => `<button class="${x === t ? 'active' : ''}" data-littype="${esc(x)}" aria-pressed="${x === t}"><span class="swatch" style="background:${typeColor(x, i)}"></span>${esc(typeLabel(x).replace(' (gamma)', ''))}<small>${num(C.cellTypes[x].scopePapers)}</small></button>`).join('')}</div>`;
  const rows = (k.topGenes || []).map(([g, obs, exp, enr, all, pm]) => { const tt = pm?.length ? C.titles?.[String(pm[0])] : null; return `<tr><td><i>${esc(g)}</i>${DEMO().litCautions?.[g] ? ` <span class="badge warn" title="${esc(DEMO().litCautions[g])}">check name</span>` : ''}</td><td class="num">${num(obs)}</td><td class="num">${sig(exp)}</td><td class="num">${ratioCell(enr)}</td><td class="num">${num(all)}</td><td>${tt ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pm[0])}/" target="_blank" rel="noopener">${esc(shorten(tt.t, 90))}</a><small>${esc([tt.j, tt.y].filter(Boolean).join(', '))}</small>` : '<span class="note">—</span>'}</td></tr>`; }).join('');
  return shell(`${picker}${LIT_HOWTO_HTML}<p class="note" style="margin:10px 0">${num(k.scopePapers)} pancreatic cancer papers concern ${esc(typeNoun(t))} cells. ${plural(k.topGenes.length, 'gene')} with at least 5 such papers, highest observed ÷ expected first${k.topGenes.length < 50 ? ' (few genes reach 5 papers for this cell type)' : ''}.</p>
    <div class="table-wrap" style="max-height:420px" data-scroll-id="lit-celltypes"><table class="table"><thead><tr><th>Gene</th><th class="num">Papers in ${esc(typeNoun(t))} cells</th><th class="num">Expected</th><th class="num">Observed ÷ expected</th><th class="num">All pancreatic cancer papers</th><th>Most recent paper</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="empty">No gene has 5 papers for this cell type.</td></tr>'}</tbody></table></div>
    <p class="note">${esc(LIT_READING)} In pancreatic cancer papers, “ductal” mostly refers to ductal adenocarcinoma: about a third of all papers match it, which limits the ratio for ductal cells to about 3.</p>`);
}
/* Literature on the member genes of a gene set (Cell-type signaling tab). */
function genesetLiteratureCard(d, g, s) {
  if (!s || (!d.genesetLitUrl && !d.genesetLit)) return '';
  const shell = body => `<section class="card section" id="gs-lit"><div class="card-head"><div><div class="card-title">Literature support: ${esc(s.label)}</div><div class="card-sub">Human pancreatic cancer papers on the member genes of this gene set, overall and by cell type</div></div><span class="badge accent">Pancreatic cancer</span></div><div class="card-body">${body}</div></section>`;
  const wait = lazyState('genesetLit', checkSetLit);
  if (wait !== null) return shell(wait);
  const L = d.genesetLit, r = L.sets[s.id];
  if (!r) return shell('<p class="note">No literature record for this gene set.</p>');
  const [nLib, nWith, papers, obs, exp, enr, top] = r, types = g.cellTypes;
  let ti = types.indexOf(state.gs.type); if (ti < 0 || !Number.isFinite(s.activity[ti])) ti = Number.isInteger(s.best) && s.best >= 0 ? s.best : 0;
  const t = types[ti], gl = d.geneLit, gg = d.genesetGenes;
  const metrics = `<div class="metrics small"><div class="metric"><small>Member genes with papers</small><b>${num(nWith)} <span class="of">of ${num(nLib)}</span></b></div><div class="metric"><small>Pancreatic cancer papers on member genes</small><b>${num(papers)}</b></div><div class="metric"><small>Most associated cell type</small><b>${top ? `${esc(typeLabel(top))} <span class="of">× ${sig(enr[L.cellTypes.indexOf(top)])}</span>` : '—'}</b></div></div>`;
  let genes = '';
  if (gg) {
    const waitG = lazyState('geneLit', checkGeneLit);
    if (waitG !== null) genes = waitG;
    else {
      const li = gl.cellTypes.indexOf(t), items = setGenesInType(gg, s, t);
      const rows = items.map(x => { const q = geneLitRecord(gl, x.name), tt = q?.links?.[0]?.length ? gl.titles?.[String(q.links[0][0])] : null; return `<tr><td><i>${esc(x.name)}</i></td><td class="num">${q ? num(q.scope) : '0'}</td><td class="num">${q ? num(q.obs[li]) : '0'}</td><td class="num">${q ? sig(q.exp[li]) : '—'}</td><td class="num">${q ? ratioCell(q.enr[li]) : '—'}</td><td>${tt ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(q.links[0][0])}/" target="_blank" rel="noopener">${esc(shorten(tt.t, 80))}</a><small>${esc([tt.j, tt.y].filter(Boolean).join(', '))}</small>` : '<span class="note">—</span>'}</td></tr>`; }).join('');
      genes = `<div class="note" style="margin:0 0 6px">Genes of this set that contribute most to its score in ${esc(typeNoun(t))} cells (the genes of the plot above; choose the cell type there)</div><div class="table-wrap" style="max-height:360px" data-scroll-id="gs-lit-genes"><table class="table compact" id="gs-lit-genes"><thead><tr><th>Gene</th><th class="num">Pancreatic cancer papers</th><th class="num">Papers in ${esc(typeNoun(t))} cells</th><th class="num">Expected</th><th class="num">Observed ÷ expected</th><th>Most recent paper</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="empty">No gene to list for this cell type.</td></tr>'}</tbody></table></div>`;
    }
  }
  return shell(`${metrics}${LIT_HOWTO_HTML}<div class="grid halves" style="margin-top:14px"><div><div class="note" style="margin:0 0 6px">All member genes together, each paper counted once</div>${litTypeTable(L.cellTypes, obs, exp, enr, top)}</div><div>${genes}</div></div><p class="note">${esc(LIT_READING)} A gene set is counted on the papers of all its member genes; large sets collect many papers, so compare the ratios, not the counts.</p>`);
}
function geneRows(d) {
  const types = d.cellTypes, info = d.markerInfo || {}, de = new Map((d.comparison?.de?.table || []).map(r => [r.gene, r]));
  return Object.keys(d.geneExpression).map(g => {
    const v = d.geneExpression[g], b = argmax(v), others = v.filter((x, i) => i !== b && Number.isFinite(x));
    const mo = others.length ? others.reduce((a, x) => a + x, 0) / others.length : NaN;
    return { gene: g, v, b, top: b >= 0 ? types[b].name : null, max: b >= 0 ? v[b] : null, lead: b >= 0 && Number.isFinite(mo) ? v[b] - mo : null, info: info[g] || null, de: de.get(g) || null };
  });
}
/* Per-sample values by comparison group; lines join the two samples of one patient. */
function groupStrip(vals, yLabel, { width = 360, height = 210 } = {}) {
  const d = state.data, gs = groupNames(d).length ? groupNames(d) : ['All samples'];
  const grpOf = s => (d.comparison ? d.comparison.samples?.[s.id] : 'All samples');
  const pts = d.samples.map(s => ({ s, v: vals[s.id], g: grpOf(s), p: patientOf(s) })).filter(x => Number.isFinite(x.v) && gs.includes(x.g));
  if (!pts.length) return '<p class="note">No per-sample values are available.</p>';
  const lo = Math.min(...pts.map(x => x.v)), hi = Math.max(...pts.map(x => x.v)), pad = (hi - lo) * .1 || 1;
  const y0 = lo >= 0 ? Math.max(0, lo - pad) : lo - pad, y1 = hi + pad, L = 54, W = width, T = 10, H = height, cw = W / gs.length;
  const Y = v => T + H - (v - y0) / (y1 - y0) * H, X = (k, i) => L + cw * (k + .5) + ((((i + 1) * 7919) % 97) / 97 - .5) * cw * .3;
  const pos = pts.map((x, i) => ({ ...x, x: X(gs.indexOf(x.g), i), y: Y(x.v) }));
  const pairs = new Map(); for (const q of pos) if (q.p) { if (!pairs.has(q.p)) pairs.set(q.p, []); pairs.get(q.p).push(q); }
  const lines = [...pairs.values()].filter(a => a.length === 2 && a[0].g !== a[1].g).map(([a, b]) => `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#98a2b3" stroke-opacity=".55"/>`).join('');
  const dots = pos.map(q => `<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="4" fill="${groupColor(d, q.g)}" fill-opacity=".85" stroke="#fff" stroke-width=".8"><title>${esc(sampleLabel(q.s.id))}${q.p ? ` · patient ${esc(q.p)}` : ''}: ${sig(q.v)}</title></circle>`).join('');
  const med = gs.map((g, k) => { const v = pts.filter(x => x.g === g).map(x => x.v).sort((a, b) => a - b); if (!v.length) return ''; const m = v.length % 2 ? v[v.length >> 1] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2, x = L + cw * (k + .5); return `<line x1="${(x - cw * .28).toFixed(1)}" x2="${(x + cw * .28).toFixed(1)}" y1="${Y(m).toFixed(1)}" y2="${Y(m).toFixed(1)}" stroke="#0b1f33" stroke-width="2"><title>Median ${esc(g)}: ${sig(m)}</title></line>`; }).join('');
  const axis = ticksFor(y0, y1, 5).map(v => `<line x1="${L - 5}" x2="${L}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#98a2b3"/><text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${sig(v)}</text>`).join('');
  const xl = gs.map((g, k) => `<text x="${(L + cw * (k + .5)).toFixed(1)}" y="${T + H + 17}" text-anchor="middle" fill="#344054">${esc(g)} (n = ${pts.filter(x => x.g === g).length})</text>`).join('');
  return `<svg class="svgplot" viewBox="0 0 ${L + W + 8} ${T + H + 30}" role="img" aria-label="${esc(yLabel)} by group"><g font-size="11.5" fill="#667085">${axis}<line x1="${L}" x2="${L}" y1="${T}" y2="${T + H}" stroke="#98a2b3"/><line x1="${L}" x2="${L + W}" y1="${T + H}" y2="${T + H}" stroke="#98a2b3"/>${xl}<text class="axis-title" transform="translate(13 ${T + H / 2}) rotate(-90)" text-anchor="middle" fill="#344054">${esc(yLabel)}</text></g>${lines}${dots}${med}</svg>
    <p class="note" style="margin:4px 0 0">Points: samples${pairs.size ? '; gray lines join the tumor and adjacent sample of one patient' : ''}; black bars: group medians.</p>`;
}
function viewGenes() {
  const d = state.data, c = d.comparison, rowsAll = geneRows(d), types = d.cellTypes, hasDE = !!c;
  if (!c && d.comparisonUrl && !String(d.lazy.comparison || '').startsWith('error')) ensureLazy('comparison', checkComparison);
  const intro = `${hasDE ? 'Genes that differ between the two groups of bulk samples, and the' : 'The'} mean estimated expression of pancreatic and PDAC marker genes in each cell type of the estimated single-cell profiles. Select a column header to sort and a gene to see its plots on the right.`;
  const head = pageHead('Gene expression', hasDE ? 'Differential expression and marker genes' : 'Marker genes across cell types', intro,
    `<div class="controls">${hasDE ? `<button class="btn btn-secondary" data-action="exportde">${icon('download')} Differential expression (CSV)</button>` : ''}${rowsAll.length ? `<button class="btn btn-secondary" data-action="exportgenes">${icon('download')} Marker genes (CSV)</button>` : ''}</div>`);
  if (!rowsAll.length && !hasDE) return `${head}<div class="card"><div class="empty">This result does not include marker-gene summaries.</div></div>`;
  let deBlock = '';
  if (hasDE) {
    const de = c.de, s = de.summary || {};
    const kpis = [[c.test, de.nTest, 'Samples in the test group'], [c.reference, de.nReference, 'Samples in the reference group'], ['Genes tested', s.n_padj_defined ?? s.n_genes_tested, `${num(de.genesAfterFilter)} genes passed the expression filter`],
      ['Differentially expressed genes', s.n_sig, `Adjusted p < 0.05: ${num(s.n_sig_up)} higher and ${num(s.n_sig_down)} lower in ${c.test}`]]
      .map(([k, v, f]) => `<div class="card kpi"><div class="k-label">${esc(k)}</div><div class="k-value">${num(v)}</div><div class="k-foot">${esc(f)}</div></div>`).join('');
    const notices = (c.notices || []).map(n => `<div class="alert warn">${esc(n)}</div>`).join('')
      + (d.origin === 'demo' && DEMO().compareNote ? `<div class="banner" role="note" id="compare-note">${icon('info')}<div>${esc(DEMO().compareNote)}</div></div>` : '');
    deBlock = `${notices}<div class="grid kpis">${kpis}</div>
    <div class="section">${compareMethods(c, ['de'])}</div>
    <h2 class="section-title" id="genes-de">Differential expression: ${esc(c.test)} vs ${esc(c.reference)} (bulk samples)</h2>
    <div class="split" id="de-split"><div class="col-stack">${volcanoCard(c)}${deTableCard(c)}</div><aside class="detail">${deGeneDetail(d, c)}</aside></div>`;
  }
  let markerBlock = '';
  if (rowsAll.length) {
    const cols = { gene: { v: r => r.gene }, known: { v: r => r.info?.marks ? `${r.info.order ?? 99}`.padStart(3, '0') + r.info.marks : null }, top: { v: r => (r.top ? typeLabel(r.top) : null) }, max: { v: r => r.max }, lead: { v: r => r.lead }, fc: { v: r => r.de?.log2FCShrunk ?? null }, padj: { v: r => r.de?.padj ?? null } };
    const defKey = d.markerInfo ? 'known' : 'gene', rows = sortRows('genes', rowsAll, cols, defKey, 1);
    const sel = rowsAll.find(r => r.gene === state.gene) || rows[0]; state.gene = sel.gene;
    const th = (k, l, o = {}) => sortTh('genes', k, l, { defKey, defDir: 1, ...o });
    const body = rows.map(r => `<tr class="clickable${r.gene === sel.gene ? ' selected' : ''}" data-gene="${esc(r.gene)}"><td><button type="button" class="name-link gene" data-gene="${esc(r.gene)}">${esc(r.gene)}</button>${r.info?.name ? `<small>${esc(r.info.name)}</small>` : ''}</td>
      <td>${r.info?.marks ? esc(r.info.marks) : '<span class="note">—</span>'}</td><td>${r.top ? `<span class="swatch" style="background:${typeColor(r.top, r.b)};margin-right:6px"></span>${esc(typeLabel(r.top))}` : '—'}</td>
      <td class="num">${sig(r.max)}</td><td class="num">${sig(r.lead)}</td>${hasDE ? `<td class="num">${r.de ? `<span class="heat" style="${diverge(r.de.log2FCShrunk, 3)}">${sig(r.de.log2FCShrunk)}</span>` : '—'}</td><td class="num">${r.de ? fmtP(r.de.padj) : '—'}</td>` : ''}</tr>`).join('');
    const table = `<section class="card"><div class="card-head"><div><div class="card-title">Marker genes</div><div class="card-sub">${plural(rowsAll.length, 'gene')} · estimated expression in log(1 + counts per 10,000)${hasDE ? `; bulk fold change ${esc(c.test)} vs ${esc(c.reference)} from the comparison above` : ''}</div></div></div>
      <div class="card-body table-wrap tall" data-scroll-id="genes-table"><table class="table"><thead><tr>${th('gene', 'Gene')}${th('known', 'Known marker of')}${th('top', 'Highest estimated in')}${th('max', 'Highest value', { num: true, title: 'Mean estimated expression in that cell type' })}${th('lead', 'Lead over other types', { num: true, title: 'Highest value minus the mean of the other cell types' })}${hasDE ? `${th('fc', 'Bulk log2 fold change', { num: true, title: `Shrunken log2 fold change, ${c.test} vs ${c.reference}` })}${th('padj', 'Adjusted p', { num: true })}` : ''}</tr></thead><tbody>${body}</tbody></table></div></section>`;
    markerBlock = `<h2 class="section-title" id="genes-markers">Marker genes across cell types</h2>
    <div class="split" id="marker-split">${table}<aside class="detail">${geneDetail(d, sel)}</aside></div>
    ${celltypeLiteratureCard(d)}
    <p class="note">Estimated profiles are assigned to the nine cell types of the healthy pancreas reference. Malignant epithelial cells and cancer-associated fibroblasts have no reference type of their own; their expression is attributed mostly to the ductal and stellate types. Marker roles follow the reference annotation and the PDAC literature.</p>`;
  }
  return `${head}${oodBanner(d)}${deBlock}${markerBlock}`;
}
function geneDetail(d, r) {
  const types = d.cellTypes, vals = r.v.map((v, i) => ({ v, t: types[i] })).filter(x => Number.isFinite(x.v)).sort((a, b) => b.v - a.v), vmax = Math.max(...vals.map(x => x.v), 1e-9);
  const bx = d.bulkExpression, bulk = bx?.values?.[r.gene] ? Object.fromEntries(bx.samples.map((s, i) => [s, bx.values[r.gene][i]])) : null, de = r.de;
  return `<section class="card"><div class="card-head"><div><div class="card-title"><i>${esc(r.gene)}</i></div><div class="card-sub">${esc(r.info?.name || '')}${r.info?.marks ? ` · marker of ${esc(r.info.marks.toLowerCase())}` : ''}</div></div><a class="badge" href="https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(r.gene)}%5Bsym%5D+AND+human%5Borgn%5D" target="_blank" rel="noopener">NCBI Gene</a></div>
    <div class="card-body">${r.info?.note ? `<p class="lead">${esc(r.info.note)}</p>` : ''}
      <div class="note" style="margin:0 0 6px">Estimated expression by cell type, log(1 + counts per 10,000)</div>${vals.map(x => `<div class="hbar"><span>${esc(x.t.label)}</span><span class="track"><i style="width:${(Math.max(0, x.v) / vmax * 100).toFixed(1)}%;background:${x.t.color}"></i></span><b>${sig(x.v)}</b></div>`).join('')}
      ${bulk ? `<div class="note" style="margin:18px 0 4px">Measured bulk expression in each sample, ${esc(bx.unit || 'log2(normalized count + 1)')}</div>${groupStrip(bulk, bx.unitShort || 'log2 normalized count', { width: 330, height: 190 })}` : ''}
      ${de ? `<div class="metrics small" style="margin-top:14px"><div class="metric"><small>Bulk log2 fold change</small><b>${sig(de.log2FCShrunk)}</b></div><div class="metric"><small>Adjusted p</small><b>${fmtP(de.padj)}</b></div><div class="metric"><small>Direction</small><b>${de.direction === 'up' ? `Higher in ${esc(d.comparison.test)}` : de.direction === 'down' ? `Lower in ${esc(d.comparison.test)}` : 'Not significant'}</b></div></div>` : ''}
      <p class="note">Bulk differences between the groups combine changes in cell-type composition and changes within cells; the estimated cell-type values above are not compared between the groups.</p>
      ${geneLiterature(d, r.gene)}</div></section>`;
}
function exportGenes() {
  const d = state.data, types = d.cellTypes.map(t => t.name), rows = [['gene', 'known_marker_of', 'highest_estimated_in', ...types.map(t => `expression_${t}`), 'log2_fold_change_shrunk', 'padj']];
  for (const r of geneRows(d)) rows.push([r.gene, r.info?.marks || '', r.top || '', ...r.v, r.de?.log2FCShrunk ?? '', r.de?.padj ?? '']);
  download('cellaris-marker-genes.csv', rows.map(x => x.map(csvCell).join(',')).join('\n'));
}

/* ---------- Shared helpers for gene sets and comparisons ---------- */
const GS_ORDER = ['H', 'PROGENY', 'REACTOME', 'WIKIPATHWAYS', 'GOBP'];
const GS_LABEL = { H: 'Hallmark', PROGENY: 'PROGENy', REACTOME: 'Reactome', WIKIPATHWAYS: 'WikiPathways', GOBP: 'GO Biological Process' };
const GS_DB = {
  H: { name: 'MSigDB Hallmark', version: 'MSigDB v2026.2.Hs', what: 'well-defined biological states and processes; each Hallmark set summarizes several overlapping MSigDB sets', cite: 'Liberzon et al., Cell Systems 2015', doi: '10.1016/j.cels.2015.12.004', home: 'https://www.gsea-msigdb.org/gsea/msigdb/human/genesets.jsp?collection=H' },
  PROGENY: { name: 'PROGENy', version: 'model_human_full, 500 top-weighted genes per pathway', what: 'signaling pathways, each defined by the genes whose expression responds when the pathway is perturbed (a weighted “footprint”), not by the pathway’s own members', cite: 'Schubert et al., Nature Communications 2018', doi: '10.1038/s41467-017-02391-6', home: 'https://saezlab.github.io/progeny/' },
  REACTOME: { name: 'Reactome', version: 'Reactome release 97, via MSigDB C2:CP:Reactome', what: 'expert-curated human pathways and reactions', cite: 'Milacic et al., Nucleic Acids Research 2024', doi: '10.1093/nar/gkad1025', home: 'https://reactome.org' },
  WIKIPATHWAYS: { name: 'WikiPathways', version: 'release 2026-10-10, via MSigDB C2:CP:WikiPathways', what: 'community-curated pathways', cite: 'Agrawal et al., Nucleic Acids Research 2024', doi: '10.1093/nar/gkad960', home: 'https://www.wikipathways.org' },
  GOBP: { name: 'Gene Ontology, Biological Process', version: 'GO release 2026-07-26, via MSigDB C5:GO:BP', what: 'biological processes annotated to genes; overlapping terms are grouped into themes and one term per theme is listed', cite: 'The Gene Ontology Consortium, Genetics 2023', doi: '10.1093/genetics/iyad031', home: 'https://geneontology.org' },
};
function setLinks(s) {
  if (s.collection === 'PROGENY') return [['PROGENy', GS_DB.PROGENY.home]];
  const out = [['MSigDB', `https://www.gsea-msigdb.org/gsea/msigdb/human/geneset/${encodeURIComponent(s.id)}.html`]], sid = String(s.sourceId || '');
  if (s.collection === 'REACTOME' && /^R-HSA-\d+$/.test(sid)) out.push(['Reactome', `https://reactome.org/content/detail/${sid}`]);
  if (s.collection === 'WIKIPATHWAYS' && /^WP\d+$/.test(sid)) out.push(['WikiPathways', `https://www.wikipathways.org/pathways/${sid}`]);
  if (s.collection === 'GOBP' && /^GO:\d{7}$/.test(sid)) out.push(['QuickGO', `https://www.ebi.ac.uk/QuickGO/term/${sid}`]);
  return out;
}
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
const csvCell = v => { let s = String(v ?? ''); if (/^[=+@-]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
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
/* Horizontal bars around zero. items: [{name, v, color, faint, mark, note, hi}] */
function divergingBars(items, label, { labelWidth = 150, width = 420, row = 24 } = {}) {
  const L = labelWidth, W = width, T = 8, H = Math.max(1, items.length) * row;
  const m = Math.max(...items.map(x => Math.abs(x.v)).filter(Number.isFinite), 1e-9);
  const X = v => L + W / 2 + v / m * (W / 2 - 40);
  const body = items.map((x, i) => {
    const y = T + i * row, mid = y + row / 2 + 4, ok = Number.isFinite(x.v), c = x.color || (x.v >= 0 ? '#b42318' : '#175cd3');
    return (x.hi ? `<rect x="0" y="${y + 1}" width="${L + W}" height="${row - 2}" rx="4" fill="#fef3f2"/>` : '') + `<text x="${L - 8}" y="${mid}" text-anchor="end"${x.hi ? ' font-weight="600" fill="#1d2939"' : ''}><title>${esc(x.name)}</title>${esc(shorten(x.name, Math.round(L / 6.4)))}</text>` + (ok
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
/* Per-sample bulk expression and mean normalized count of every tested gene (demo: loaded when the comparison opens). */
function checkBulkAll(b) {
  if (!b || !Array.isArray(b.genes) || !Array.isArray(b.samples) || !Array.isArray(b.values) || b.values.length !== b.genes.length || !Array.isArray(b.baseMean) || b.baseMean.length !== b.genes.length) throw new Error('Invalid expression table.');
  if (b.genes.length > 80000) throw new Error('The expression table is too large to display.');
  return { ...b, index: new Map(b.genes.map((g, i) => [g, i])) };
}
function bulkOfGene(d, gene) {
  const bx = d.bulkExpression, all = d.bulkAll, i = all ? all.index.get(gene) : undefined;
  if (bx?.values?.[gene]) return { samples: bx.samples, values: bx.values[gene], unit: bx.unit, unitShort: bx.unitShort, baseMean: i !== undefined ? all.baseMean[i] : null };
  if (i !== undefined) return { samples: all.samples, values: all.values[i], unit: all.unit || bx?.unit, unitShort: all.unitShort || bx?.unitShort, baseMean: all.baseMean[i] };
  return null;
}
async function loadBulkAll() {
  const d = state.data;
  if (d.bulkAll || !d.bulkAllUrl || d.lazy.bulkAll) return;
  d.lazy.bulkAll = 'loading';
  try {
    const r = await fetch(d.bulkAllUrl); if (!r.ok) throw new Error(`HTTP ${r.status}`);
    d.bulkAll = checkBulkAll(await r.json()); d.lazy.bulkAll = 'done';
  } catch (e) { d.lazy.bulkAll = `error: ${e.message}`; }
  /* redraw only when the selected gene was waiting for these values */
  const c = d.comparison, gene = c && (state.cmp.gene || deRows(c)[0]?.gene);
  if (state.data === d && state.view === 'genes' && gene && !(d.bulkExpression?.values?.[gene] && c.de.table.some(x => x.gene === gene))) rerender();
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
  if (state.data === d) rerender();
}
/* Notice for samples that the healthy reference describes poorly. Not shown on the public demo, where each sample's
   fit stays in the Samples tab; shown for analyses of a user's own data. */
function oodBanner(d) {
  const comp = d.comparison?.composition; if (!comp?.banner || d.origin === 'demo') return '';
  const counts = Object.entries(comp.bannerCounts || {}).map(([g, t]) => `${esc(t)} ${esc(g)}`).join('; ');
  return `<div class="banner warn" role="note">${icon('info')}<div><b>Samples outside the healthy reference.</b> ${esc(comp.banner)}${counts ? ` Flagged samples: ${counts}.` : ''}</div></div>`;
}

/* ---------- Signaling and functional pathways ---------- */
function genesetRows(g, on) {
  const q = state.gs.search;
  let rows = on.flatMap(c => (g.collections[c].sets || []).map(s => ({ ...s, collection: c })));
  if (q) rows = rows.filter(s => `${s.label} ${s.id} ${s.theme || ''} ${(s.topGenes || []).flat().join(' ')}`.toLowerCase().includes(q));
  for (const s of rows) { const v = s.activity.filter(Number.isFinite); s.range = v.length > 1 ? Math.max(...v) - Math.min(...v) : null; s.best = argmax(s.activity); }
  return rows;
}
function sourceMethodCard(g) {
  const d = state.data, cols = GS_ORDER.filter(c => g.collections[c]), m = g.method || {};
  const dbRows = cols.map(c => { const k = g.collections[c], db = GS_DB[c]; return `<tr><td><b style="font-weight:600">${esc(db.name)}</b><small>${esc(db.what)}</small></td><td>${esc(db.version)}<small>${esc(k.release || '')}</small></td><td class="num">${num(k.scorableSets)}${k.groupedByTheme ? `<small>${num(k.shownSets)} themes listed</small>` : ''}</td><td><a href="${esc(db.home)}" target="_blank" rel="noopener">${esc(db.home.replace(/^https:\/\//, '').replace(/\/.*$/, ''))}</a><small>${esc(db.cite)}</small></td></tr>`; }).join('');
  return `<section class="card source-card"><div class="card-head"><div><div class="card-title">Where these pathways come from</div><div class="card-sub">Curated gene-set databases scored on the estimated single-cell profiles. Unlike the metabolic pathways, no metabolic model is involved.</div></div><span class="badge accent">${icon('database')} ${num(cols.length)} databases</span></div>
    <div class="card-body"><div class="grid halves">
      <div class="table-wrap"><table class="table compact"><thead><tr><th>Database</th><th>Version</th><th class="num">Sets scored</th><th>Source</th></tr></thead><tbody>${dbRows}</tbody></table></div>
      <div class="prose method-steps"><ol>
        <li><b>Expression.</b> ${esc(m.expression ? m.expression.charAt(0).toUpperCase() + m.expression.slice(1) : 'log(1 + counts per 10,000) of each estimated single-cell profile')}, over the ${num(g.scoringGenes)} genes of the pancreas reference.</li>
        <li><b>Score.</b> For each profile and gene set, a univariate linear model regresses the profile's expression on set membership (PROGENy: on the footprint weights); the activity is the model's t-value (method of decoupler; Badia-i-Mompel et al., Bioinformatics Advances 2022). Positive: the set's genes are expressed above the profile's average gene.</li>
        <li><b>Summarize.</b> Mean per sample and cell type; the cell-type value is the mean over samples with at least 3 profiles of that type${g.perSampleAvailable ? '. Per-sample values are shown when a sample has at least 20 profiles of the cell type (10–19: low confidence)' : ''}.</li>
        <li><b>Top genes.</b> ${esc(g.topGenesDefinition || 'Not available for this result.')}</li>
      </ol><p class="note" style="margin:6px 0 0">Gene sets with fewer than ${num(g.minGenesPerSet || 5)} genes among the scoring genes are not scored. Scores are relative units: compare them between cell types and samples of this analysis, not with other analyses. Tumor-versus-adjacent differences are tested on the bulk data in <a href="#compare" data-view="compare">Bulk signaling</a> (fgsea and decoupler on DESeq2 statistics).</p></div>
    </div></div></section>`;
}
function viewSignaling() {
  const d = state.data, g = d.genesets;
  const intro = 'Activity of curated signaling and functional gene sets in each cell type of the estimated single-cell profiles. Select a column header to sort and a gene set to see its plots on the right.';
  const head = pageHead('Cell-type signaling', 'Signaling and functional pathways by cell type', intro, g ? `<div class="controls"><button class="btn btn-secondary" data-action="exportgenesets">${icon('download')} CSV</button></div>` : '');
  if (!g) {
    const st = d.lazy.genesets;
    if (d.genesetsUrl && !String(st || '').startsWith('error')) { ensureLazy('genesets', checkGenesets); return `${head}<div class="card"><div class="empty">Loading gene-set activity…</div></div>`; }
    return `${head}<div class="card"><div class="empty">${st ? `Gene-set activity could not be loaded (${esc(st.replace(/^error: /, ''))}).` : 'This result does not include signaling and functional pathway activity.'}</div></div>`;
  }
  const cols = GS_ORDER.filter(c => g.collections[c]);
  if (!cols.some(c => state.gs.on.has(c))) state.gs.on = new Set(cols.filter(c => g.collections[c].defaultOn).length ? cols.filter(c => g.collections[c].defaultOn) : cols.slice(0, 1));
  const on = cols.filter(c => state.gs.on.has(c)), types = g.cellTypes, all = genesetRows(g, on);
  const abs = all.flatMap(s => s.activity).filter(Number.isFinite).map(Math.abs).sort((a, b) => a - b);
  const m = abs.length ? abs[Math.min(abs.length - 1, Math.floor(abs.length * .95))] || abs[abs.length - 1] || 1 : 1;
  const sc = { label: { v: s => s.label }, db: { v: s => GS_LABEL[s.collection] }, cons: { v: s => CONSENSUS[s.consensus]?.[0] || null }, range: { v: s => s.range }, top: { v: s => (s.best >= 0 ? typeLabel(types[s.best]) : null) }, genes: { v: s => s.genesUsed } };
  types.forEach((t, i) => { sc[`t${i}`] = { v: s => s.activity[i] }; });
  const rows = sortRows('gs', all, sc, 'range', -1), shown = rows.slice(0, state.gs.limit);
  const sel = all.find(s => s.id === state.gs.set) || rows[0]; if (sel) state.gs.set = sel.id;
  const th = (k, l, o = {}) => sortTh('gs', k, l, { defKey: 'range', defDir: -1, ...o });
  const toggles = cols.map(c => { const k = g.collections[c], a = state.gs.on.has(c); return `<button class="${a ? 'active' : ''}" data-gscol="${c}" aria-pressed="${a}">${esc(k.label || GS_LABEL[c])}<small>${num(k.shownSets)}</small></button>`; }).join('');
  const topCell = s => { const tg = s.best >= 0 ? s.topGenes?.[s.best] : null; return tg?.length ? `<span class="genes">${esc(tg.slice(0, 3).join(', '))}</span><small>in ${esc(typeNoun(types[s.best]))}</small>` : '<span class="note">—</span>'; };
  const heatCell = (s, v, i) => `<td class="num"><span class="heat" style="${diverge(v, m)}" title="${esc(s.label)} · ${esc(typeLabel(types[i]))}: ${sig(v)}${s.topGenes?.[i]?.length ? ` · top genes: ${esc(s.topGenes[i].join(', '))}` : ''}">${sig(v)}</span></td>`;
  const table = `<table class="table gs-table"><thead><tr>${th('label', 'Gene set')}${th('db', 'Database')}${types.map((t, i) => th(`t${i}`, `<span class="swatch" style="background:${typeColor(t, i)};margin-right:4px"></span>${esc(typeLabel(t).replace(' (gamma)', ''))}`, { num: true, title: `Mean activity in ${typeNoun(t)} cells` })).join('')}${th('range', 'Range', { num: true, title: 'Highest minus lowest cell type' })}${th('top', 'Top genes (highest cell type)')}${th('cons', 'Consistency', { title: 'Agreement of related gene sets across databases' })}${th('genes', 'Genes used', { num: true, title: 'Member genes among the scoring genes' })}</tr></thead>
    <tbody>${shown.map(s => `<tr class="clickable${s.id === sel?.id ? ' selected' : ''}" data-gs="${esc(s.id)}" tabindex="0"><td><button type="button" class="name-link" data-gs="${esc(s.id)}">${esc(s.label)}</button><small>${esc(s.id)}${s.collection === 'GOBP' && s.theme ? ` · theme: ${esc(s.theme)}` : ''}</small></td><td><span class="badge db-${s.collection.toLowerCase()}">${esc(GS_LABEL[s.collection])}</span></td>${s.activity.map((v, i) => heatCell(s, v, i)).join('')}<td class="num">${sig(s.range)}</td><td>${topCell(s)}</td><td>${consensusBadge(s.consensus)}</td><td class="num">${num(s.genesUsed)} / ${num(s.libraryGenes)}</td></tr>`).join('') || `<tr><td colspan="${6 + types.length}" class="empty">No gene sets match the filter.</td></tr>`}</tbody></table>`;
  return `${head}${oodBanner(d)}
  <div class="split wide-left section"><section class="card"><div class="card-body" style="padding-bottom:6px"><div class="controls">
    <div class="toggle-chips" role="group" aria-label="Gene-set databases">${toggles}</div>
    <label class="search">${icon('search')}<input class="input" id="gs-search" type="search" placeholder="Search gene sets, themes or genes" value="${esc(state.gs.search)}" aria-label="Search gene sets"></label></div>
    <p class="note" style="margin:8px 0 0">${num(all.length)} gene sets · mean activity per cell type (relative units)${on.includes('GOBP') ? ' · GO Biological Process: one representative term per theme of overlapping terms' : ''}. Hover a value for the top genes in that cell type.</p></div>
    <div class="card-body table-wrap tall" style="padding-top:0" data-scroll-id="gs-table">${table}</div>
    <div class="card-foot">${scaleLegend(m, 'Activity score (relative units)')}${rows.length > shown.length ? `<button class="link-btn" data-action="gsmore">Show ${num(Math.min(60, rows.length - shown.length))} more of ${num(rows.length - shown.length)}</button>` : '<span></span>'}</div></section>
  <aside class="detail">${sel ? genesetDetail(g, sel, m) : ''}</aside></div>
  ${genesetLiteratureCard(d, g, sel)}
  <div class="section">${sourceMethodCard(g)}</div>`;
}
function genesetDetail(g, s, m) {
  const types = g.cellTypes, vals = s.activity.map((v, i) => ({ v, i })).filter(x => Number.isFinite(x.v));
  const hi = vals.length ? vals.reduce((a, b) => (b.v > a.v ? b : a)) : null, lo = vals.length ? vals.reduce((a, b) => (b.v < a.v ? b : a)) : null, db = GS_DB[s.collection];
  const bars = divergingBars(types.map((t, i) => ({ name: typeLabel(t), v: s.activity[i], color: typeColor(t, i), note: Number.isFinite(s.activity[i]) ? '' : 'too few profiles' })), 'Activity score (relative units)', { labelWidth: 100, width: 300 });
  const tg = s.topGenes ? types.map((t, i) => ({ t, i, genes: s.topGenes[i] || [] })).filter(x => Number.isFinite(s.activity[x.i])).sort((a, b) => s.activity[b.i] - s.activity[a.i]) : null;
  return `<section class="card"><div class="card-head"><div><div class="card-title">${esc(s.label)}</div><div class="card-sub">${esc(s.id)}${s.theme && s.theme !== s.label ? ` · theme: ${esc(s.theme)}` : ''}</div></div>${consensusBadge(s.consensus)}</div>
    <div class="card-body"><div class="source-line">${icon('database')}<div><b>${esc(db.name)}</b> · ${esc(db.version)}<br>${setLinks(s).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">View in ${esc(n)}</a>`).join(' · ')}</div></div>
      <div class="metrics small"><div class="metric"><small>Genes used</small><b>${num(s.genesUsed)} <span class="of">of ${num(s.libraryGenes)}</span></b></div><div class="metric"><small>Highest in</small><b>${esc(hi ? typeLabel(types[hi.i]) : '—')}</b></div><div class="metric"><small>Lowest in</small><b>${esc(lo ? typeLabel(types[lo.i]) : '—')}</b></div></div>
      <div class="note" style="margin:14px 0 4px">Mean activity by cell type</div>${bars}
      ${genesetTypePlots(g, s)}
      ${spatialPanel(state.data, 'set', s.id, s.label)}
      ${tg ? `<div class="note" style="margin:6px 0 4px">Top genes in each cell type (highest activity first)</div><table class="table compact topgenes"><tbody>${tg.map(x => `<tr><td><span class="swatch" style="background:${typeColor(x.t, x.i)};margin-right:6px"></span>${esc(typeLabel(x.t))}</td><td><span class="genes">${esc(x.genes.join(', ') || '—')}</span></td></tr>`).join('')}</tbody></table><p class="note">${esc(g.topGenesDefinition || '')}</p>` : '<p class="note">Top genes are not available for this result.</p>'}
      ${CONSENSUS[s.consensus] ? `<p class="note">${esc(CONSENSUS[s.consensus][0])}: ${esc(consensusHelp(s.consensus))}.</p>` : ''}
      <div class="detail-sub"><div class="note" style="margin:10px 0 4px;display:flex;justify-content:space-between;align-items:center"><span>Activity in each sample and cell type</span>${s.perSample ? `<button class="link-btn" data-action="exportgssamples">${icon('download')} CSV</button>` : ''}</div>${perSamplePlot(g, s)}</div></div></section>`;
}
/* Gene plots of a gene set in one cell type (below the cell-type breakdown): the member genes that contribute most to the
   score in that cell type, and the signaling pathway activity of that cell type. */
function checkGenesetGenes(b) {
  if (!b || !Array.isArray(b.genes) || !Array.isArray(b.expr) || b.expr.length !== b.genes.length || !Array.isArray(b.typeMean) || !Array.isArray(b.cellTypes) || !b.sets || typeof b.sets !== 'object') throw new Error('Invalid gene table.');
  return b;
}
function setGenesInType(gg, s, type) {
  const idx = gg.sets[s.id], ti = gg.cellTypes.indexOf(type); if (!idx || ti < 0) return [];
  const w = gg.weights?.[s.id], wm = gg.wMean?.[s.id] || 0, n = gg.cellTypes.length;
  return idx.map((gi, j) => {
    const e = gg.expr[gi], c = ((w ? w[j] : 1) - wm) * (e[ti] - gg.typeMean[ti]); let o = 0;
    for (let u = 0; u < n; u++) if (u !== ti) o += e[u];
    o /= n - 1;
    return { name: gg.genes[gi], c, v: (e[ti] - o) / Math.LN2, note: `expression ${sig(e[ti])} in this cell type, ${sig(o)} on average in the other cell types (log(1 + counts per 10,000))` };
  }).filter(x => x.c > 0).sort((a, b) => b.c - a.c).slice(0, gg.k || 12);
}
function genesetTypePlots(g, s) {
  const d = state.data, types = g.cellTypes, ok = types.map((t, i) => Number.isFinite(s.activity[i]));
  if (!ok.some(Boolean)) return '';
  let ti = types.indexOf(state.gs.type);
  if (ti < 0 || !ok[ti]) ti = Number.isInteger(s.best) && s.best >= 0 ? s.best : ok.indexOf(true);
  const t = types[ti], noun = typeNoun(t);
  const picker = `<div class="toggle-chips" role="group" aria-label="Cell type for the gene plots" id="gs-type">${types.map((x, i) => (ok[i] ? `<button class="${i === ti ? 'active' : ''}" data-gstype="${esc(x)}" aria-pressed="${i === ti}"><span class="swatch" style="background:${typeColor(x, i)}"></span>${esc(typeLabel(x).replace(' (gamma)', ''))}</button>` : '')).join('')}</div>`;
  const gg = d.genesetGenes, st = d.lazy.genesetGenes;
  let genes;
  if (gg) {
    const items = setGenesInType(gg, s, t);
    genes = items.length ? divergingBars(items, `Expression in ${noun} cells relative to the other cell types (log2)`, { labelWidth: 90, width: 300, row: 21 })
      : '<p class="note">No member gene of this set contributes positively to the score in this cell type.</p>';
  } else if (d.genesetGenesUrl && !String(st || '').startsWith('error')) { ensureLazy('genesetGenes', checkGenesetGenes); genes = '<p class="note">Loading the genes…</p>'; }
  else genes = `<p class="note">${st ? `The genes could not be loaded (${esc(String(st).replace(/^error: /, ''))}).` : 'Gene-level values are not available for this result.'}</p>`;
  const prog = (g.collections.PROGENY?.sets || []).filter(x => Number.isFinite(x.activity[ti])).map(x => ({ name: x.label, v: x.activity[ti], hi: x.id === s.id })).sort((a, b) => b.v - a.v);
  return `<div class="detail-sub" id="gs-type-plots"><div class="note" style="margin:10px 0 6px">Genes and signaling in one cell type. Choose the cell type:</div>${picker}
    <div class="note" style="margin:12px 0 4px" id="gs-genes-title">Genes of this set in ${esc(noun)} cells: the member genes that contribute most to the score there (the first five are the top genes listed below)</div><div id="gs-genes">${genes}</div>
    ${prog.length ? `<div class="note" style="margin:12px 0 4px" id="gs-progeny-title">Signaling pathway activity in ${esc(noun)} cells (PROGENy, ${num(prog.length)} pathways${prog.some(x => x.hi) ? '; the selected pathway is highlighted' : ''})</div><div id="gs-progeny">${divergingBars(prog, 'Activity score (relative units)', { labelWidth: 100, width: 300, row: 21 })}</div>` : ''}</div>`;
}
function perSamplePlot(g, s) {
  if (!g.perSampleAvailable) return '<p class="note">Per-sample values are not available for this result: its estimated profiles do not carry sample-specific expression.</p>';
  if (!s.perSample) return '<p class="note">Per-sample values are shown for Hallmark and PROGENy gene sets. For the other databases they are included in the results download (folder pathway_activity).</p>';
  const types = g.cellTypes, samples = g.samples || [], cnt = g.profilesPerUnit || [], pts = [];
  s.perSample.forEach((row, si) => row.forEach((v, ti) => { if (Number.isFinite(v)) pts.push({ v, si, ti, low: (cnt[si]?.[ti] ?? 99) < 20 }); }));
  if (!pts.length) return '<p class="note">No sample and cell-type combination has enough profiles for this gene set.</p>';
  const lo = Math.min(...pts.map(p => p.v)), hi = Math.max(...pts.map(p => p.v)), pad = (hi - lo) * .08 || 1, y0 = lo - pad, y1 = hi + pad;
  const L = 54, W = 420, T = 10, H = 230, cw = W / types.length, Y = v => T + H - (v - y0) / (y1 - y0) * H;
  const jit = (si, ti) => ((((si + 1) * 9301 + (ti + 1) * 49297) % 233280) / 233280 - .5) * cw * .56;
  const dots = pts.map(p => { const c = typeColor(types[p.ti], p.ti), x = L + cw * (p.ti + .5) + jit(p.si, p.ti); return `<circle cx="${x.toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.2" fill="${p.low ? '#fff' : c}" fill-opacity="${p.low ? 1 : .8}" stroke="${c}" stroke-width="1.2"><title>${esc(sampleLabel(samples[p.si]))} · ${esc(typeLabel(types[p.ti]))}: ${sig(p.v)} (${num(cnt[p.si]?.[p.ti])} profiles${p.low ? ', low confidence' : ''})</title></circle>`; }).join('');
  const axis = ticksFor(y0, y1, 5).map(v => `<line x1="${L - 5}" x2="${L}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#98a2b3"/><text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${sig(v)}</text>`).join('');
  const zero = y0 < 0 && y1 > 0 ? `<line x1="${L}" x2="${L + W}" y1="${Y(0).toFixed(1)}" y2="${Y(0).toFixed(1)}" stroke="#d0d5dd" stroke-dasharray="3 3"/>` : '';
  const xl = types.map((t, i) => `<text transform="translate(${(L + cw * (i + .5)).toFixed(1)} ${T + H + 12}) rotate(-35)" text-anchor="end">${esc(typeLabel(t).replace(' (gamma)', ''))} (${pts.filter(p => p.ti === i).length})</text>`).join('');
  return `<svg class="svgplot" viewBox="0 0 ${L + W + 8} ${T + H + 92}" role="img" aria-label="Per-sample activity of ${esc(s.label)}"><g font-size="11" fill="#667085">${axis}${zero}<line x1="${L}" x2="${L}" y1="${T}" y2="${T + H}" stroke="#98a2b3"/><line x1="${L}" x2="${L + W}" y1="${T + H}" y2="${T + H}" stroke="#98a2b3"/>${xl}
    <text class="axis-title" transform="translate(13 ${T + H / 2}) rotate(-90)" text-anchor="middle" fill="#344054">Activity (relative units)</text><text class="axis-title" x="${L + W / 2}" y="${T + H + 86}" text-anchor="middle" fill="#344054">Cell type (samples shown); one point per sample</text></g>${dots}</svg>
    <div class="legend static"><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#667085"/></svg>20 or more profiles</span><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#fff" stroke="#667085" stroke-width="1.2"/></svg>10–19 profiles (low confidence)</span><span>Fewer than 10: not shown</span></div>${state.data.comparison ? '<p class="note">Points are not grouped by comparison group: differences between the groups within a cell type were not validated for this dataset and are not tested.</p>' : ''}`;
}
async function exportGenesets() {
  const d = state.data; if (!d.genesets && d.genesetsUrl) await ensureLazy('genesets', checkGenesets);
  const g = d.genesets; if (!g) return toast('This result has no gene-set activity.');
  const on = GS_ORDER.filter(c => g.collections[c] && state.gs.on.has(c));
  const rows = [['database', 'database_version', 'gene_set', 'source_id', 'label', 'theme', 'consistency', 'genes_used', 'library_genes', ...g.cellTypes.map(t => `activity_${t}`), ...(g.topGenesDefinition ? g.cellTypes.map(t => `top_genes_${t}`) : [])]];
  for (const c of on) for (const s of g.collections[c].sets) rows.push([GS_DB[c].name, GS_DB[c].version, s.id, s.sourceId || '', s.label, s.theme, CONSENSUS[s.consensus]?.[0] || '', s.genesUsed, s.libraryGenes, ...s.activity, ...(g.topGenesDefinition ? g.cellTypes.map((t, i) => (s.topGenes?.[i] || []).join(';')) : [])]);
  download('cellaris-geneset-activity.csv', rows.map(r => r.map(csvCell).join(',')).join('\n'));
}
function exportGenesetSamples() {
  const g = state.data.genesets; if (!g) return;
  const s = GS_ORDER.flatMap(c => g.collections[c]?.sets || []).find(x => x.id === state.gs.set);
  if (!s?.perSample) return toast('Per-sample values are not available for this gene set.');
  const rows = [['gene_set', 'sample', 'cell_type', 'profiles', 'reliability', 'activity']];
  s.perSample.forEach((row, si) => row.forEach((v, ti) => { const n = g.profilesPerUnit?.[si]?.[ti] ?? ''; rows.push([s.id, g.samples[si], g.cellTypes[ti], n, n === '' ? '' : n >= 20 ? 'shown' : n >= 10 ? 'low confidence' : 'withheld', v]); }));
  download(`cellaris-${s.id.toLowerCase()}-per-sample.csv`, rows.map(r => r.map(csvCell).join(',')).join('\n'));
}

/* ---------- Group comparison ---------- */
function compareMethods(c, parts = ['de', 'enrichment', 'progeny', 'composition']) {
  const de = c.de, m = c.methods || {};
  const li = {
    de: `<li><b>Differential expression</b>: ${esc(m.de || 'DESeq2 negative binomial model (PyDESeq2), Wald test')}; model ${esc(de.design === 'covariate + group' ? 'patient + group, so each tumor is compared with adjacent pancreas from the same patient' : 'group')}; ${esc(de.sizeFactors?.chosen === 'positive counts' ? 'size factors from positive counts' : 'median-of-ratios size factors')}; fold changes shrunken toward zero for low-count genes; adjusted p: Benjamini–Hochberg false discovery rate.</li>`,
    enrichment: `<li><b>Pathway enrichment</b>: ${esc(m.enrichment || 'fgsea (multilevel) on the DESeq2 Wald statistics of all tested genes')}; gene sets with 15–500 genes from MSigDB Hallmark, Reactome, WikiPathways and GO Biological Process.</li>`,
    progeny: `<li><b>Signaling activity (PROGENy)</b>: ${esc(m.progeny || 'multivariate linear model (decoupler) of the Wald statistics on the PROGENy footprint weights, 500 genes per pathway')}.</li>`,
    composition: `<li><b>Composition by group</b>: ${esc(c.composition?.test || 'two-sided rank-sum test per cell type, adjusted across cell types')} on the estimated cell-type fractions.</li>`,
  };
  return `<details class="advanced method-card" open><summary>How the groups are compared</summary><ul class="plain" style="margin-top:8px">${parts.map(k => li[k]).join('')}
    <li>All tests use the bulk samples. Cell-type-level group comparisons are not shown for this dataset.</li></ul></details>`;
}
function viewCompare() {
  const d = state.data, c = d.comparison;
  const intro = 'Pathway-level differences between two groups of bulk samples: gene-set enrichment, signaling pathway activity and themes that agree across databases. Select a column header to sort and a gene set to see its plots on the right.';
  if (!c) {
    const st = d.lazy.comparison;
    if (d.comparisonUrl && !String(st || '').startsWith('error')) { ensureLazy('comparison', checkComparison); return `${pageHead('Bulk signaling', 'Bulk signaling', intro)}<div class="card"><div class="empty">Loading the comparison…</div></div>`; }
    return `${pageHead('Bulk signaling', 'Bulk signaling', intro)}<section class="card"><div class="card-body prose"><p>${st ? `The comparison could not be loaded (${esc(st.replace(/^error: /, ''))}).` : 'This analysis does not include a group comparison.'}</p>
      <p>To compare groups, choose <b>New analysis</b>, upload your counts, open <b>Compare two groups</b> and assign samples to a test group and a reference group (at least 2 samples each).</p>
      <div class="controls"><button class="btn btn-primary" data-action="new">New analysis</button>${d.origin !== 'demo' ? '<button class="btn btn-secondary" data-action="demo">Open the PDAC demo</button>' : ''}</div></div></section>`;
  }
  const de = c.de, P = c.pathways || {}, cols = Object.values(P.collections || {});
  const nSig = cols.reduce((a, k) => a + (k.significant || 0), 0), nTested = cols.reduce((a, k) => a + (k.tested || 0), 0), nThemes = (P.themes || []).length;
  const kpis = [[c.test, de.nTest, 'Samples in the test group'], [c.reference, de.nReference, 'Samples in the reference group'],
    ['Enriched gene sets', nSig, `Adjusted p < 0.05, of ${num(nTested)} tested in ${plural(cols.length, 'database')}`],
    ['Themes consistent across databases', nThemes, 'Related gene sets that change the same way in more than one database']]
    .map(([k, v, f]) => `<div class="card kpi"><div class="k-label">${esc(k)}</div><div class="k-value">${num(v)}</div><div class="k-foot">${esc(f)}</div></div>`).join('');
  const notices = (c.notices || []).map(n => `<div class="alert warn">${esc(n)}</div>`).join('')
    + (d.origin === 'demo' && DEMO().compareNote ? `<div class="banner" role="note" id="compare-note">${icon('info')}<div>${esc(DEMO().compareNote)}</div></div>` : '');
  return `${pageHead('Bulk signaling', `${c.test} vs ${c.reference}`, intro, `<div class="controls"><button class="btn btn-secondary" data-action="exportenrich">${icon('download')} Pathways (CSV)</button></div>`)}
  ${oodBanner(d)}${notices}
  <div class="grid kpis">${kpis}</div>
  <div class="section">${compareMethods(c, ['enrichment', 'progeny'])}</div>
  <h2 class="section-title">Themes and signaling pathways</h2>
  <div class="grid two section">${themesCard(c)}${progenyCard(c)}</div>
  <h2 class="section-title">Pathway enrichment</h2>
  ${enrichmentSplit(c)}
  <p class="note">Bulk comparisons combine differences in composition with differences within cell types. Gene-level results are in <a href="#genes" data-view="genes">Gene expression</a>, composition by group in <a href="#samples" data-view="samples">Samples</a>, and activity by cell type in <a href="#signaling" data-view="signaling">Cell-type signaling</a>.</p>`;
}
function deRows(c) {
  const q = state.cmp.geneSearch; let rows = c.de.table;
  if (q) rows = rows.filter(r => r.gene.toLowerCase().includes(q));
  const cols = { gene: { v: r => r.gene }, base: { v: r => r.baseMean }, fc: { v: r => r.log2FC }, fcs: { v: r => r.log2FCShrunk }, se: { v: r => r.lfcSE }, p: { v: r => r.pvalue }, padj: { v: r => r.padj }, dir: { v: r => r.direction } };
  return sortRows('de', rows, cols, 'padj', 1);
}
function volcanoCard(c) {
  const n = c.de.nSignDiscordant || 0;
  return `<section class="card"><div class="card-head"><div><div class="card-title">Volcano plot</div><div class="card-sub">Each point is one gene: shrunken log2 fold change (${esc(c.test)} vs ${esc(c.reference)}) against −log10 adjusted p-value. Select a point or a table row to show the gene on the right; the selected gene is circled.</div></div></div>
    <div class="card-body"><div id="volcano" class="plot-frame"><div class="empty">Loading the plot…</div></div></div>
    <div class="card-foot"><span>Red: higher in ${esc(c.test)}; blue: lower in ${esc(c.test)}; gray: adjusted p ≥ 0.05.${n ? ` Open circles: ${num(n)} genes whose fold change changes sign under shrinkage.` : ''}</span></div></section>`;
}
function deTableCard(c) {
  const rows = deRows(c), shown = rows.slice(0, state.cmp.geneLimit), sel = state.cmp.gene || rows[0]?.gene;
  const th = (k, l, o = {}) => sortTh('de', k, l, { defKey: 'padj', defDir: 1, ...o });
  return `<section class="card"><div class="card-head"><div><div class="card-title">Differentially expressed genes</div><div class="card-sub">The ${num(c.de.table.length)} genes with the smallest adjusted p; the full table is in the results download</div></div>
    <label class="search">${icon('search')}<input class="input" id="cmp-gene-search" type="search" placeholder="Search genes" value="${esc(state.cmp.geneSearch)}" aria-label="Search genes"></label></div>
    <div class="card-body table-wrap" style="max-height:520px" data-scroll-id="de-table"><table class="table"><thead><tr>${th('gene', 'Gene')}${th('base', 'Mean normalized count', { num: true })}${th('fc', 'log2 fold change', { num: true })}${th('fcs', 'Shrunken log2 fold change', { num: true })}${th('se', 'Standard error', { num: true })}${th('p', 'p', { num: true })}${th('padj', 'Adjusted p', { num: true })}${th('dir', 'Direction')}</tr></thead>
    <tbody>${shown.map(r => `<tr class="clickable${r.gene === sel ? ' selected' : ''}" data-cmpgene="${esc(r.gene)}"><td><button type="button" class="name-link gene" data-cmpgene="${esc(r.gene)}">${esc(r.gene)}</button>${r.signDiscordant ? '<small>fold change changes sign under shrinkage</small>' : ''}</td><td class="num">${num(r.baseMean, 1)}</td><td class="num">${sig(r.log2FC)}</td><td class="num"><span class="heat" style="${diverge(r.log2FCShrunk, 4)}">${sig(r.log2FCShrunk)}</span></td><td class="num">${sig(r.lfcSE)}</td><td class="num">${fmtP(r.pvalue)}</td><td class="num">${fmtP(r.padj)}</td><td>${r.direction === 'up' ? `Higher in ${esc(c.test)}` : r.direction === 'down' ? `Lower in ${esc(c.test)}` : 'Not significant'}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">No genes match.</td></tr>'}</tbody></table></div>
    <div class="card-foot"><span>Fold changes: ${esc(c.test)} vs ${esc(c.reference)}; adjusted p: false discovery rate</span>${rows.length > shown.length ? `<button class="link-btn" data-action="cmpgenemore">Show 60 more</button>` : '<span></span>'}</div></section>`;
}
function typeValues(d, gene) { return d.geneExpression?.[gene] || d.typeExpression?.[gene] || null; }
function deGeneDetail(d, c) {
  const gene = state.cmp.gene || deRows(c)[0]?.gene, r = c.de.table.find(x => x.gene === gene) || null;
  const vp = r ? null : c.de.volcano.points.find(p => p[0] === gene);
  if (!r && !vp) return '<section class="card"><div class="card-body"><div class="empty">Select a gene in the table or the volcano plot.</div></div></section>';
  const fc = r ? r.log2FCShrunk : vp[1], padj = r ? r.padj : 10 ** -vp[2], dir = r ? r.direction : vp[3];
  const bx = d.bulkExpression, bg = bulkOfGene(d, gene), bulk = bg ? Object.fromEntries(bg.samples.map((sm, i) => [sm, bg.values[i]])) : null;
  const pending = d.bulkAllUrl && !d.bulkAll && !String(d.lazy.bulkAll || '').startsWith('error');
  const baseMean = r ? r.baseMean : bg && Number.isFinite(bg.baseMean) ? bg.baseMean : null;
  const tv = typeValues(d, gene), types = d.cellTypes;
  let where = '';
  if (tv) {
    const vals = tv.map((v, i) => ({ v, t: types[i] })).filter(x => Number.isFinite(x.v)).sort((a, b) => b.v - a.v), vmax = Math.max(...vals.map(x => x.v), 1e-9), top = vals[0]?.t;
    const comp = c.composition?.table?.find(x => x.cell_type === top?.name);
    const shift = comp && comp.padj < 0.05 ? `The estimated ${esc(typeNoun(top.name))} fraction is ${comp.median_difference_pp > 0 ? 'higher' : 'lower'} in ${esc(c.test)} (median ${comp.median_difference_pp > 0 ? '+' : ''}${sig(comp.median_difference_pp)} percentage points), so part of this bulk change can come from composition.` : '';
    where = `<div class="note" style="margin:16px 0 6px">Where it is expressed: estimated expression by cell type, log(1 + counts per 10,000)</div>${vals.map(x => `<div class="hbar"><span>${esc(x.t.label)}</span><span class="track"><i style="width:${(Math.max(0, x.v) / vmax * 100).toFixed(1)}%;background:${x.t.color}"></i></span><b>${sig(x.v)}</b></div>`).join('')}${shift ? `<p class="note">${shift}</p>` : ''}`;
  }
  return `<section class="card"><div class="card-head"><div><div class="card-title"><i>${esc(gene)}</i></div><div class="card-sub">${dir === 'up' ? `Higher in ${esc(c.test)}` : dir === 'down' ? `Lower in ${esc(c.test)}` : 'Not significant'}</div></div><a class="badge" href="https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(gene)}%5Bsym%5D+AND+human%5Borgn%5D" target="_blank" rel="noopener">NCBI Gene</a></div>
    <div class="card-body"><div class="metrics small"><div class="metric"><small>Shrunken log2 fold change</small><b>${sig(fc)}</b></div><div class="metric"><small>Adjusted p</small><b>${fmtP(padj)}</b></div><div class="metric"><small>Mean normalized count</small><b id="cmp-basemean">${baseMean !== null ? num(baseMean, 0) : pending ? '…' : '—'}</b></div></div>
      ${bulk ? `<div class="note" style="margin:16px 0 4px">Bulk expression in each sample, ${esc(bg.unit || 'log2(normalized count + 1)')}</div>${groupStrip(bulk, bg.unitShort || 'log2 normalized count', { width: 330, height: 190 })}` : pending ? '<p class="note" id="cmp-bulk-pending">Loading the per-sample values of this gene…</p>' : d.bulkAllUrl ? '<p class="note">The per-sample values of this gene could not be loaded.</p>' : '<p class="note">Per-sample values of this gene are in the results download.</p>'}
      ${where}${tumorNote(d, gene)}${geneLiterature(d, gene, { compact: true, id: 'cmp-gene-lit' })}</div></section>`;
}
async function drawVolcano() {
  const holder = $('#volcano'); if (!holder) return;
  const c = state.data.comparison, pts = c.de.volcano.points, selGene = state.cmp.gene || deRows(c)[0]?.gene;
  try {
    const Plotly = await loadPlotly(); if (state.view !== 'genes' || !$('#volcano')) return;
    let gl = false; try { gl = !!document.createElement('canvas').getContext('webgl'); } catch (e) { gl = false; }
    const groups = [['ns', 'Adjusted p ≥ 0.05', '#98a2b3', 4], ['down', `Lower in ${c.test}`, '#175cd3', 5.5], ['up', `Higher in ${c.test}`, '#b42318', 5.5]];
    const traces = groups.map(([key, name, color, size]) => {
      const sel = pts.filter(p => p[3] === key);
      return { type: gl ? 'scattergl' : 'scatter', mode: 'markers', name, x: sel.map(p => p[1]), y: sel.map(p => p[2]), customdata: sel.map(p => p[0]), hoverinfo: 'text',
        text: sel.map(p => `<b>${esc(p[0])}</b><br>log2 fold change ${sig(p[1])}<br>adjusted p ${fmtP(10 ** -p[2])}${p[4] ? '<br>fold change changes sign under shrinkage' : ''}`),
        marker: { size, color: sel.map(p => (p[4] ? 'rgba(255,255,255,0)' : color)), line: { color, width: sel.map(p => (p[4] ? 1.2 : 0)) }, opacity: key === 'ns' ? .55 : .85 } };
    });
    const byGene = new Map(pts.map(p => [p[0], p]));
    const ann = (c.de.volcano.labels || []).filter(g => g !== selGene).map(g => byGene.get(g)).filter(Boolean).map(p => ({ x: p[1], y: p[2], text: esc(p[0]), showarrow: true, arrowhead: 0, arrowwidth: .8, arrowcolor: '#667085', ax: p[1] >= 0 ? 22 : -22, ay: -16, font: { size: 11, color: '#1d2939' } }));
    const sp = byGene.get(selGene);
    if (sp) { ann.push({ x: sp[1], y: sp[2], text: `<b>${esc(sp[0])}</b>`, showarrow: true, arrowhead: 2, arrowcolor: '#0b1f33', ax: sp[1] >= 0 ? 40 : -40, ay: -34, bgcolor: '#fff', bordercolor: '#0b1f33', font: { size: 12, color: '#0b1f33' } }); traces.push({ type: 'scatter', mode: 'markers', x: [sp[1]], y: [sp[2]], hoverinfo: 'skip', showlegend: false, marker: { size: 15, color: 'rgba(0,0,0,0)', line: { color: '#0b1f33', width: 2 } } }); }
    ann.push({ xref: 'paper', x: 1, xanchor: 'right', y: -Math.log10(0.05), yanchor: 'bottom', text: 'adjusted p = 0.05', showarrow: false, font: { size: 10.5, color: '#667085' } });
    holder.innerHTML = '';
    await Plotly.newPlot(holder, traces, {
      height: 420, margin: { l: 64, r: 16, t: 34, b: 56 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff', hovermode: 'closest',
      font: { family: 'Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif', size: 12, color: '#1d2939' },
      legend: { orientation: 'h', x: 0, y: 1.1, font: { size: 11.5 } }, annotations: ann,
      shapes: [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: -Math.log10(0.05), y1: -Math.log10(0.05), line: { color: '#98a2b3', width: 1, dash: 'dot' } }],
      xaxis: { title: { text: `Shrunken log2 fold change (${esc(c.test)} vs ${esc(c.reference)})` }, zeroline: true, zerolinecolor: '#d0d5dd', gridcolor: '#f2f4f7' },
      yaxis: { title: { text: '−log10 adjusted p-value' }, rangemode: 'tozero', gridcolor: '#f2f4f7' },
    }, { displaylogo: false, responsive: true, modeBarButtonsToRemove: ['lasso2d', 'select2d'] });
    holder.on('plotly_click', ev => { const g = ev?.points?.[0]?.customdata; if (g) { state.cmp.gene = g; rerender(); } });
  } catch (e) { if ($('#volcano')) $('#volcano').innerHTML = `<div class="empty">The volcano plot could not be drawn (${esc(e.message)}).</div>`; }
}

function enrichmentSplit(c) {
  const P = c.pathways || {}, cols = ['H', 'REACTOME', 'WIKIPATHWAYS', 'GOBP'].filter(k => P.collections?.[k]);
  if (!cols.length) return '<section class="card section"><div class="card-body"><div class="empty">Pathway enrichment is not available for this comparison.</div></div></section>';
  const k = cols.includes(state.cmp.collection) ? state.cmp.collection : cols[0], col = P.collections[k];
  const q = state.cmp.setSearch; let rows = (col.sets || []).map(r => ({ ...r, collection: k }));
  if (q) rows = rows.filter(r => `${r.label} ${r.id} ${r.theme || ''} ${(r.leadingGenes || []).join(' ')}`.toLowerCase().includes(q));
  const sc = { label: { v: r => r.label }, nes: { v: r => r.nes }, size: { v: r => r.size }, padj: { v: r => r.padj }, cons: { v: r => CONSENSUS[r.consensus]?.[0] || null } };
  rows = sortRows('enr', rows, sc, 'padj', 1);
  const shown = rows.slice(0, state.cmp.setLimit), sel = (col.sets || []).find(r => r.id === state.cmp.set) || rows[0];
  const th = (key, l, o = {}) => sortTh('enr', key, l, { defKey: 'padj', defDir: 1, ...o });
  const tabs = cols.map(x => `<button class="${x === k ? 'active' : ''}" data-cmpcol="${x}">${esc(GS_LABEL[x])} <small>${num(P.collections[x].significant)} of ${num(P.collections[x].tested)}</small></button>`).join('');
  return `<div class="split section"><section class="card"><div class="card-head"><div><div class="card-title">Enriched gene sets</div><div class="card-sub">Gene sets whose genes rank toward higher (positive score) or lower (negative score) expression in ${esc(c.test)}; tabs show significant sets (adjusted p < 0.05) of the sets tested in each database</div></div></div>
    <div class="card-body"><div class="controls"><div class="segmented" role="group" aria-label="Gene-set database">${tabs}</div><label class="search">${icon('search')}<input class="input" id="cmp-set-search" type="search" placeholder="Search gene sets or genes" value="${esc(state.cmp.setSearch)}" aria-label="Search gene sets"></label></div>
    <div class="table-wrap" style="max-height:520px;margin-top:12px" data-scroll-id="enr-table"><table class="table"><thead><tr>${th('label', 'Gene set')}${th('nes', 'Score', { num: true, title: 'Normalized enrichment score' })}${th('size', 'Size', { num: true })}${th('padj', 'Adjusted p', { num: true })}${th('cons', 'Consistency')}<th>Leading-edge genes</th></tr></thead>
    <tbody>${shown.map(r => `<tr class="clickable${r.id === sel?.id ? ' selected' : ''}" data-cmpset="${esc(r.id)}"><td><button type="button" class="name-link" data-cmpset="${esc(r.id)}">${esc(r.label)}</button><small>${esc(r.id)}${k === 'GOBP' && r.theme ? ` · theme: ${esc(r.theme)}` : ''}</small></td><td class="num"><span class="heat" style="${diverge(r.nes, 3)}">${sig(r.nes)}</span></td><td class="num">${num(r.size)}</td><td class="num">${fmtP(r.padj)}</td><td>${consensusBadge(r.consensus)}</td><td><span class="genes">${esc((r.leadingGenes || []).slice(0, 6).join(', '))}</span></td></tr>`).join('') || '<tr><td colspan="6" class="empty">No gene sets match.</td></tr>'}</tbody></table></div>
    ${rows.length > shown.length ? `<button class="link-btn" data-action="cmpsetmore">Show more (${num(rows.length - shown.length)} remaining)</button>` : ''}
    <p class="note">Score: normalized enrichment score (fgsea); positive = the set's genes rank toward higher expression in ${esc(c.test)}. Source: ${esc(GS_DB[k].name)}, ${esc(GS_DB[k].version)}. The table lists up to 300 sets per database; all tested sets are in the results download.</p></div></section>
    <aside class="detail">${sel ? enrichmentDetail(c, { ...sel, collection: k }) : ''}</aside></div>`;
}
function enrichmentDetail(c, r) {
  const de = new Map(c.de.table.map(x => [x.gene, x.log2FCShrunk])), vp = new Map(c.de.volcano.points.map(p => [p[0], p[1]]));
  const genes = (r.leadingGenes || []).slice(0, 15).map(g => ({ name: g, v: de.has(g) ? de.get(g) : vp.get(g) })).filter(x => Number.isFinite(x.v));
  const db = GS_DB[r.collection];
  return `<section class="card"><div class="card-head"><div><div class="card-title">${esc(r.label)}</div><div class="card-sub">${esc(r.id)}</div></div>${consensusBadge(r.consensus)}</div>
    <div class="card-body"><div class="source-line">${icon('database')}<div><b>${esc(db.name)}</b> · ${esc(db.version)}<br>${setLinks(r).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">View in ${esc(n)}</a>`).join(' · ')}</div></div>
      <div class="metrics small"><div class="metric"><small>Enrichment score</small><b>${sig(r.nes)}</b></div><div class="metric"><small>Adjusted p</small><b>${fmtP(r.padj)}</b></div><div class="metric"><small>Genes in set</small><b>${num(r.size)}</b></div></div>
      <p class="note">${r.padj < 0.05 ? `The set's genes rank toward ${r.nes > 0 ? 'higher' : 'lower'} expression in ${esc(c.test)} than expected by chance.` : 'Not significant at adjusted p < 0.05.'}</p>
      ${genes.length ? `<div class="note" style="margin:12px 0 4px">Leading-edge genes (the genes driving the score) and their shrunken log2 fold change</div>${divergingBars(genes, `log2 fold change (${c.test} vs ${c.reference})`, { labelWidth: 90, width: 300, row: 21 })}` : '<p class="note">No leading-edge genes are listed for this set.</p>'}
      ${r.theme && r.theme !== r.label ? `<p class="note">Theme: ${esc(r.theme)}.</p>` : ''}${spatialPanel(state.data, 'set', r.id, r.label)}</div></section>`;
}
function progenyCard(c) {
  const p = c.pathways?.progeny || [];
  const items = [...p].sort((a, b) => b.score - a.score).map(r => ({ name: r.label, v: r.score, faint: !(r.padj < 0.05), mark: r.padj < 0.05 ? ' *' : '', note: `adjusted p ${fmtP(r.padj)}, ${num(r.targets)} genes` }));
  return `<section class="card"><div class="card-head"><div><div class="card-title">Signaling pathway activity (PROGENy)</div><div class="card-sub">Activity of 14 signaling pathways inferred from their response genes, ${esc(c.test)} vs ${esc(c.reference)} (* adjusted p < 0.05). Database: PROGENy, ${esc(GS_DB.PROGENY.version)}</div></div></div>
    <div class="card-body">${items.length ? divergingBars(items, `Pathway activity score (${c.test} vs ${c.reference})`, { labelWidth: 120, width: 400, row: 22 }) : '<div class="empty">Pathway activity is not available for this comparison.</div>'}</div></section>`;
}
function themesCard(c, { limit = 0 } = {}) {
  const P = c.pathways || {}, all = P.themes || [], th = limit ? all.slice(0, limit) : all, bm = limit ? [] : (P.bestMatches || []).filter(r => r.query_padj < 0.05);
  const rows = th.map(t => `<tr><td><b style="font-weight:600">${esc(t.theme_label)}</b><small>${esc(t.top_set || '')}</small></td><td><span class="badge ${t.call === 'up' ? 'warn' : 'accent'}">${t.call === 'up' ? `Higher in ${esc(c.test)}` : `Lower in ${esc(c.test)}`}</span></td><td>${esc(String(t.collections_up || t.collections_down || '').split(',').filter(Boolean).map(x => GS_LABEL[x] || x).join(', '))}</td><td class="num">${num(t.n_sig_sets)} of ${num(t.n_tested)}</td></tr>`).join('');
  const bmRows = bm.map(r => `<tr><td>${esc(GS_LABEL[r.query_collection] || r.query_collection)}: ${esc(String(r.query_set).replace(/^(HALLMARK|PROGENY)_/, '').replace(/_/g, ' ').toLowerCase())}</td><td class="num">${sig(r.query_score)}</td><td class="num">${num(r.n_matches_sig_same_sign)} of ${num(r.n_matches_tested)}</td><td class="num">${num(r.n_matches_sig_opposite)}</td></tr>`).join('');
  return `<section class="card" id="themes-card"><div class="card-head"><div><div class="card-title">Themes consistent across databases</div><div class="card-sub">Themes of related gene sets that change in the same direction in more than one database${limit && all.length > th.length ? `; ${num(th.length)} of ${num(all.length)} shown` : ` (${num(all.length)})`}</div></div><span class="badge accent">${icon('database')} Cross-database</span></div>
    <div class="card-body">${rows ? `<div class="table-wrap" style="max-height:${limit ? 'none' : '360px'}"><table class="table"><thead><tr><th>Theme</th><th>Direction</th><th>Databases</th><th class="num">Significant sets</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="note">No theme changed consistently across databases.</p>'}
    ${bmRows ? `<div class="note" style="margin:14px 0 4px">Significant Hallmark and PROGENy sets and their best-matching sets in other databases</div><div class="table-wrap" style="max-height:300px"><table class="table"><thead><tr><th>Gene set</th><th class="num">Score</th><th class="num">Matches, same direction</th><th class="num">Matches, opposite</th></tr></thead><tbody>${bmRows}</tbody></table></div>` : ''}
    <p class="note">${esc(P.themeCaveat || '')}</p></div>${limit ? `<div class="card-foot"><span></span><button class="link-btn" data-view="compare">All themes and pathway enrichment →</button></div>` : ''}</section>`;
}
function compositionCompare(c, { body = false } = {}) {
  const comp = c.composition;
  if (!comp) return '<section class="card"><div class="card-body"><div class="empty">Composition was not estimated for this comparison.</div></div></section>';
  const types = comp.table.map(r => r.cell_type), samples = Object.keys(comp.fractions);
  const grp = c.samples || {}, flagged = new Set(Object.values(comp.flaggedSamples || {}).flat());
  const col = { [c.test]: GROUP_COLOR[0], [c.reference]: GROUP_COLOR[1] };
  const vmax = Math.max(...samples.flatMap(sm => types.map(t => comp.fractions[sm]?.[t] || 0)), .05), ymax = Math.min(1, Math.ceil(vmax * 10 + 1e-9) / 10);
  const L = 56, W = 640, T = 10, H = 240, cw = W / types.length, Y = v => T + H - v / ymax * H;
  const off = g => (g === c.test ? -.19 : .19) * cw;
  const dots = samples.map((sm, si) => types.map((t, ti) => {
    const v = comp.fractions[sm]?.[t]; if (!Number.isFinite(v)) return '';
    const g = grp[sm], x = L + cw * (ti + .5) + off(g) + ((((si + 1) * 7919) % 97) / 97 - .5) * cw * .16, k = col[g] || '#667085', out = flagged.has(sm);
    return `<circle cx="${x.toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.2" fill="${out ? '#fff' : k}" fill-opacity="${out ? 1 : .75}" stroke="${k}" stroke-width="1.2"><title>${esc(sampleLabel(sm))} (${esc(g || '')}) · ${esc(typeLabel(t))}: ${pct(v)}${out ? ' · outside the healthy reference' : ''}</title></circle>`;
  }).join('')).join('');
  const med = comp.table.map((r, ti) => [[c.test, r.median_test_pct], [c.reference, r.median_reference_pct]].map(([g, v]) => { const x = L + cw * (ti + .5) + off(g); return Number.isFinite(v) ? `<line x1="${(x - cw * .13).toFixed(1)}" x2="${(x + cw * .13).toFixed(1)}" y1="${Y(v / 100).toFixed(1)}" y2="${Y(v / 100).toFixed(1)}" stroke="#0b1f33" stroke-width="2"/>` : ''; }).join('')).join('');
  const axis = ticksFor(0, ymax * 100, 5).map(v => `<line x1="${L - 5}" x2="${L}" y1="${Y(v / 100).toFixed(1)}" y2="${Y(v / 100).toFixed(1)}" stroke="#98a2b3"/><text x="${L - 8}" y="${(Y(v / 100) + 4).toFixed(1)}" text-anchor="end">${v}</text>`).join('');
  const xl = types.map((t, i) => `<text x="${(L + cw * (i + .5)).toFixed(1)}" y="${T + H + 16}" text-anchor="middle">${esc(typeLabel(t).replace(' (gamma)', ''))}</text>`).join('');
  const svg = `<svg class="svgplot" viewBox="0 0 ${L + W + 8} ${T + H + 46}" role="img" aria-label="Estimated cell-type fractions by group"><g font-size="11.5" fill="#667085">${axis}<line x1="${L}" x2="${L}" y1="${T}" y2="${T + H}" stroke="#98a2b3"/><line x1="${L}" x2="${L + W}" y1="${T + H}" y2="${T + H}" stroke="#98a2b3"/>${xl}
    <text class="axis-title" transform="translate(14 ${T + H / 2}) rotate(-90)" text-anchor="middle" fill="#344054">Estimated fraction of cells (%)</text><text class="axis-title" x="${L + W / 2}" y="${T + H + 38}" text-anchor="middle" fill="#344054">Cell type (points: samples; bars: group medians)</text></g>${dots}${med}</svg>`;
  const ct = { type: { v: r => typeLabel(r.cell_type) }, mt: { v: r => r.median_test_pct }, mr: { v: r => r.median_reference_pct }, diff: { v: r => r.median_difference_pp }, padj: { v: r => r.padj } };
  const tRows = sortRows('comp', comp.table, ct, 'padj', 1), th = (k, l, o = {}) => sortTh('comp', k, l, { defKey: 'padj', defDir: 1, ...o });
  const rows = tRows.map(r => `<tr><td><span class="swatch" style="background:${typeColor(r.cell_type)};margin-right:6px"></span>${esc(typeLabel(r.cell_type))}</td><td class="num">${sig(r.median_test_pct)}</td><td class="num">${sig(r.median_reference_pct)}</td><td class="num">${r.median_difference_pp > 0 ? '+' : ''}${sig(r.median_difference_pp)}</td><td class="num">${fmtP(r.padj)}</td></tr>`).join('');
  const thr = comp.fit?.thresholds || {};
  const fitAll = Object.entries(comp.fit?.samples || {}).map(([sm, f]) => ({ sm, g: grp[sm] || '', ...f }));
  const fc = { sm: { v: r => sampleLabel(r.sm) }, g: { v: r => r.g }, r: { v: r => r.fit_r }, u: { v: r => r.unexplained }, o: { v: r => (r.outside_reference ? 'Outside' : 'Within') } };
  const fth = (k, l, o = {}) => sortTh('fit', k, l, { defKey: 'r', defDir: 1, ...o });
  const fitRows = sortRows('fit', fitAll, fc, 'r', 1).map(f => `<tr><td>${esc(sampleLabel(f.sm))}</td><td>${esc(f.g)}</td><td class="num">${sig(f.fit_r)}</td><td class="num">${Number.isFinite(f.unexplained) ? (f.unexplained * 100).toFixed(1) : '—'}</td><td>${f.outside_reference ? '<span class="badge warn">Outside</span>' : 'Within'}</td></tr>`).join('');
  const inner = `<div class="grid halves"><div>${svg}<div class="legend static"><span><span class="swatch" style="background:${col[c.test]}"></span>${esc(c.test)}</span><span><span class="swatch" style="background:${col[c.reference]}"></span>${esc(c.reference)}</span><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#fff" stroke="#667085" stroke-width="1.2"/></svg>Sample outside the healthy reference</span></div></div>
    <div><div class="table-wrap" data-scroll-id="comp-table"><table class="table"><thead><tr>${th('type', 'Cell type')}${th('mt', `Median, ${esc(c.test)} (%)`, { num: true })}${th('mr', `Median, ${esc(c.reference)} (%)`, { num: true })}${th('diff', 'Difference (points)', { num: true, title: 'Percentage points' })}${th('padj', 'Adjusted p', { num: true })}</tr></thead><tbody>${rows}</tbody></table></div>
    <p class="note">Test: ${esc(comp.test || 'two-sided rank-sum test per cell type, adjusted across cell types')}. Tumor cells and cancer-associated fibroblasts have no reference type; their share is absorbed into the nearest types (mostly ductal and stellate).</p></div></div>
    ${fitRows ? `<details class="advanced"><summary>How well each sample fits the healthy reference</summary><p class="note">Each sample is described as a mixture of the reference cell types. A sample is flagged as outside the reference when the correlation between its expression and the best mixture is below ${sig(thr.fit_r_min)} or the share of expression the mixture leaves unexplained exceeds ${Number.isFinite(thr.unexplained_max) ? (thr.unexplained_max * 100).toFixed(0) : '—'}%.</p><div class="table-wrap" style="max-height:300px" data-scroll-id="fit-table"><table class="table"><thead><tr>${fth('sm', 'Sample')}${fth('g', 'Group')}${fth('r', 'Fit correlation', { num: true })}${fth('u', 'Unexplained (%)', { num: true })}${fth('o', 'Reference')}</tr></thead><tbody>${fitRows}</tbody></table></div></details>` : ''}`;
  return body ? inner : `<section class="card"><div class="card-head"><div><div class="card-title">Composition by group</div><div class="card-sub">Estimated fraction of cells of each type in every sample (%), healthy pancreas reference types</div></div></div><div class="card-body">${inner}</div></section>`;
}
function exportDE() {
  const c = state.data.comparison; if (!c) return toast('This result has no comparison.');
  const rows = [['gene', 'mean_normalized_count', 'log2_fold_change', 'log2_fold_change_shrunk', 'log2_fold_change_se', 'pvalue', 'padj', 'direction', 'shrinkage_changes_sign'], ...c.de.table.map(r => [r.gene, r.baseMean, r.log2FC, r.log2FCShrunk, r.lfcSE, r.pvalue, r.padj, r.direction, r.signDiscordant])];
  download('cellaris-comparison-genes.csv', rows.map(r => r.map(csvCell).join(',')).join('\n'));
}
function exportEnrichment() {
  const c = state.data.comparison; if (!c) return toast('This result has no comparison.');
  const rows = [['database', 'database_version', 'gene_set', 'label', 'normalized_enrichment_score', 'set_size', 'pvalue', 'padj', 'theme', 'consistency', 'leading_edge_genes']];
  for (const [k, col] of Object.entries(c.pathways?.collections || {})) for (const r of col.sets || []) rows.push([GS_DB[k]?.name || k, GS_DB[k]?.version || '', r.id, r.label, r.nes, r.size, r.pvalue, r.padj, r.theme, CONSENSUS[r.consensus]?.[0] || '', (r.leadingGenes || []).join(';')]);
  for (const r of c.pathways?.progeny || []) rows.push(['PROGENy', GS_DB.PROGENY.version, r.id, r.label, r.score, r.targets, r.pvalue, r.padj, '', '', '']);
  download('cellaris-comparison-pathways.csv', rows.map(r => r.map(csvCell).join(',')).join('\n'));
}

/* ---------- Spatial views: a pathway's score on a public PDAC tissue section ---------- */
function checkSpatial(b) {
  if (!b || !Array.isArray(b.sections) || !b.sections.length || !Array.isArray(b.chunks) || typeof b.sets !== 'object') throw new Error('Invalid spatial index.');
  for (const s of b.sections) if (!Array.isArray(s.x) || !Array.isArray(s.y) || s.x.length !== s.y.length) throw new Error('Invalid tissue section.');
  return b;
}
/* kind: 'set' (signaling and functional gene sets, activity score) or 'metabolic' (KEGG pathways, expression of the enzyme genes) */
function spatialPanel(d, kind, id, label) {
  if (!d.spatialUrl && !d.spatial) return '';
  const what = kind === 'metabolic' ? 'mean expression of the pathway\u2019s enzyme genes' : 'activity score of this gene set';
  const head = `<div class="note" style="margin:10px 0 6px"><b style="color:var(--ink-2)">On a tissue section</b> · ${what} across a public PDAC tissue section</div>`;
  const S = d.spatial, st = String(d.lazy.spatial || '');
  if (!S) {
    if (!st.startsWith('error')) ensureLazy('spatial', checkSpatial);
    return `<div class="detail-sub spatial">${head}<p class="note">${st.startsWith('error') ? `The spatial view could not be loaded (${esc(st.replace(/^error: /, ''))}).` : 'Loading the spatial view…'}</p></div>`;
  }
  const ref = (kind === 'metabolic' ? S.metabolic : S.sets)?.[id];
  if (ref === undefined || ref === null) return `<div class="detail-sub spatial" data-spatial-missing>${head}<p class="note">No tissue view: ${kind === 'metabolic' ? 'none of this pathway\u2019s enzyme genes are' : 'fewer than 5 of this set\u2019s genes are'} measured on the section.</p></div>`;
  const sec = S.sections.find(x => x.id === state.spatial.section) || S.sections[0];
  const used = S.genesUsed?.[sec.id]?.[id], area = sec.binUm ? `${num(sec.nSpots)} areas of about ${sig(sec.binUm / 1000)} mm` : `${num(sec.nSpots)} spots`;
  const picker = S.sections.length > 1 ? `<div class="toggle-chips" role="group" aria-label="Tissue section" style="margin-bottom:8px">${S.sections.map(x => `<button class="${x.id === sec.id ? 'active' : ''}" data-spsection="${esc(x.id)}" aria-pressed="${x.id === sec.id}">${esc(x.label)}</button>`).join('')}</div>` : '';
  const regions = sec.regions?.labels?.length ? `<button type="button" class="link-btn" data-action="spregions">${state.spatial.regions ? 'Show the score' : 'Show the annotated regions'}</button>` : '';
  return `<div class="detail-sub spatial" id="spatial-${kind}">${head}${picker}
    <div class="spatial-frame" data-spatial-kind="${kind}" data-spatial-id="${esc(id)}" data-spatial-section="${esc(sec.id)}" data-spatial-label="${esc(label)}"><div class="empty">Loading the section…</div></div>
    <div class="spatial-actions"><button type="button" class="link-btn" data-action="spzoom" data-spkind="${kind}" data-spid="${esc(id)}" data-splabel="${esc(label)}">Enlarge</button>${regions}</div>
    <p class="note" data-spatial-source><b>${esc(sec.label)}</b> · ${area}${Number.isFinite(used) ? ` · ${kind === 'metabolic' ? `${plural(used, 'enzyme gene')} of this pathway` : `${plural(used, 'gene')} of this set`} measured on the section` : ''}. Data: ${sec.url ? `<a href="${esc(sec.url)}" target="_blank" rel="noopener">${esc(String(sec.url).replace(/^https:\/\/doi\.org\//, 'doi:'))}</a>` : esc(sec.dataset || '')}${sec.license ? `, ${sec.licenseUrl ? `<a href="${esc(sec.licenseUrl)}" target="_blank" rel="noopener">${esc(sec.license.replace(/ \(.*\)$/, ''))}</a>` : esc(sec.license)}` : ''}.${sec.changes ? ` Changes: ${esc(sec.changes.charAt(0).toLowerCase() + sec.changes.slice(1))}` : ''} Full credit in About.</p>
    <p class="note" data-spatial-caveat>${esc(DEMO().spatialCaveat || 'This section comes from a different patient than the bulk samples analyzed here. It is one section from one tumor, shown as an example. Scores are relative within the section: compare areas of the section with each other, not with the cell-type or sample values elsewhere. Each area contains many cells of several types.')}${kind === 'metabolic' ? ' This is gene expression measured in the tissue, not the pathway activity estimated by the metabolic model.' : ''}</p></div>`;
}
function decodeBytes(q) { const s = atob(q), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
const VIRIDIS = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'];
const VIRIDIS_LUT = Array.from({ length: 255 }, (_, k) => { const t = Math.min(.999, k / 254) * 4, i = Math.floor(t); return mix(VIRIDIS[i], VIRIDIS[i + 1], t - i); });
const REGION_COLORS = ['#b42318', '#f97066', '#ddcc77', '#0072b2', '#56b4e9', '#98a2b3', '#d55e00', '#882255', '#7a5af8', '#12805c', '#f2c94c', '#5f6b76'];
function spatialSvg(sec, rec, kind, label, W = 360) {
  const n = sec.x.length, q = rec ? decodeBytes(rec.q) : null, pad = 4, reg = state.spatial.regions && sec.regions?.labels?.length ? sec.regions : null;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) { const x = sec.x[i], y = sec.y[i]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  /* each area is drawn as a rectangle of the bin size (or a square of the mean spacing when no size is given) */
  const pitch = Math.sqrt(((x1 - x0) * (y1 - y0)) / Math.max(1, n)) || 1, bwU = sec.binWidthUm || sec.binUm || pitch, bhU = sec.binHeightUm || sec.binUm || pitch;
  const sx = (W - 2 * pad) / ((x1 - x0 + bwU) || 1), Hh = (y1 - y0 + bhU) * sx + 2 * pad, bw = (bwU * sx + .25).toFixed(2), bh = (bhU * sx + .25).toFixed(2);
  /* color limits: 2nd and 98th percentile of the section, so that a few extreme areas do not flatten the scale */
  let b2 = 0, b98 = 254;
  if (q && !reg) {
    const hist = new Array(256).fill(0); let m = 0;
    for (let i = 0; i < n; i++) if (q[i] !== 255) { hist[q[i]]++; m++; }
    let acc = 0, lo = null, hi = null;
    for (let b = 0; b < 255; b++) { acc += hist[b]; if (lo === null && acc >= m * .02) lo = b; if (hi === null && acc >= m * .98) hi = b; }
    if (lo !== null && hi !== null && hi > lo) { b2 = lo; b98 = hi; }
  }
  const lut = v => VIRIDIS_LUT[Math.max(0, Math.min(254, Math.round((v - b2) / (b98 - b2) * 254)))];
  const parts = new Array(n);
  for (let i = 0; i < n; i++) {
    const v = q ? q[i] : 255, fill = reg ? REGION_COLORS[reg.spot[i] % REGION_COLORS.length] : v === 255 ? '#e4e7ec' : lut(v);
    parts[i] = `<rect x="${(pad + (sec.x[i] - x0) * sx).toFixed(1)}" y="${(pad + (sec.y[i] - y0) * sx).toFixed(1)}" width="${bw}" height="${bh}" fill="${fill}"/>`;
  }
  const val = b => rec.lo + b / 254 * (rec.hi - rec.lo);
  const bar = reg
    ? `<div class="legend static spatial-regions">${reg.labels.map((l, k) => `<span><span class="swatch" style="background:${REGION_COLORS[k % REGION_COLORS.length]}"></span>${esc(l)}</span>`).join('')}</div>`
    : `<div class="spatial-scale" role="img" aria-label="Color scale from ${sig(val(b2))} to ${sig(val(b98))}"><span>${sig(val(b2))}</span><i></i><span>${sig(val(b98))}</span><small>${kind === 'metabolic' ? 'Mean expression of the enzyme genes, log(1 + counts per 10,000)' : 'Score (relative units within the section)'} · color range: 2nd to 98th percentile of the section</small></div>`;
  return `<svg class="spatial-svg" viewBox="0 0 ${W} ${Hh.toFixed(0)}" role="img" aria-label="${esc(label)} on the tissue section ${esc(sec.label)}" data-spots="${n}">${parts.join('')}</svg>${bar}`;
}
async function drawSpatial() {
  const d = state.data, S = d.spatial; if (!S) return;
  for (const el of $$('.spatial-frame')) {
    const { spatialKind: kind, spatialId: id, spatialSection: sid, spatialLabel: label } = el.dataset, ref = (kind === 'metabolic' ? S.metabolic : S.sets)?.[id];
    if (ref === undefined || ref === null) continue;
    const ci = Array.isArray(ref) ? ref[0] : ref;
    try {
      d.spatialChunks[ci] ||= fetch(S.chunks[ci]).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
      const chunk = await d.spatialChunks[ci];
      if (state.data !== d || !el.isConnected) continue;
      const rec = chunk.sets?.[id]?.[sid], sec = S.sections.find(x => x.id === sid);
      el.innerHTML = rec && sec ? spatialSvg(sec, rec, kind, label, el.classList.contains('big') ? 820 : 360) : '<div class="empty">Not scored on this section.</div>';
      el.dataset.drawn = rec && sec ? '1' : '0';
    } catch (e) { delete d.spatialChunks[ci]; if (el.isConnected) el.innerHTML = `<div class="empty">The section could not be loaded (${esc(e.message)}).</div>`; }
  }
}
function spatialZoom(kind, id, label) {
  const S = state.data.spatial; if (!S) return;
  const sec = S.sections.find(x => x.id === state.spatial.section) || S.sections[0];
  modal(esc(label), `${esc(sec.label)} · ${kind === 'metabolic' ? 'mean expression of the pathway\u2019s enzyme genes' : 'activity score of the gene set'}`,
    `<div class="spatial-frame big" data-spatial-kind="${kind}" data-spatial-id="${esc(id)}" data-spatial-section="${esc(sec.id)}" data-spatial-label="${esc(label)}"><div class="empty">Loading the section…</div></div>`, '', true);
  drawSpatial();
}

/* ---------- Figures ---------- */
function mapComparisonCard(mc, isOwn) {
  if (!mc) return '';
  const p = v => (!Number.isFinite(v) ? '—' : v > 0 && v < 0.01 ? `${(v * 100).toFixed(1)}%` : `${Math.round(v * 100)}%`);
  const rows = (mc.byType || []).map(r => `<tr><td><span class="swatch" style="background:${typeColor(r.type)};margin-right:6px"></span>${esc(typeLabel(r.type))}</td><td class="num">${num(r.n)}</td><td class="num">${p(r.purityExpression)}</td><td class="num">${p(r.purityMetabolic)}</td><td class="num">${p(r.overlap)}</td><td>${(r.metabolicNeighbors || []).map(([u, v]) => `${esc(typeLabel(u))} ${p(v)}`).join(', ') || '<span class="note">—</span>'}</td></tr>`).join('');
  return `<section class="card section" id="map-compare"><div class="card-head"><div><div class="card-title">Does the metabolic map look like the expression map?</div><div class="card-sub">The same ${num(mc.profiles)} estimated profiles placed by gene expression and by estimated metabolic activity${isOwn ? '' : ' (PDAC demo)'}</div></div><button class="btn btn-secondary" data-view="samples">Open the maps</button></div>
    <div class="card-body"><div class="metrics four"><div class="metric"><small>Shared nearest neighbors</small><b>${p(mc.overlap)}</b><span class="of">${p(mc.overlapRandom)} expected by chance</span></div>
      <div class="metric"><small>Neighbors of the same cell type</small><b>${p(mc.purityExpression)} <span class="of">expression</span></b><b>${p(mc.purityMetabolic)} <span class="of">metabolic</span></b></div>
      <div class="metric"><small>Neighbors from the same sample</small><b>${p(mc.sameSampleMetabolic)}</b><span class="of">${p(mc.sameSampleMixed)} if samples were fully mixed</span></div>
      <div class="metric"><small>Pathway variation within cell types</small><b>${p(mc.withinShareMedian)}</b><span class="of">median over pathways (${p(mc.withinShareMin)}–${p(mc.withinShareMax)})</span></div></div>
      <div style="margin-top:14px"><div class="prose two-col"><p><b>${mc.overlap < 0.1 ? 'No: the two maps are organized differently.' : 'No: the two maps are related but organized differently.'}</b> On average ${p(mc.overlap)} of each profile's ${num(mc.k)} nearest neighbors are the same in both maps${mc.copiesExcluded ? ` (${p(mc.overlapRandom)} expected by chance; profiles that derive from the same reference cell are not counted as neighbors)` : ''}. Gene expression keeps every cell type apart, which makes the expression map the place to check cell-type assignments. The metabolic map groups cell types that share metabolic programs: the table shows which other types each cell type mixes with.</p>
        <p><b>Why the metabolic map is useful.</b> For most pathways, most of the variation between profiles lies within cell types (median ${p(mc.withinShareMedian)}). The metabolic map arranges this variation into gradients: neighbors in the metabolic map have more similar pathway activity than neighbors in the expression map (median correlation ${sig(mc.autocorrMetabolicMedian)} vs ${sig(mc.autocorrExpressionMedian)}). Profiles of one cell type that sit apart in the metabolic map differ in estimated metabolism.</p>
        <ul class="plain"><li><b>Check cell types</b> in the expression map (Samples, Expression).</li><li><b>Find shared metabolic programs</b>: cell types that overlap in the metabolic map.</li><li><b>Find metabolic heterogeneity</b>: color the metabolic map by metabolic activity, or select a pathway in <a href="#pathways" data-view="pathways">Metabolic pathways</a>.</li></ul>
        <p class="note">Neighborhoods are computed in the full spaces (expression: ${esc(mc.expressionSpace || '')}; metabolic: ${esc(mc.metabolicSpace || '')}), not on the 2-D maps.${mc.layoutNote ? ` ${esc(mc.layoutNote)}` : ''} The metabolic map comes from the same model as the activity values, so their agreement is partly expected by construction.</p></div>
      <div class="table-wrap" style="margin-top:12px"><table class="table compact"><thead><tr><th>Cell type</th><th class="num">Profiles</th><th class="num" title="Share of the 15 nearest neighbors of the same cell type">Same type, expression</th><th class="num">Same type, metabolic</th><th class="num" title="Share of nearest neighbors shared between the two maps">Shared neighbors</th><th>Mixes with, in the metabolic map (≥ 5% of neighbors)</th></tr></thead><tbody>${rows}</tbody></table></div></div></div></section>`;
}
function viewFigures() {
  const d = state.data, own = d.figures.length ? d.figures : null, figs = own || DEMO().figures || [];
  const mc = d.mapComparison || (!own ? DEMO().mapComparison : null);
  const note = !own ? `<div class="banner">${icon('info')}<div>These figures describe the PDAC demo. ${d.origin === 'demo' ? 'Its results are in the other views and in its results download.' : 'Your own results are in the other views and in the results download.'}</div></div>` : '';
  return `${pageHead('Figures', 'Figures and how to read them', 'Summary figures of the analysis, each with a guide to reading it, the main finding and its caveat. Select a figure to enlarge it; each is available as PNG and SVG.')}${note}
  ${mapComparisonCard(mc, !!own || d.origin === 'demo')}
  <div class="figure-list">${figs.map((f, i) => `<article class="card figure-card wide"><div class="card-body"><div class="fig-num">Figure ${i + 1}</div><div class="card-title" style="margin:2px 0 12px">${esc(f.title)}</div>
    <div class="figure-row"><div class="figure-img"><img src="${esc(f.png)}" alt="${esc(f.title)}" loading="lazy" data-figure="${i}"><div class="caption">${esc(f.caption)}</div><div class="downloads"><a href="${esc(f.png)}" download>PNG</a><a href="${esc(f.svg)}" download>SVG</a></div></div>
    <div class="figure-notes">${f.howTo ? `<div class="fnote"><h4>How to read it</h4><p>${esc(f.howTo)}</p></div>` : ''}${f.finding ? `<div class="fnote finding"><h4>What it shows</h4><p>${esc(f.finding)}</p></div>` : ''}${f.caveat ? `<div class="fnote caveat"><h4>Caveat</h4><p>${esc(f.caveat)}</p></div>` : ''}</div></div></div></article>`).join('')}</div>`;
}

/* ---------- About ---------- */
function viewAbout() {
  const d = state.data, demo = DEMO(), lm = literatureMeta();
  const nSets = d.genesets ? Object.values(d.genesets.collections).reduce((a, k) => a + (k.scorableSets || 0), 0) : null;
  const facts = [...(d.origin === 'demo' && demo.build?.label ? [['Build', esc(demo.build.label)]] : []), ['Samples', num(d.counts.samples)], ['Estimated single-cell profiles', num(d.counts.cells)], ['Cell types', num(d.cellTypes.length)],
    ...(d.metabolic ? [['KEGG pathways scored', num(d.pathways.length)], ['Metabolic reactions', num(d.counts.reactions)]] : [['Metabolic model', 'Not run']]),
    ...(nSets ? [['Gene sets scored', num(nSets)]] : []), ...(d.comparison ? [['Groups compared', `${esc(d.comparison.test)} vs ${esc(d.comparison.reference)}`]] : [])];
  const lsrc = lm?.sources || {};
  return `${pageHead('About', 'Cellaris AI Demo', 'Cell-type, metabolic and signaling insight from bulk RNA-seq of pancreatic ductal adenocarcinoma (PDAC) and pancreas.')}
  <div class="steps">
    <div class="step"><div class="n">INPUT</div><h4>Bulk RNA-seq counts</h4><p>Raw integer counts from human pancreas or pancreatic tumor tissue such as PDAC: genes (HGNC symbols) in rows, samples in columns, CSV or TSV, up to 100 samples.</p></div>
    <div class="step"><div class="n">OUTPUT</div><h4>Cell-type composition</h4><p>Estimated share of the nine reference cell types (alpha, beta, delta, PP, acinar, ductal, endothelial, stellate, immune) in every sample.</p></div>
    <div class="step"><div class="n">OUTPUT</div><h4>Estimated single-cell profiles</h4><p>Single-cell expression profiles estimated from each bulk sample, with marker genes and two maps (expression and metabolic).</p></div>
    <div class="step"><div class="n">OUTPUT</div><h4>Metabolic activity</h4><p>Activity of KEGG metabolic pathways and reactions in each cell type, with pathway maps and literature support.</p></div>
    <div class="step"><div class="n">OUTPUT</div><h4>Signaling and functional pathways</h4><p>Activity of MSigDB Hallmark, Reactome, WikiPathways, GO Biological Process and PROGENy gene sets in each cell type and sample.</p></div>
    <div class="step"><div class="n">OPTIONAL</div><h4>Group comparison</h4><p>Two groups of bulk samples compared: differential expression, pathway enrichment and composition by group.</p></div>
  </div>
  <div class="grid halves section">
    <section class="card"><div class="card-head"><div><div class="card-title">This result</div><div class="card-sub">${esc(d.title)}</div></div></div>
      <div class="card-body"><dl class="kv">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl></div></section>
    ${glossary(d, { compact: true })}
  </div>
  <section class="card section"><div class="card-head"><div><div class="card-title">Methods</div><div class="card-sub">How each result is computed</div></div></div>
    <div class="card-body"><div class="grid halves methods">
      <div><h4>Composition and estimated profiles</h4><p>Each bulk sample is described as a mixture of the nine cell types of the built-in healthy human pancreas reference (Baron et al., Cell Systems 2016). Single-cell profiles are then estimated from each sample in proportion to its composition (300 per sample in the demo). A sample is flagged as outside the reference when the best mixture fits its expression poorly.</p>
        <h4>Maps</h4><p>${esc(d.origin === 'demo' && DEMO().mapMethod ? DEMO().mapMethod : 'Expression map: UMAP of the first 30 principal components of the 2,000 most variable genes, log(1 + counts per 10,000). Metabolic map: UMAP of the metabolic model\u2019s latent space. Both show the same profiles.')}</p>
        <h4>Metabolic pathways</h4><p>A graph-based model of the KEGG reaction network estimates the activity of ${num(d.counts.reactions || 1225)} metabolic reactions in every profile. A pathway's activity is the mean activity of its reactions, in relative units, averaged per cell type. Pathway maps are drawn from the KEGG reference pathways; each line is a reaction step of the model.</p></div>
      <div><h4>Signaling and functional pathways</h4><p>Gene sets from MSigDB v2026.2.Hs (Hallmark; Reactome release 97; WikiPathways 2026-10-10; GO Biological Process, GO release 2026-07-26) and PROGENy (14 pathways, 500 footprint genes each) are scored in every estimated profile with a univariate linear model (t-value; decoupler method) on log(1 + counts per 10,000), then averaged per sample and cell type. Top genes are the member genes that contribute most to the score in each cell type.</p>
        <h4>Group comparison</h4><p>Bulk counts: DESeq2 (PyDESeq2 0.5.4) with the patient as covariate, shrunken fold changes, Benjamini–Hochberg adjustment; fgsea multilevel enrichment of the Wald statistics (15–500 genes per set); PROGENy activity by a decoupler 2.2.0 multivariate linear model; estimated composition by a two-sided rank-sum test per cell type.</p>
        <h4>Literature support</h4><p>${esc(lm?.name || 'Human pancreas literature')} index ${esc(lm?.version || '')}: ${num(lm?.papers)} ${esc(scopeInfo().noun)} with PubTator3 gene annotations${lsrc.genePapers ? ` (${esc(lsrc.genePapers)})` : ''}, matched to the enzymes of each reaction step; curated enzyme evidence from ${esc(lsrc.curated || 'UniProtKB/Swiss-Prot')}.</p>${DEMO().litGenesNote && d.origin === 'demo' ? `<p id="about-lit-genes">${esc(DEMO().litGenesNote)}</p>` : ''}${d.origin === 'demo' ? (DEMO().extraMethods || []).map(m => `<h4>${esc(m.title)}</h4><p data-extra-method="${esc(m.key || '')}">${esc(m.text)}</p>`).join('') : ''}</div>
    </div></div></section>
  <section class="card section"><div class="card-head"><div><div class="card-title">Reading the results</div></div></div><div class="card-body prose"><ul>${(demo.limitations || []).map(l => `<li>${esc(l)}</li>`).join('')}</ul></div></section>
  <section class="card section"><div class="card-head"><div><div class="card-title">Data credits</div><div class="card-sub">Public datasets used in this demo</div></div></div>
  <div class="card-body table-wrap"><table class="table"><thead><tr><th>Dataset</th><th>Use</th><th>Accession</th></tr></thead><tbody>${(demo.sources || []).map(s => `<tr><td><b style="font-weight:600">${esc(s.name)}</b><small>${esc(s.citation)}</small></td><td>${esc(s.role)}</td><td><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.accession)}</a></td></tr>`).join('')}</tbody></table>
  <p class="note">Download: <a href="${publicFile(demo.download || 'downloads/cellaris-demo-pdac-results.zip')}" download>PDAC demo results (CSV tables and figures)</a></p></div></section>
  <section class="card section"><div class="card-head"><div><div class="card-title">Gene-set resources</div><div class="card-sub">Definitions behind the signaling and functional pathways and the pathway enrichment of comparisons</div></div></div>
  <div class="card-body table-wrap"><table class="table"><thead><tr><th>Resource</th><th>Version</th><th>License</th><th>Citation</th></tr></thead><tbody>${GENESET_CREDITS.map(([n, v, l, c, dois]) => `<tr><td><b style="font-weight:600">${esc(n)}</b></td><td>${esc(v)}</td><td>${esc(l)}</td><td>${esc(c)}${[].concat(dois || []).map(x => ` <a href="https://doi.org/${esc(x)}" target="_blank" rel="noopener">doi:${esc(x)}</a>`).join(';')}</td></tr>`).join('')}</tbody></table>
  <p class="note">MSigDB gene sets: © Broad Institute, Inc., Massachusetts Institute of Technology and Regents of the University of California, used under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. PROGENy under the <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener">Apache License 2.0</a>. Changes: gene symbols were matched to the genes of the built-in reference; sets were filtered by size (Hallmark 5–1,000 genes; Reactome, WikiPathways and GO Biological Process 10–500 genes); PROGENy was limited to the 500 top-weighted genes per pathway. Results downloads include the license texts. No endorsement by the source projects is implied.</p></div></section>
  <section class="card section"><div class="card-head"><div><div class="card-title">Data handling</div></div></div>
    <div class="card-body prose"><p>The website checks the file format in your browser and sends the count matrix only to the Cellaris compute workspace you connect. The website itself stores no data. Download your results before the workspace's retention period ends.</p></div></section>`;
}
const GENESET_CREDITS = [
  ['Molecular Signatures Database (MSigDB)', 'v2026.2.Hs', 'CC BY 4.0', 'Liberzon et al., Bioinformatics 2011', '10.1093/bioinformatics/btr260'],
  ['MSigDB Hallmark gene sets', 'v2026.2.Hs', 'CC BY 4.0', 'Liberzon et al., Cell Systems 2015', '10.1016/j.cels.2015.12.004'],
  ['Reactome pathways (MSigDB C2:CP:Reactome)', 'Reactome release 97', 'CC0 1.0 (Reactome); CC BY 4.0 (MSigDB)', 'Milacic et al., Nucleic Acids Research 2024', '10.1093/nar/gkad1025'],
  ['WikiPathways (MSigDB C2:CP:WikiPathways)', 'Release 2026-10-10', 'CC0 1.0 (WikiPathways); CC BY 4.0 (MSigDB)', 'Agrawal et al., Nucleic Acids Research 2024', '10.1093/nar/gkad960'],
  ['Gene Ontology, Biological Process (MSigDB C5:GO:BP)', 'GO release 2026-07-26', 'CC BY 4.0', 'Ashburner et al., Nature Genetics 2000; The Gene Ontology Consortium, Genetics 2023. GO data archive (concept DOI; no version DOI is listed for the 2026-07-26 release):', ['10.1038/75556', '10.1093/genetics/iyad031', '10.5281/zenodo.1205166']],
  ['PROGENy pathway-responsive genes', 'model_human_full, 500 genes per pathway', 'Apache-2.0', 'Schubert et al., Nature Communications 2018', '10.1038/s41467-017-02391-6'],
  ['decoupler (scoring method)', '2.2.0', 'Software; not redistributed', 'Badia-i-Mompel et al., Bioinformatics Advances 2022', '10.1093/bioadv/vbac016'],
  ['Cross-database consistency labels, computed from public human islet single-cell RNA-seq data', 'Gene-set library 1.0.0', 'ArrayExpress and GEO public data; GSE85241 cell-type labels CC BY 4.0', 'Segerstolpe et al., Cell Metabolism 2016 (E-MTAB-5061); Muraro et al., Cell Systems 2016 (GSE85241; cell-type labels from Abdelaal et al. 2019); Lawlor et al., Genome Research 2017 (GSE86469):', ['10.1016/j.cmet.2016.08.020', '10.1016/j.cels.2016.09.002', '10.5281/zenodo.3357167', '10.1101/gr.212720.116']],
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
  return `<div class="ref-card">${icon('database')}<div><b>Human pancreas reference</b><small>9 healthy cell types · applied automatically · tumor cells are attributed to the nearest types</small></div></div>`;
}
function newAnalysis(force = false) {
  if (state.job && state.polling && !force) { jobModal(); return; }
  state.bulk = null; state.bulkInfo = null; state.groups = {};
  const schedule = Object.entries(SCHEDULES).map(([k, s]) => `<option value="${k}" ${k === 'quick' ? 'selected' : ''}>${esc(s.label)}</option>`).join('');
  modal('New analysis', 'Upload bulk RNA-seq counts from human pancreas or pancreatic tumors such as PDAC.',
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
      <p class="note" style="margin:0 0 10px">Assign samples to a test group (for example PDAC) and a reference group (for example adjacent pancreas), at least 2 samples each, to add differential expression, pathway enrichment and composition by group.</p>
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
const ENSEMBL_ID = /^ENS[A-Z]*G\d+/;
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
function resetViewState() {
  state.hidden.clear(); state.sample = 'all'; state.group = 'all'; state.gene = null; state.selSample = null; state.sort = {}; state.search = ''; state.category = 'all';
  state.gs.set = null; state.gs.limit = 60; state.gs.search = '';
  Object.assign(state.cmp, { setSearch: '', geneSearch: '', geneLimit: 60, setLimit: 40, gene: null, set: null });
  state.lit.conn = null; state.lit.filter = 'genes'; state.litCache = {}; state.mapFig = null;
  state.pathway = defaultPathway();
  state.compView = 'samples'; state.healthyView = 'markers'; state.lookup = { q: '', gene: null, all: false }; state.spatial = { section: null, regions: false };
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
        resetViewState();
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
  const d = state.data, canJob = d.origin === 'job' && state.job?.id && state.worker.ready;
  modal('Export', esc(d.title),
    `<div class="grid">
      <button class="btn btn-secondary" data-action="exportjson">${icon('download')} Workspace file (JSON, reopen with Import)</button>
      <button class="btn btn-secondary" data-action="exportcomposition">${icon('download')} Per-sample composition (CSV)</button>
      <button class="btn btn-secondary" data-action="exportpathways" ${d.metabolic ? '' : 'disabled'}>${icon('download')} Metabolic pathway activity by cell type (CSV)</button>
      <button class="btn btn-secondary" data-action="exportliterature" ${d.metabolic ? '' : 'disabled'}>${icon('download')} Literature support per reaction step (CSV)</button>
      <button class="btn btn-secondary" data-action="exportgenesets" ${d.genesets || d.genesetsUrl ? '' : 'disabled'}>${icon('download')} Signaling and functional pathway activity (CSV)</button>
      <button class="btn btn-secondary" data-action="exportgenes" ${Object.keys(d.geneExpression).length ? '' : 'disabled'}>${icon('download')} Marker genes (CSV)</button>
      <button class="btn btn-secondary" data-action="exportde" ${d.comparison ? '' : 'disabled'}>${icon('download')} Comparison: differential expression (CSV)</button>
      <button class="btn btn-secondary" data-action="exportenrich" ${d.comparison ? '' : 'disabled'}>${icon('download')} Comparison: pathway enrichment (CSV)</button>
      ${d.origin === 'demo' ? `<a class="btn btn-secondary" href="${publicFile(d.download || 'downloads/cellaris-demo-pdac-results.zip')}" download>${icon('download')} PDAC demo results (ZIP)</a>` : ''}
      <button class="btn btn-secondary" data-action="downloadjob" ${canJob ? '' : 'disabled'}>${icon('download')} Full analysis results (ZIP)</button>
    </div>${canJob ? '' : '<p class="note">Full results are available for analyses run in this session.</p>'}`);
}
function guide() {
  modal('Getting started', 'Analyze human pancreas or PDAC bulk RNA-seq in four steps.',
    `<div class="prose"><ol>
      <li><b>Prepare counts.</b> A genes × samples matrix of raw integer counts with HGNC gene symbols (CSV or TSV) from pancreas or pancreatic tumor tissue.</li>
      <li><b>Connect.</b> Choose Connect workspace and enter the URL and access token provided by Cellaris.</li>
      <li><b>Upload and run.</b> Choose New analysis, select your count matrix, optionally assign two groups to compare, and start the analysis.</li>
      <li><b>Explore.</b> Review composition, the maps, metabolic and signaling pathways, marker genes and the comparison; export tables or the full results.</li>
    </ol></div>`, `<span>Human pancreas and PDAC · bulk RNA-seq</span><button class="btn btn-primary" data-action="new">New analysis</button>`);
}
function download(name, data, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([data], { type })), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
}
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
function exportPathways() {
  const d = state.data;
  const rows = [['pathway_id', 'pathway', 'category', 'reactions', 'mean_activity', 'highest_activity_in', ...d.cellTypes.map(t => t.name)], ...d.pathways.map(p => [p.id, p.name, p.category, p.reactionCount, p.score, p.top, ...p.activity])];
  download('cellaris-pathway-activity.csv', rows.map(r => r.map(csvCell).join(',')).join('\n'));
}
function exportComposition() {
  const d = state.data, types = d.cellTypes.map(t => t.name);
  const metaKeys = [...new Set(d.samples.flatMap(s => Object.keys(s.meta)))];
  const rows = [['sample', ...metaKeys, ...types, 'estimated_profiles'], ...d.samples.map(s => [s.id, ...metaKeys.map(k => s.meta[k]), ...types.map(t => s.fractions[t]), s.profiles])];
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
function exportWorkspace() {
  const d = state.data;
  download('cellaris-workspace.json', JSON.stringify({ title: d.title, description: d.description, samples: d.samples, markerInfo: d.markerInfo || undefined, pathwayInfo: d.pathwayInfo,
    result: { cellTypes: d.cellTypes, pathways: d.pathways, cells: d.cells, geneExpression: d.geneExpression, counts: d.counts, metadata: { ...d.metadata, metabolicModel: d.metabolic }, warnings: d.warnings, genesets: d.genesets || undefined, comparison: d.comparison || undefined } }), 'application/json');
}

/* ---------- Events ---------- */
const ROW_KEYS = ['pathway', 'gs', 'litrow', 'samplePick', 'gene', 'cmpgene', 'cmpset'];
document.addEventListener('click', e => {
  const link = e.target.closest('a[href]');
  if (link && !link.dataset.view) return;   /* ordinary links (PubMed, KEGG, downloads) open without selecting the row */
  const el = e.target.closest('[data-view],[data-action],[data-pathway],[data-type],[data-color],[data-gene],[data-figure],[data-src],[data-gscol],[data-gs],[data-gstype],[data-littype],[data-cmpcol],[data-cmpgene],[data-cmpset],[data-sort-table],[data-sample-pick],[data-space],[data-mapgroup],[data-heat-all],[data-heat-scale],[data-litfilter],[data-litrow],[data-ovgene],[data-ovset],[data-gsjump],[data-lookup],[data-compview],[data-healthyview],[data-focustype],[data-spsection],.modal-close,.menu-btn,.overlay');
  if (!el) return;
  if (el.classList.contains('overlay')) { if (e.target === el) closeModal(); return; }
  if (el.classList.contains('modal-close')) { closeModal(); return; }
  if (el.classList.contains('menu-btn')) { $('#sidebar').classList.toggle('open'); return; }
  const ds = el.dataset;
  if (ds.view) { e.preventDefault(); $('#modal-root').innerHTML = ''; setView(ds.view); return; }
  if (ds.sortTable) { toggleSort(ds.sortTable, ds.sortKey); if (ds.sortTable === 'lit') rerenderLiterature(); else rerender(); return; }
  if (ds.pathway) { state.pathway = ds.pathway; state.lit.conn = null; if (state.view === 'pathways') rerender(); else setView('pathways'); return; }
  if (ds.samplePick) { state.selSample = ds.samplePick; rerender(); return; }
  if (ds.space) { state.mapSpace = ds.space; if (ds.space === 'metabolic' && state.group === HEALTHY) state.group = 'all'; rerender(); return; }
  if (ds.ovgene) { state.cmp.gene = ds.ovgene; state.cmp.geneSearch = ''; setView('genes'); return; }
  if (ds.ovset) { if (ds.ovcol) state.cmp.collection = ds.ovcol; state.cmp.set = ds.ovset; state.cmp.setSearch = ''; setView('compare'); return; }
  if (ds.gsjump) { if (ds.gscolj) state.gs.on.add(ds.gscolj); state.gs.set = ds.gsjump; state.gs.search = ''; setView('signaling'); return; }
  if (ds.lookup) { state.lookup.gene = ds.lookup; state.lookup.q = ds.lookup; state.lookup.all = false; rerender(); return; }
  if (ds.compview) { state.compView = ds.compview; rerender(); return; }
  if (ds.healthyview) { state.healthyView = ds.healthyview; rerender(); return; }
  if (ds.focustype) { const all = state.data.cellTypes.map(t => t.name), only = all.filter(t => !state.hidden.has(t)); state.hidden = only.length === 1 && only[0] === ds.focustype ? new Set() : new Set(all.filter(t => t !== ds.focustype)); rerender(); return; }
  if (ds.spsection) { state.spatial.section = ds.spsection; rerender(); return; }
  if (ds.mapgroup) { state.group = ds.mapgroup; state.sample = 'all'; rerender(); return; }
  if (ds.heatAll !== undefined) { state.heatAll = ds.heatAll === '1'; rerender(); return; }
  if (ds.heatScale) { state.heatScale = ds.heatScale; rerender(); return; }
  if (ds.litfilter) { state.lit.filter = ds.litfilter; rerenderLiterature(); return; }
  if (ds.litrow) { state.lit.conn = state.lit.conn === ds.litrow ? null : ds.litrow; rerenderLiterature(); if (!state.lit.conn && window.Plotly && $('#pathway-map')?.data) window.Plotly.relayout($('#pathway-map'), { shapes: [], annotations: [] }); return; }
  if (ds.gscol) { const k = ds.gscol; if (state.gs.on.has(k)) { if (state.gs.on.size > 1) state.gs.on.delete(k); } else state.gs.on.add(k); state.gs.limit = 60; rerender(); return; }
  if (ds.littype) { state.lit.type = ds.littype; rerender(); return; }
  if (ds.gstype) { state.gs.type = ds.gstype; rerender(); return; }
  if (ds.gs) { state.gs.set = ds.gs; rerender(); return; }
  if (ds.cmpcol) { state.cmp.collection = ds.cmpcol; state.cmp.setLimit = 40; state.cmp.set = null; rerender(); return; }
  if (ds.cmpgene) { state.cmp.gene = ds.cmpgene; rerender(); return; }
  if (ds.cmpset) { state.cmp.set = ds.cmpset; rerender(); return; }
  if (ds.type) { const t = ds.type; state.hidden.has(t) ? state.hidden.delete(t) : state.hidden.add(t); rerender(); return; }
  if (ds.color) { state.colorBy = ds.color; rerender(); return; }
  if (ds.gene) { state.gene = ds.gene; rerender(); return; }
  if (ds.figure !== undefined) { const f = ((state.data.figures.length ? state.data.figures : DEMO().figures) || [])[Number(ds.figure)]; if (f) lightbox(f.png, f.title); return; }
  if (ds.src) { lightbox(ds.src, el.alt || 'Figure'); return; }
  switch (ds.action) {
    case 'new': newAnalysis(); break;
    case 'freshanalysis': state.job = null; state.polling = false; newAnalysis(true); break;
    case 'worker': workerModal(); break;
    case 'guide': guide(); break;
    case 'export': exportModal(); break;
    case 'import': $('#result-file').click(); break;
    case 'demo': $('#modal-root').innerHTML = ''; openDemo(); break;
    case 'exportjson': exportWorkspace(); break;
    case 'gsmore': state.gs.limit += 60; rerender(); break;
    case 'exportgenesets': exportGenesets(); break;
    case 'exportgssamples': exportGenesetSamples(); break;
    case 'exportgenes': exportGenes(); break;
    case 'exportde': exportDE(); break;
    case 'exportenrich': exportEnrichment(); break;
    case 'cmpsetmore': state.cmp.setLimit += 40; rerender(); break;
    case 'cmpgenemore': state.cmp.geneLimit += 60; rerender(); break;
    case 'exportpathways': exportPathways(); break;
    case 'exportcomposition': exportComposition(); break;
    case 'exportliterature': exportLiterature(); break;
    case 'lookupall': state.lookup.all = true; rerender(); break;
    case 'spzoom': spatialZoom(ds.spkind, ds.spid, ds.splabel); break;
    case 'spregions': state.spatial.regions = !state.spatial.regions; rerender(); break;
    case 'downloadjob': downloadJob('results'); break;
    case 'hidejob': closeModal(); break;
    case 'resumejob': if (state.job && state.worker.ready) { state.job.pollingError = null; state.polling = true; jobModal(); pollJob(); } break;
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'sample-select') { state.sample = e.target.value; drawEmbedding(); }
  if (e.target.id === 'category-select') { state.category = e.target.value; rerender(); }
  if (e.target.dataset?.grp !== undefined && state.bulkInfo) {
    const sm = state.bulkInfo.samples[Number(e.target.dataset.grp)];
    if (e.target.value) state.groups[sm] = e.target.value; else delete state.groups[sm];
    const g = Object.values(state.groups), c = $('#grp-count'); if (c) c.textContent = `Test group: ${g.filter(v => v === 't').length} · reference group: ${g.filter(v => v === 'r').length}`;
    updateEstimate();
  }
});
document.addEventListener('input', e => {
  const live = { 'pathway-search': v => { state.search = v; }, 'gs-search': v => { state.gs.search = v; state.gs.limit = 60; }, 'cmp-set-search': v => { state.cmp.setSearch = v; }, 'cmp-gene-search': v => { state.cmp.geneSearch = v; }, 'lookup-input': v => { state.lookup.q = v; state.lookup.gene = null; state.lookup.all = false; } }[e.target.id];
  if (live) {
    const id = e.target.id, pos = e.target.selectionStart; live(id === 'lookup-input' ? e.target.value : e.target.value.toLowerCase()); rerender();
    const input = $(`#${id}`); if (input) { input.focus(); input.setSelectionRange(pos, pos); }
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('.overlay')) closeModal();
  if (e.key === 'Enter' && e.target.matches?.('tr.clickable')) e.target.click();
  if (e.key === 'Enter' && e.target.id === 'lookup-input') { const b = $('#lookup-matches button, #lookup-ambiguous button'); if (b) b.click(); }
});
$('#result-file').onchange = async e => {
  try {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 40 * 1024 * 1024) throw new Error('Result files must be smaller than 40 MB.');
    const raw = JSON.parse(await file.text());
    state.data = prepare({ title: raw.title || file.name.replace(/\.json$/i, ''), description: raw.description || 'Imported Cellaris result.', ...raw, result: raw.result || raw }, 'import');
    resetViewState(); state.job = null; state.polling = false;
    setView('overview'); toast('Result imported');
  } catch (error) { toast(`Import failed: ${error.message}`); } finally { e.target.value = ''; }
};
function loadDemo() { state.data = prepare(DEMO(), 'demo'); resetViewState(); }
function openDemo(view = null) {
  try {
    state.demoRaw = window.CELLARIS_DEMO; state.job = state.polling ? state.job : null; loadDemo();
    history.replaceState(null, '', `${location.pathname}${location.hash}`);
    setView(view || 'overview');
  } catch (e) { toast(`The demo could not be loaded (${e.message}).`); }
}
function init() {
  $$('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); });
  try { state.demoRaw = window.CELLARIS_DEMO; loadDemo(); } catch (e) { $('#view').innerHTML = `<div class="card"><div class="empty">The demo data could not be loaded: ${esc(e.message)}</div></div>`; return; }
  if (location.search) history.replaceState(null, '', `${location.pathname}${location.hash}`);   /* links to the former demos open the PDAC demo */
  const hash = location.hash.slice(1);
  setView(VIEWS[hash] ? hash : 'overview');
}
init();
