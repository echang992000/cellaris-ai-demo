'use strict';
/* Cellaris AI Demo: cell-type, metabolic and signaling insight from bulk RNA-seq of pancreatic ductal adenocarcinoma (PDAC). */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d = 0) => (v !== null && v !== '' && Number.isFinite(Number(v))) ? Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
/* Numbers with 3 significant figures at most: never "-0.00" for a value that rounds to zero; thousands separators from 1,000. */
const sig = v => { if (!Number.isFinite(v)) return '—'; const a = Math.abs(v), d = a >= 100 ? 0 : a >= 10 ? 1 : 2, s = v.toFixed(d); return Number(s) === 0 ? (0).toFixed(d) : a >= 1000 ? Number(s).toLocaleString('en-US') : s; };
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

/* ---------- Metabolic pathways: helpers ---------- */
const METABOLIC_TOP = 30; /* rows of the default heatmap: the same pathways as Figure 3 */
const metabolicMapId = id => (/^rn\d{5}$/.test(String(id)) ? `hsa${String(id).slice(2)}` : String(id));
const metabolicNotes = () => (state.data?.origin === 'demo' ? DEMO().metabolicNotes || null : null);
const metabolicInfo = (d, id) => d.pathwayInfo?.[id] || {};
const metabolicDrawn = d => d.pathways.filter(p => !isOverviewMap(p.id)).length;
function metabolicCountText(d) {
  const n = metabolicDrawn(d), o = d.pathways.length - n;
  return `${plural(n, 'KEGG pathway')}${o ? ` and ${plural(o, 'KEGG overview map')}` : ''}`;
}
/* Lead of the highest cell type: its value divided by the value of the second cell type. */
function metabolicLead(d, p) {
  const o = p.activity.map((v, i) => [v, i]).filter(x => Number.isFinite(x[0])).sort((a, b) => b[0] - a[0]);
  return o.length > 1 && o[1][0] > 0 ? `${(o[0][0] / o[1][0]).toFixed(2)} × ${typeNoun(d.cellTypes[o[1][1]].name)}` : '';
}
function metabolicBadges(d, p) {
  return (metabolicInfo(d, p.id).flags || []).filter(f => f[0] !== 'content').map(f => ` <span class="badge warn" data-metabolic-badge="${esc(f[0])}" title="${esc(f[2])}">${esc(f[1])}</span>`).join('');
}
/* Upper end of the color scale of the activity heatmap: the 95th percentile of the values shown, so that one cell does not set the scale. */
function metabolicCap(values) {
  const v = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!v.length) return { max: 1, capped: false };
  const q = v[Math.max(0, Math.ceil(0.95 * v.length) - 1)], top = v[v.length - 1];
  return q > 0 && q < top ? { max: q, capped: true } : { max: top || 1, capped: false };
}
function metabolicColor(scale, t) {
  const x = Math.max(0, Math.min(1, t)); let k = 0;
  while (k < scale.length - 2 && x > scale[k + 1][0]) k++;
  const [a, ca] = scale[k], [b, cb] = scale[k + 1], f = b > a ? (x - a) / (b - a) : 0, rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const u = rgb(ca), w = rgb(cb);
  return `rgb(${u.map((y, i) => Math.round(y + (w[i] - y) * f)).join(', ')})`;
}
/* Reaction activity is never negative: color the lines of a pathway map on a scale from 0 to the map's highest step
   (the map files carry a scale that is symmetric around 0). Returns false, and changes nothing, if the map has another layout. */
function metabolicRescaleMap(fig, hover) {
  const bar = fig.data.find(t => t.marker?.colorbar && Number.isFinite(t.marker.cmax) && Array.isArray(t.marker.colorscale)), lines = fig.data.filter(t => t.mode === 'lines' && t.line);
  if (!bar || !hover || !(bar.marker.cmax > 0) || lines.length !== hover.text.length || !bar.marker.colorscale.every(s => /^#[0-9a-f]{6}$/i.test(s[1]))) return false;
  const vals = hover.text.map(x => Number((String(x).match(/units\): (-?[0-9.]+(?:e-?[0-9]+)?)/i) || [])[1]));
  if (!vals.every(v => Number.isFinite(v) && v >= 0)) return false;
  bar.marker.cmin = 0;
  lines.forEach((t, j) => { t.line = { ...t.line, color: metabolicColor(bar.marker.colorscale, vals[j] / bar.marker.cmax) }; });
  return true;
}
/* Hover text of a reaction step: steps without a gene in the model say so, and name the tested genes that KEGG lists for the step. */
function metabolicStepHover(d, id, c) {
  if (c.genes?.length) return hoverLiterature(c);
  const n = (metabolicInfo(d, id).stepNotes || []).find(x => x[0] === c.i);
  return '<br>Enzyme genes: none in the metabolic model' + (!n ? '' : n[2] === 'kegg' ? `<br>KEGG lists for this step: ${esc(n[3].join(', '))}<br>(tested genes, not used by the model)` : n[2] === 'untested' ? '<br>KEGG lists human genes for this step; none of them was tested' : '<br>KEGG assigns no human gene to this step');
}
function metabolicStepNotes(d, p) {
  const seen = new Set(), rows = (metabolicInfo(d, p.id).stepNotes || []).filter(n => { const k = `${n[1]}|${n[3].join(',')}`; if (seen.has(k)) return false; seen.add(k); return true; });
  if (!rows.length) return '';
  const item = n => `<li><b>${esc(n[1])}</b>: ${n[2] === 'kegg' ? `KEGG lists ${n[3].map(g => `<span class="chip">${esc(g)}</span>`).join(' ')} (tested, not used by the model)` : n[2] === 'untested' ? 'KEGG lists human genes for this step; none of them was tested' : 'KEGG assigns no human gene to this step'}</li>`;
  return `<details class="lit-defs" id="metabolic-steps"${rows.length <= 5 ? ' open' : ''}><summary>${plural(rows.length, 'reaction step')} of this map ${rows.length === 1 ? 'has' : 'have'} no gene in the metabolic model</summary>
    <ul class="plain" style="margin-top:8px">${rows.map(item).join('')}</ul><p class="note">The model gives these steps an activity value although it attaches no gene to them. A name in brackets is the name of the gene in the data.</p></details>`;
}
function metabolicGeneNotes(d, p) {
  const info = metabolicInfo(d, p.id), un = new Set(metabolicNotes()?.untested || []), nUn = p.genes.filter(g => un.has(g)).length;
  const chip = g => (un.has(g) ? `<span class="chip untested" title="Not among the genes tested in the bulk comparison (expression too low in these samples); not in the gene lookup">${esc(g)}</span>` : `<span class="chip">${esc(g)}</span>`);
  const more = p.genes.length > 48 ? `<details class="lit-defs" id="metabolic-allgenes"><summary>Show the other ${plural(p.genes.length - 48, 'gene')}</summary><div class="chips" style="margin-top:8px">${p.genes.slice(48).map(chip).join('')}</div></details>` : '';
  const own = 'These are the genes that the metabolic model attaches to the reactions of the pathway, not KEGG\u2019s human gene list for the pathway';
  const list = `<p class="note" id="metabolic-genelist">${own}${Number.isFinite(info.keggGenes) ? ` (${plural(info.keggGenes, 'gene')}): ${info.modelOnly ? `${num(info.modelOnly)} of the ${plural(p.genes.length, 'model gene')} ${info.modelOnly === 1 ? 'is' : 'are'} not in KEGG\u2019s list` : `all ${plural(p.genes.length, 'model gene')} are in KEGG\u2019s list`}` : ''}.${nUn ? ` ${plural(nUn, 'gene')} in gray ${nUn === 1 ? 'was' : 'were'} not among the tested genes (expression too low in these samples).` : ''}</p>`;
  const notUsed = info.notUsed?.length ? `<details class="lit-defs" id="metabolic-notused"${info.notUsed.length <= 12 ? ' open' : ''}><summary>KEGG lists ${plural(info.notUsed.length, 'more tested gene')} for this pathway, not used by the model</summary>
    <div class="chips" style="margin-top:8px">${info.notUsed.map(g => `<span class="chip">${esc(g)}</span>`).join('')}</div>${info.notUsed.some(g => g.includes('(')) ? '<p class="note">A name in brackets is the name of the gene in the data.</p>' : ''}</details>` : '';
  return `<div class="note" style="margin:16px 0 6px">Enzyme genes used by the metabolic model (${num(p.genes.length)})</div><div class="chips">${p.genes.slice(0, 48).map(chip).join('') || '<span class="note">No mapped genes.</span>'}</div>${more}${list}${notUsed}`;
}
/* Definitions of the tab, and for the demo what the values average, what activity is and which analysis runs are behind them. */
function metabolicReading(d) {
  const n = metabolicNotes();
  const defs = [
    ['Activity', n?.activity || 'Activity is an estimate of the metabolic model, in relative units. It is not the expression of a step\u2019s own enzyme genes, not a flux and not a metabolite level.'],
    ['Mean activity (all profiles)', 'Mean of the pathway\u2019s activity over all estimated profiles, so cell types with many profiles weigh more. It is not the mean of the cell-type values; Spread and the z-scores use the cell-type values.'],
    ['Highest in', `The cell type with the highest mean activity and its lead: its value divided by the value of the second cell type (1.05 × is 5% higher).${n?.level ? ` ${n.level}` : ''}${n?.runsShort ? ` ${n.runsShort}` : ''}`],
    ['Spread', '(Highest − lowest cell-type value) ÷ mean of the cell-type values.'],
    ['Reactions', 'Reactions of the metabolic model in the pathway; one model reaction can combine several KEGG reactions. The map and the literature table count reaction steps (lines between two metabolites), so their number can differ.'],
    ['Enzyme genes', n?.genes || 'The genes that the metabolic model attaches to its reactions, not KEGG\u2019s human gene list of the pathway.'],
    ['Pathway maps', `${n?.maps || 'The maps are KEGG reference maps, which also contain reactions of other organisms.'} A reaction step joins all reactions between two metabolites, in either direction (for example phosphofructokinase and fructose-bisphosphatase), and has one activity value. Line colors run from 0 to the highest step of each map and cannot be compared between maps.`],
    ['Notes on a pathway', 'Secreted enzymes, one gene and low expression are computed from the estimated expression of the pathway\u2019s genes. For each gene, the expression in the highest cell type minus its mean in the other cell types is taken (counts per 10,000; negative differences count as 0); a gene\u2019s share is its part of the sum over the pathway\u2019s genes. One gene: a single gene has at least 75% and the highest cell type leads by at least 1.2 ×. Secreted enzymes: digestive enzymes that acinar cells secrete have at least 75%. Low expression: no gene of the pathway reaches 0.2 in the highest cell type. Few steps with genes: fewer than half of the map\u2019s reaction steps have a gene in the model.'],
    ...(n?.runs ? [['Analysis runs', n.runs]] : []),
  ];
  return `<details class="lit-defs" id="metabolic-reading"><summary>How to read these values</summary><dl>${defs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></details>`;
}

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
  const tip = `${title ? `${String(title).replace(/\.\s*$/, '')}. ` : ''}Select to sort${on ? (s.dir > 0 ? ' (now ascending)' : ' (now descending)') : ''}`;
  return `<th class="sortable${isNum ? ' num' : ''}${cls ? ` ${cls}` : ''}${on ? (s.dir > 0 ? ' asc' : ' desc') : ''}" aria-sort="${aria}" scope="col"${style ? ` style="${style}"` : ''}><button type="button" class="th-sort" data-sort-table="${esc(id)}" data-sort-key="${esc(key)}" title="${esc(tip)}">${label}<span class="sort-ind" aria-hidden="true"></span></button></th>`;
}
function toggleSort(id, key, shown = 0) {
  const cur = state.sort[id] || (shown ? { key, dir: shown } : null);   /* shown: order drawn on the clicked header before any click */
  state.sort[id] = cur && cur.key === key ? { key, dir: -cur.dir } : { key, dir: 1 };
}
/* Re-render the current view, keeping the page and table scroll positions and the field that has the focus. */
function rerender() {
  const keep = $$('[data-scroll-id]').map(el => [el.dataset.scrollId, el.scrollTop, el.scrollLeft]);
  const y = window.scrollY, refocus = generalKeepFocus();
  render();
  for (const [id, t, l] of keep) { const el = $(`[data-scroll-id="${id}"]`); if (el) { el.scrollTop = t; el.scrollLeft = l; } }
  window.scrollTo(0, y); refocus();
}
/* ---------- General helpers (site audit of 20 November 2026) ---------- */
/* A field inside the view keeps focus and caret when the view is drawn again (for example when a file arrives). */
function generalKeepFocus() {
  const a = document.activeElement;
  if (!a || !a.id || !a.closest?.('#view') || !('selectionStart' in a)) return () => {};
  const id = a.id; let from = null, to = null;
  try { from = a.selectionStart; to = a.selectionEnd; } catch (e) { /* field type without a caret */ }
  return () => { const el = document.getElementById(id); if (!el || document.activeElement === el) return; el.focus(); try { if (from !== null) el.setSelectionRange(from, to); } catch (e) { /* no caret */ } };
}
/* Table filters: the field keeps the text as typed; the filter uses it trimmed and in lower case. */
const generalTyped = {};
const GENERAL_FILTERS = { 'pathway-search': () => state.search, 'gs-search': () => state.gs.search, 'cmp-set-search': () => state.cmp.setSearch, 'cmp-gene-search': () => state.cmp.geneSearch };
function generalFilterText(id, raw) { generalTyped[id] = raw; return raw.trim().toLowerCase(); }
function generalRestoreTyped() {
  for (const [id, get] of Object.entries(GENERAL_FILTERS)) {
    const el = document.getElementById(id), raw = generalTyped[id];
    if (el && typeof raw === 'string' && raw.trim().toLowerCase() === get() && el.value !== raw) el.value = raw;
  }
}
/* A group name inside a sentence starts in lower case ("PDAC vs adjacent pancreas"); acronyms keep their capitals.
   Table headers, legends and chips show the name as stored. */
const generalGroupInText = g => { const t = String(g ?? ''); return /^[A-Z][a-z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t; };
const generalVs = c => `${c.test} vs ${generalGroupInText(c.reference)}`;
/* The built-in reference, stated wherever it is described. */
const GENERAL_REFERENCE = 'islet preparations of four organ donors, one of whom had type 2 diabetes';
/* Address and page title follow the tab; Back and Forward move between tabs. #compare still opens Bulk signaling. */
const GENERAL_HASH = { compare: 'bulk-signaling' }, GENERAL_HASH_VIEW = { 'bulk-signaling': 'compare', bulk: 'compare', comparison: 'compare' };
const generalViewOfHash = h => { const k = String(h || '').replace(/^#/, '').toLowerCase(); return VIEWS[k] ? k : GENERAL_HASH_VIEW[k] || null; };
function generalAddress(view) {
  const url = `#${GENERAL_HASH[view] || view}`, first = !generalAddress.title;
  if (first) generalAddress.title = document.title;
  if (first || generalViewOfHash(location.hash) === view) history.replaceState(null, '', url); else history.pushState(null, '', url);
  document.title = `${VIEWS[view]} · ${generalAddress.title}`;
}
function generalFollowAddress() { const v = generalViewOfHash(location.hash); if (v && v !== state.view && state.data) { $('#modal-root').innerHTML = ''; setView(v); } }
function generalMenuState(open) { const b = $('.menu-btn'); if (b) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); } }
/* Headline numbers, each with one definition. Numbers that live in files loaded on demand come from siteNumbers in demo-data.js. */
function generalNumbers(d) {
  const n = d.origin === 'demo' ? (DEMO().siteNumbers || {}) : {}, c = d.comparison, s = c?.de?.summary || {}, f = cohortFacts(d);
  const cols = d.genesets ? Object.values(d.genesets.collections) : null, sum = k => cols.reduce((a, x) => a + (x[k] || 0), 0);
  /* the shipped numbers come first, so that a count does not depend on which tab was opened before */
  const scored = n.geneSetsScored ?? (cols ? sum('scorableSets') : null), listed = n.geneSetsListed ?? (cols ? sum('shownSets') : null);
  const by = n.geneSetsScoredBy || (cols ? Object.fromEntries(Object.entries(d.genesets.collections).map(([k, x]) => [k, x.scorableSets])) : null);
  const go = n.goTermsScored ? [n.goTermsScored, n.goThemesListed] : cols && d.genesets.collections.GOBP ? [d.genesets.collections.GOBP.scorableSets, d.genesets.collections.GOBP.shownSets] : null;
  const bulk = Object.values(c?.pathways?.collections || {}), tested = bulk.reduce((a, x) => a + (x.tested || 0), 0) || null;
  const overviewMaps = d.pathways.filter(p => isOverviewMap(p.id)).length;
  return { n, f, s, scored, listed, by, go, tested, testedDatabases: bulk.length, overviewMaps, pathwayMaps: d.pathways.length - overviewMaps };
}
/* Overview: gene sets under "Pathways scored" (scored and listed are different counts). */
function generalSetsFoot(d) {
  const g = generalNumbers(d);
  if (!g.scored && !g.listed) return '';
  return g.scored && g.listed && g.scored !== g.listed ? ` · ${num(g.scored)} signaling and functional gene sets scored, ${num(g.listed)} listed` : ` · ${num(g.scored || g.listed)} signaling and functional gene sets`;
}
/* About: every headline number of the site once, with what it counts and where it is shown. */
function generalNumbersCard(d) {
  const g = generalNumbers(d), n = g.n, s = g.s, c = d.comparison, lm = literatureMeta(), has = v => Number.isFinite(v);
  const per = g.by ? ` (${GS_ORDER.filter(k => g.by[k]).map(k => `${GS_LABEL[k]} ${num(g.by[k])}`).join(', ')})` : '';
  const t = c ? esc(c.test) : '';
  const rows = [
    ['profiles', 'Estimated single-cell profiles', d.counts.cells, `All samples together.${g.f.perSampleRange ? ` ${num(g.f.perSample)} are requested per sample; the number per cell type is rounded to whole profiles, so a sample has ${g.f.perSampleLo} to ${g.f.perSampleHi}.` : ''}`, 'Overview, Samples, Figures'],
    ['sets-scored', 'Gene sets scored', g.scored, `Gene sets of the five databases scored in the estimated profiles${per}.`, 'About, results download'],
    ['sets-listed', 'Gene sets listed', g.listed !== g.scored ? g.listed : null, g.go ? `The scored sets as listed: the ${num(g.go[0])} GO Biological Process terms are grouped into ${num(g.go[1])} themes; the other databases are listed in full.` : 'The scored sets as listed, after grouping of related sets.', 'Overview, Cell-type signaling'],
    ['sets-tested', 'Gene sets tested between the groups', g.tested, `Sets with 15 to 500 genes among the tested genes, in ${num(g.testedDatabases)} databases. PROGENy pathways are tested separately.`, 'Bulk signaling'],
    ['sets-lookup', 'Gene sets in the gene lookup', n.geneSetsLookup, `The ${num(n.geneSetsListed)} listed sets and ${num(n.geneSetsLookupBulkOnly)} GO Biological Process sets that appear only in the bulk comparison.`, 'Overview (gene lookup)'],
    ['sets-section', 'Gene sets on the tissue section', n.geneSetsSection, `Sets of the gene lookup with at least 5 member genes measured on the section (${num(n.geneSetsSectionNotScored)} have fewer).`, 'Tissue section views'],
    ['genes-tested', 'Genes tested', s.n_genes_tested, 'Genes that passed the expression filter of the bulk comparison.', 'Overview (gene lookup), Gene expression'],
    ['genes-padj', 'Genes with adjusted p < 0.05', s.n_sig, `${num(s.n_sig_up)} higher and ${num(s.n_sig_down)} lower in ${t}, at any fold change.`, 'Overview, Gene expression, Figures'],
    ['genes-called', 'Genes with a call', has(s.n_display_up) && has(s.n_display_down) ? s.n_display_up + s.n_display_down : null, `Adjusted p < 0.05 and a shrunken change of at least 2-fold: ${num(s.n_display_up)} higher and ${num(s.n_display_down)} lower in ${t}.`, 'Volcano plot, gene tables, gene lookup'],
    ['genes-profiles', 'Genes in the estimated profiles', n.sharedGenes, `Genes shared by the bulk counts and the reference; gene-set scores and the gene lookup use them. The metabolic model and the similarity table on the Samples tab use ${num(d.counts.genes)} selected genes.`, 'Cell-type signaling, Samples'],
    ['papers-steps', 'Papers for reaction steps', d.metabolic && lm ? lm.papers : null, `${esc(scopeInfo().col)} that mention at least one of the ${num(lm?.genes)} enzyme genes${litScope() === 'cancer' && lm?.papersAllPancreas ? `; ${num(lm.papersAllPancreas)} human pancreas papers do` : ''}.`, 'Metabolic pathways'],
    ['papers-genes', 'Papers for genes, gene sets and cell types', n.litGenePapers, `Human pancreatic tumor papers that mention any human gene (${num(n.litGenes)} genes); ${num(n.litGenePapersAllPancreas)} human pancreas papers do.`, 'Gene lookup, Gene expression, Cell-type signaling'],
    ['reference-cells', 'Reference cells', n.referenceCells, `Cells of the built-in reference: ${GENERAL_REFERENCE} (${num(n.referenceCellsT2D)} cells). ${num(n.referenceCellsShown)} are drawn on the map.`, 'Samples'],
    ['gtex', 'Healthy pancreas samples (GTEx)', n.gtexSamples, `GTEx pancreas samples; ${num(n.gtexShown)} are drawn, averages use all.`, 'Samples'],
    ['section-areas', 'Tissue-section areas', n.sectionAreas, `Capture spots of one tissue section merged 2 x 2, ${n.sectionAreaSizeMm ? `${n.sectionAreaSizeMm[0].toFixed(2)} x ${n.sectionAreaSizeMm[1].toFixed(2)}` : `about ${n.sectionAreaMm}`} mm each.`, 'Tissue section views'],
    ['pathways', 'KEGG pathways scored', d.metabolic ? d.pathways.length : null, `${num(g.pathwayMaps)} pathways with a map and ${num(g.overviewMaps)} KEGG overview maps, which mostly repeat reactions of the other pathways and have no map.`, 'Overview, Metabolic pathways, Figures'],
  ].filter(r => has(r[2]));
  if (rows.length < 2) return '';
  return `<section class="card section" id="about-numbers"><div class="card-head"><div><div class="card-title">Numbers on this site</div><div class="card-sub">What each count means and where it is shown</div></div></div>
  <div class="card-body table-wrap"><table class="table compact"><thead><tr><th>Number</th><th class="num">Value</th><th>What it counts</th><th>Shown on</th></tr></thead><tbody>${rows.map(([k, label, v, def, where]) => `<tr data-number="${k}"><td><b style="font-weight:600">${esc(label)}</b></td><td class="num">${num(v)}</td><td>${def}</td><td>${esc(where)}</td></tr>`).join('')}</tbody></table></div></section>`;
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
    meta: comparison ? { Group: comparison.samples?.[String(s.id)] ?? 'Not compared', ...(s.meta || {}), ...(comparison.composition ? { 'Fit to reference': outside.has(String(s.id)) ? 'Poor' : 'Adequate' } : {}) } : (s.meta || {}),
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
  generalAddress(state.view);
  render(); window.scrollTo(0, 0); $('#sidebar').classList.remove('open'); generalMenuState(false);
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
  $$('.nav-item[data-view]').forEach(b => { const on = b.dataset.view === state.view; b.classList.toggle('active', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('#crumb').textContent = VIEWS[state.view];
  /* integration (metabolic-017): the badge counts the pathways with a map; the overview maps repeat their reactions */
  $('#pathway-count').textContent = d.pathways.length ? metabolicDrawn(d) : '';
  $('#pathway-count').title = d.pathways.length ? metabolicCountText(d) : '';
  $('#dataset-name').textContent = d.origin === 'demo' ? DEMO().shortTitle || d.title : d.title;
  $('#dataset-meta').textContent = `${plural(d.counts.samples, 'sample')}${d.counts.cells ? ` · ${num(d.counts.cells)} estimated profiles` : ''}`;
  const back = $('#demo-return'); if (back) back.classList.toggle('hidden', d.origin === 'demo');
  const views = { overview: viewOverview, samples: viewSamples, pathways: viewPathways, signaling: viewSignaling, compare: viewCompare, genes: viewGenes, figures: viewFigures, about: viewAbout };
  $('#view').innerHTML = views[state.view]();
  generalRestoreTyped();
  if (state.view === 'samples') { drawEmbedding(); drawEmbedding('.embedding.mini', { sampleOnly: state.selSample }); }
  if (state.view === 'pathways' && d.metabolic) { drawPathwayHeatmap(); loadPathwayMap(); loadLiterature(); }
  if (state.view === 'genes' && d.comparison) { drawVolcano(); loadBulkAll(); }
  drawSpatial();
  const bl = $('#build-label'); if (bl) bl.textContent = d.origin === 'demo' && DEMO().build?.label ? ` · ${DEMO().build.label}${DEMO().build.revisionText ? `, ${DEMO().build.revisionText}` : ''}` : '';
}

/* ---------- Shared: key terms ---------- */
function cohortFacts(d) {
  const c = d.comparison, n = d.samples.length || d.counts.samples || 0;
  const groups = c ? groupNames(d).map(g => [g, Object.values(c.samples || {}).filter(x => x === g).length]) : [];
  const patients = new Set(d.samples.map(s => s.meta?.Patient).filter(Boolean)).size;
  const perSample = n && d.counts.cells ? Math.round(d.counts.cells / n) : null;
  /* "300 per sample" only when every sample has that number; otherwise "about 300 per sample" with the range */
  const per = d.samples.map(s => s.profiles).filter(Number.isFinite), perSampleLo = per.length ? Math.min(...per) : null, perSampleHi = per.length ? Math.max(...per) : null;
  const ranged = perSample && perSampleLo !== perSampleHi, perSampleAbout = perSample ? `${ranged ? 'about ' : ''}${num(perSample)} per sample` : '';
  const perSampleRange = ranged ? `${num(perSampleLo)} to ${num(perSampleHi)} per sample` : '', perSampleText = ranged ? `${perSampleAbout} (${num(perSampleLo)} to ${num(perSampleHi)})` : perSampleAbout;
  return { n, groups, patients, perSample, perSampleLo, perSampleHi, perSampleAbout, perSampleRange, perSampleText };
}
function glossary(d, { compact = false } = {}) {
  const f = cohortFacts(d);
  const grp = f.groups.length ? ` (${f.groups.map(([g, k]) => `${num(k)} ${esc(generalGroupInText(g))}`).join(', ')}${f.patients ? `, from ${plural(f.patients, 'patient')}` : ''})` : '';
  const items = [
    ['Sample', `One bulk RNA-seq library from one tissue specimen. This analysis has ${plural(f.n, 'sample')}${grp}. Composition, comparisons and per-sample values are reported per sample.`],
    ['Estimated profile', `One computationally estimated single-cell expression profile. Cellaris generates profiles from each bulk sample${f.perSample ? ` (${f.perSampleAbout} here, ${num(d.counts.cells)} in total${f.perSampleRange ? `; ${f.perSampleRange}, because the number per cell type is rounded to whole profiles` : ''})` : ''}, divided among cell types in proportion to the sample's estimated composition. Profiles are model estimates conditioned on the reference, not measured cells.`],
    ['Cell type', `One of the ${num(d.cellTypes.length)} cell types of the built-in human pancreas reference, called the healthy reference on this site: ${GENERAL_REFERENCE} (Baron et al. 2016). It is not whole pancreas and contains no tumor tissue. Malignant cells and cancer-associated fibroblasts have no type of their own; their expression is attributed to the most similar reference types.`],
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
    ['Estimated single-cell profiles', d.counts.cells, f.perSample ? `${f.perSampleText}, estimated from the bulk data` : 'Estimated from the bulk data'],
    ['Reference cell types', d.cellTypes.length, 'Healthy human pancreas reference'],
    d.metabolic ? ['Pathways scored', d.pathways.length, `KEGG metabolic pathways${generalSetsFoot(d)}`]
      : c ? ['Differentially expressed genes', c.de.summary?.n_sig, `${generalVs(c)}, adjusted p < 0.05`] : ['Gene sets scored', generalNumbers(d).scored ?? nSets, 'Signaling and functional pathways'],
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
  const gRow = x => `<tr class="clickable" data-ovgene="${esc(x.gene)}"><td><button type="button" class="name-link gene" data-ovgene="${esc(x.gene)}">${esc(x.gene)}</button>${lookupGeneSmall(d, x.gene)}</td><td class="num"><span class="heat" style="${diverge(x.log2FCShrunk, 4)}">${sig(x.log2FCShrunk)}</span></td><td class="num">${fmtP(x.padj)}</td></tr>`;
  const gTable = (rows, title) => `<div class="note" style="margin:10px 0 4px">${title}</div><div class="table-wrap"><table class="table compact"><thead><tr><th>Gene</th><th class="num" title="Shrunken log2 fold change, ${esc(generalVs(c))}">log2 fold change</th><th class="num">Adjusted p</th></tr></thead><tbody>${rows.map(gRow).join('') || '<tr><td colspan="3" class="empty">None.</td></tr>'}</tbody></table></div>`;
  const sRow = k => x => `<tr class="clickable" data-ovset="${esc(x.id)}" data-ovcol="${k}"><td><button type="button" class="name-link" data-ovset="${esc(x.id)}" data-ovcol="${k}">${esc(x.label)}</button></td><td class="num"><span class="heat" style="${diverge(x.nes, 3)}">${sig(x.nes)}</span></td><td class="num">${fmtP(x.padj)}</td></tr>`;
  const sTable = (o, title) => `<div class="note" style="margin:10px 0 4px">${title}</div><div class="table-wrap"><table class="table compact"><thead><tr><th>Gene set</th><th class="num" title="Normalized enrichment score">Score</th><th class="num">Adjusted p</th></tr></thead><tbody>${o.rows.map(sRow(o.k)).join('') || '<tr><td colspan="3" class="empty">None.</td></tr>'}</tbody></table></div>`;
  const prog = (c.pathways?.progeny || []).filter(x => x.padj < 0.05).sort((a, b) => b.score - a.score);
  const hall = c.pathways?.collections?.H?.sets || [], pk = x => String(x).toLowerCase().replace(/[^a-z0-9]/g, ''), opp = prog.filter(x => hall.some(h => pk(h.label) === pk(x.label) && h.padj < 0.05 && Math.sign(h.nes) === -Math.sign(x.score)));
  const progLine = prog.length ? `<p class="note" id="ov-progeny">Signaling pathways with a different activity (PROGENy, adjusted p < 0.05): ${prog.map(x => `${esc(lookupProgenyLabel(x.label))} ${x.score > 0 ? '↑' : '↓'}`).join(', ')}. PROGENy scores the genes that respond when a pathway is active, not the genes of the pathway itself, so it can disagree with a gene set of the same name${opp.length ? ` (here: ${opp.map(x => `${esc(lookupProgenyLabel(x.label))} ${x.score > 0 ? 'higher' : 'lower'} by PROGENy, ${x.score > 0 ? 'lower' : 'higher'} as a Hallmark gene set`).join('; ')})` : ''}.</p>` : '';
  const cd = samplesCompDisplay(c), comp = c.composition?.table ? [...c.composition.table].sort((a, b) => a.padj - b.padj) : null, nComp = comp ? comp.filter(x => x.padj < 0.05).length : 0;
  const compCard = comp ? `<section class="card" id="ov-composition"><div class="card-head"><div><div class="card-title">Cell-type composition</div><div class="card-sub">${num(nComp)} of ${plural(comp.length, 'cell type')} differ in estimated fraction at adjusted p < 0.05</div></div></div>
    <div class="card-body"><div class="table-wrap"><table class="table compact"><thead><tr><th>Cell type</th><th class="num" title="${esc(cd.groupTitle)}">${t}</th><th class="num" title="${esc(cd.groupTitle)}">${r}</th><th class="num" title="${esc(cd.title)}">${esc(cd.label)}</th><th class="num">Adjusted p</th></tr></thead><tbody>${comp.map(x => `<tr${x.padj < 0.05 ? '' : ' class="faint"'}><td><span class="swatch" style="background:${typeColor(x.cell_type)};margin-right:6px"></span>${esc(typeLabel(x.cell_type))}</td><td class="num">${samplesFix(x.median_test_pct)}</td><td class="num">${samplesFix(x.median_reference_pct)}</td><td class="num">${samplesSigned(x[cd.field])}</td><td class="num">${fmtP(x.padj)}</td></tr>`).join('')}</tbody></table></div>
    <p class="note">${esc(cd.note)} Tumor cells and cancer-associated fibroblasts have no reference type; their share is absorbed into the nearest types.</p></div>
    <div class="card-foot"><span></span><button class="link-btn" data-view="samples">Map, samples and composition →</button></div></section>` : '';
  return `<h2 class="section-title" id="ov-differences">Biggest differences: ${esc(lookupVs(c))}</h2>
  <p class="note" style="margin:-4px 0 12px">From the comparison of the bulk samples. Select a gene or a gene set to open it in its tab.</p>
  <div class="grid three">
    <section class="card" id="ov-genes"><div class="card-head"><div><div class="card-title">Genes</div><div class="card-sub">${num(s.n_sig)} genes differ at adjusted p < 0.05 (${num(s.n_sig_up)} higher, ${num(s.n_sig_down)} lower in ${t})${Number.isFinite(s.n_display_up) && Number.isFinite(s.n_display_down) ? `; ${num(s.n_display_up + s.n_display_down)} of them by at least 2-fold (${num(s.n_display_up)} higher, ${num(s.n_display_down)} lower)` : ''}. The most significant genes with at least a 2-fold change are listed</div></div></div>
      <div class="card-body">${gTable(up, `Higher in ${t}`)}${gTable(down, `Lower in ${t}`)}</div>
      <div class="card-foot"><span data-color-key="scale">${scaleLegend(4, 'log2 fold change')}</span><button class="link-btn" data-view="genes">Volcano plot and all genes →</button></div></section>
    <section class="card" id="ov-pathways"><div class="card-head"><div><div class="card-title">Pathways</div><div class="card-sub">${su.k ? `${esc(GS_LABEL[su.k])} gene sets with the strongest enrichment (adjusted p < 0.05)` : 'Pathway enrichment is not available'}</div></div></div>
      <div class="card-body">${su.k ? sTable(su, `Higher in ${t}`) + sTable(sd, `Lower in ${t}`) : ''}${progLine}</div>
      <div class="card-foot"><span data-color-key="scale">${su.k ? scaleLegend(3, 'Score') : ''}</span><button class="link-btn" data-view="compare">All databases and signaling activity →</button></div></section>
    ${compCard}
  </div>
  ${(c.pathways?.themes || []).length ? `<div class="section">${themesCard(c, { limit: 8 })}</div>` : ''}`;
}

/* ---------- Gene helpers shared by the Overview lookup and the Gene expression tab ---------- */
const LOOKUP_GREEK = { 'α': ['A', 'ALPHA'], 'β': ['B', 'BETA'], 'γ': ['G', 'GAMMA'], 'δ': ['D', 'DELTA'], 'ε': ['E', 'EPSILON'], 'ζ': ['Z', 'ZETA'], 'η': ['H', 'ETA'], 'θ': ['Q', 'THETA'], 'ι': ['I', 'IOTA'], 'κ': ['K', 'KAPPA'], 'λ': ['L', 'LAMBDA'], 'μ': ['M', 'MU'], 'µ': ['M', 'MU'], 'ν': ['N', 'NU'], 'ξ': ['X', 'XI'], 'ο': ['O', 'OMICRON'], 'π': ['P', 'PI'], 'ρ': ['R', 'RHO'], 'σ': ['S', 'SIGMA'], 'ς': ['S', 'SIGMA'], 'τ': ['T', 'TAU'], 'υ': ['U', 'UPSILON'], 'φ': ['F', 'PHI'], 'ϕ': ['F', 'PHI'], 'χ': ['C', 'CHI'], 'ψ': ['Y', 'PSI'], 'ω': ['W', 'OMEGA'] };
const lookupLow = s => (/^[A-Z]{2}/.test(String(s)) ? String(s) : String(s).charAt(0).toLowerCase() + String(s).slice(1));
/* Group names inside a sentence: "PDAC vs adjacent pancreas". */
const lookupVs = c => `${c.test} vs ${lookupLow(c.reference)}`;
const lookupNz = v => (Number.isFinite(v) && Math.abs(v) < 0.005 ? 0 : v);   /* a fold change never prints as -0.00 */
/* Adjusted p next to the 0.05 threshold is printed with enough digits to show on which side it lies. */
const lookupP = v => { if (!(Number.isFinite(v) && v >= 0.0495 && v < 0.0505)) return fmtP(v); const t = v.toFixed(4); return t === '0.0500' ? v.toFixed(5) : t; };
const lookupSmall = v => (!Number.isFinite(v) ? '—' : v === 0 ? '0' : v < 0.01 ? v.toPrecision(1) : v >= 1000 ? num(v) : sig(v));
/* One wording for the result of the bulk comparison of a gene, on every tab. */
const LOOKUP_CLS_HELP = 'Higher or lower: adjusted p below 0.05 and at least a 2-fold change by the shrunken estimate. Significant, below 2-fold: adjusted p below 0.05 with a smaller shrunken change. Not significant: adjusted p of 0.05 or more.';
function lookupCls(dir, padj, sigFlag) {
  return dir === 'up' || dir === 1 ? 'up' : dir === 'down' || dir === -1 ? 'down' : dir === 'sub' || (sigFlag ?? (Number.isFinite(padj) && padj < 0.05)) ? 'sub' : 'ns';
}
function lookupClsLabel(c, cls) { return cls === 'up' ? `Higher in ${c.test}` : cls === 'down' ? `Lower in ${c.test}` : cls === 'sub' ? 'Significant, below 2-fold' : 'Not significant'; }
function lookupClsCounts(c) {
  const s = c.de.summary || {}, n = { up: s.n_display_up, down: s.n_display_down, sub: s.n_sig_below_2fold ?? (s.n_sig - s.n_display_up - s.n_display_down), ns: (s.n_padj_defined ?? s.n_genes_tested) - s.n_sig };
  if (Object.values(n).every(Number.isFinite)) return n;
  const k = { up: 0, down: 0, sub: 0, ns: 0 }; for (const p of c.de.volcano?.points || []) k[lookupCls(p[3], 10 ** -p[2])]++;
  return k;
}
function lookupPoint(c, gene) { if (!c._pt) c._pt = new Map((c.de.volcano?.points || []).map(p => [p[0], p])); return c._pt.get(gene) || null; }
/* Result of the bulk comparison for any tested gene: the listed table row, else the lookup file, else the rounded volcano point. */
function lookupDe(d, gene) {
  const c = d.comparison; if (!c) return null;
  const r = c.de.table.find(x => x.gene === gene), L = d.geneLookup, i = L ? L.index.get(gene) : undefined;
  if (r) return { lfc: r.log2FCShrunk, padj: r.padj, baseMean: r.baseMean, raw: r.log2FC, se: r.lfcSE, cls: lookupCls(r.direction, r.padj) };
  if (i !== undefined && Number.isFinite(L.de.lfc?.[i])) return { lfc: L.de.lfc[i], padj: L.de.padj?.[i], baseMean: L.de.baseMean?.[i] ?? null, raw: L.de.lfcRaw?.[i] ?? null, se: L.de.lfcSE?.[i] ?? null, cls: lookupCls(L.de.dir?.[i], L.de.padj?.[i], L.de.sig?.[i]) };
  const p = lookupPoint(c, gene);
  return p ? { lfc: p[1], padj: 10 ** -p[2], baseMean: null, raw: null, se: null, cls: lookupCls(p[3], 10 ** -p[2]), rounded: true } : null;
}
/* The fold change before shrinkage, with a sentence when shrinkage decides the call. */
function lookupRawNote(x, id = '') {
  if (!x || !Number.isFinite(x.raw)) return '';
  const lost = x.cls === 'sub' && Math.abs(x.raw) >= 1;
  return `<p class="note"${id ? ` id="${id}"` : ''} data-raw-fc="${lost ? 'lost' : 'ok'}">Before shrinkage: log2 fold change ${sig(lookupNz(x.raw))}${Number.isFinite(x.se) ? ` (standard error ${sig(x.se)})` : ''}.${lost ? ' The change before shrinkage is at least 2-fold; the estimate is uncertain, so the shrunken value is smaller and the gene is not called higher or lower.' : ''}</p>`;
}
/* Gene type (non-coding RNA and pseudogenes) and current HGNC symbol (when the symbol of this analysis is a former one). */
function lookupGeneInfo(d, gene) {
  const a = d.origin === 'demo' ? DEMO().geneAnnotations?.[gene] : null; if (a) return a;
  const L = d.geneLookup, i = L ? L.index.get(gene) : undefined; if (i === undefined) return null;
  const k = L.geneType?.[i], type = L.geneTypeNonCoding?.[k] ? L.geneTypes?.[k] : null, current = L.currentSymbol?.[gene] || null;
  return type || current ? { ...(type ? { type } : {}), ...(current ? { current } : {}) } : null;
}
function lookupGeneTag(d, gene) { const a = lookupGeneInfo(d, gene); return a ? [a.type, a.current ? `current symbol ${a.current}` : null].filter(Boolean).join(' · ') : ''; }
function lookupGeneSmall(d, gene) { const t = lookupGeneTag(d, gene); return t ? `<small data-gene-tag="${esc(gene)}">${esc(t)}</small>` : ''; }
/* Bars of the estimated expression by cell type. A gene with 0 in every cell type gets a sentence, not nine rows with a first place; the bar scale never zooms in below 1. */
function lookupTypeBars(vals) {
  const vmax = Math.max(...vals.map(x => x.v), 0);
  if (!vals.length || vmax <= 0) return `<p class="note" data-type-bars="zero">Estimated expression is 0 in all ${num(vals.length)} cell types: the estimated profiles do not place this gene in any cell type of the healthy reference.</p>`;
  const scale = Math.max(vmax, 1);
  return `<div data-type-bars="${vmax < 0.1 ? 'low' : 'ok'}">${vals.map(x => `<div class="hbar"><span>${esc(x.label)}</span><span class="track"><i style="width:${(Math.max(0, x.v) / scale * 100).toFixed(1)}%;background:${x.color}"></i></span><b>${sig(x.v)}</b></div>`).join('')}</div>${vmax < 0.1 ? '<p class="note" data-type-low>All values are below 0.1: the gene is close to absent from the estimated profiles, and the order of the cell types says little.</p>' : ''}${TYPE_COLOR_NOTE}`;
}
function lookupPerSample(d, f) {
  const n = d.samples.map(s => s.profiles).filter(Number.isFinite), lo = Math.min(...n), hi = Math.max(...n);
  return n.length ? (lo === hi ? num(lo) : `${num(lo)} to ${num(hi)}`) : f.perSample ? `about ${num(f.perSample)}` : '';
}
const lookupMarks = m => (/genes$/i.test(m) ? `listed among the ${lookupLow(m)}` : `marker of ${lookupLow(m)}`);
const lookupProgenyLabel = s => String(s).replace(/^TGFb\b/, 'TGF-β').replace(/^TNFa\b/, 'TNF-α').replace(/^NFkB\b/, 'NF-κB');
/* Keys under which a typed name is looked up. Greek letters are read as their Latin letter and spelled out; a name with another letter that cannot be matched gives no key. */
function lookupKeys(L, raw) {
  const chars = [...String(raw).toLowerCase()];
  if (chars.some(ch => !LOOKUP_GREEK[ch] && /[^\x00-\x7f]/.test(ch) && /[\p{L}\p{N}]/u.test(ch))) return [];
  if (!chars.some(ch => LOOKUP_GREEK[ch])) { const k = L.key(chars.join('')); return k ? [[k, 'plain']] : []; }
  const out = [];
  for (const [j, form] of [[0, 'letter'], [1, 'spelled']]) { const k = L.key(chars.map(ch => LOOKUP_GREEK[ch]?.[j] ?? ch).join('')); if (k && !out.some(x => x[0] === k)) out.push([k, form]); }
  return out;
}

/* ---------- Target lookup (Overview): one gene, everything the analysis shows for it ---------- */
function checkLookup(b) {
  if (!b || !Array.isArray(b.genes) || !b.de || !Array.isArray(b.typeExpr) || b.typeExpr.length !== b.genes.length || !b.sets || !Array.isArray(b.geneSetsDelta)) throw new Error('Invalid lookup table.');
  const key = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const index = new Map(b.genes.map((g, i) => [g, i])), lc = new Map(b.genes.map(g => [g.toLowerCase(), g])), byKey = new Map();
  for (const g of b.genes) { const k = key(g); byKey.set(k, byKey.has(k) ? null : g); }   /* null: two symbols share the key */
  const curKey = new Map(); for (const [g, cur] of Object.entries(b.currentSymbol || {})) if (index.has(g) && !byKey.has(key(cur))) curKey.set(key(cur), g);   /* current HGNC symbol -> symbol of this analysis */
  const untestedIndex = b.untested?.genes ? new Map() : null;
  if (untestedIndex) b.untested.genes.forEach((g, i) => { const k = key(g); if (!untestedIndex.has(k)) untestedIndex.set(k, i); });
  return { ...b, index, lc, byKey, key, curKey, untestedIndex, aliasKeys: Object.keys(b.aliases || {}) };
}
/* Resolve a typed name: exact symbol (any case), then the symbol's letters and digits, then the current HGNC symbol of a gene listed under a former symbol,
   then a unique alias, then an ambiguous alias. A name with Greek letters is tried with Latin letters and spelled out; it opens a gene only when it matches
   a symbol or a spelled-out name and no other gene, otherwise the candidates are offered. A name is never matched after dropping a character. */
function lookupFind(L, q) {
  const raw = String(q || '').trim(), keys = lookupKeys(L, raw);
  if (!keys.length) return { exact: null, via: null, how: null, matches: [], ambiguous: null, guess: false, untested: null };
  const greek = keys[0][1] !== 'plain', hits = [], matches = [], otherNames = [];
  for (const [K, form] of keys) {
    const sym = (form === 'plain' && L.lc.get(raw.toLowerCase())) || L.byKey.get(K) || null, cur = L.curKey.get(K), a = L.aliases?.[K];
    /* integration (metabolic-034): the symbol of a measured gene that was not tested (ARG1, EPO, AVP) is never answered with another gene that lists it as a second name */
    const own = form === 'plain' && L.untestedIndex?.has(K);
    if (sym) hits.push({ genes: [sym], how: 'symbol', form });
    else if (cur && (form === 'letter' || (form === 'plain' && raw.toUpperCase() === String(L.currentSymbol[cur]).toUpperCase()))) hits.push({ genes: [cur], how: 'current', form });
    else if (own) { for (const g of (a && L.index.has(a) ? [a] : L.ambiguousAliases?.[K] || [])) if (!otherNames.includes(g)) otherNames.push(g); }
    else if (a && L.index.has(a)) hits.push({ genes: [a], how: 'alias', form });
    else if (L.ambiguousAliases?.[K]) hits.push({ genes: L.ambiguousAliases[K], how: 'ambiguous', form });
    if (K.length >= 2) {
      const m = [];
      for (const [k, g] of L.byKey) if (g && k.startsWith(K)) m.push([g, null]);
      m.sort((x, y) => x[0].length - y[0].length || x[0].localeCompare(y[0]));
      for (const x of m) if (matches.length < 8 && !matches.some(y => y[0] === x[0])) matches.push(x);
      if (matches.length < 8) for (const k of L.aliasKeys) { const g = L.aliases[k]; if (k.startsWith(K) && L.index.has(g) && !matches.some(y => y[0] === g)) matches.push([g, k]); if (matches.length >= 8) break; }
    }
  }
  const all = [...new Set(hits.flatMap(h => h.genes))], strong = hits.find(h => h.how === 'symbol' || h.how === 'current' || (h.how === 'alias' && h.form !== 'letter'));
  let exact = null, how = null, ambiguous = null, guess = false, untested = null;
  if (!greek) { const h = hits[0]; if (h && h.how !== 'ambiguous') { exact = h.genes[0]; how = h.how === 'symbol' ? null : h.how; } else if (h) ambiguous = h.genes; }
  else if (all.length === 1 && strong) { exact = all[0]; how = `greek-${strong.how}`; }
  else if (all.length) { ambiguous = all; guess = all.length === 1; }
  if (!exact && !ambiguous && L.untestedIndex) for (const [K, form] of keys) { const j = form === 'spelled' ? undefined : L.untestedIndex.get(K); if (j !== undefined) { untested = { gene: L.untested.genes[j], n: parseInt(L.untested.n[j], 36), otherNames }; break; } }
  return { exact, via: exact && how ? raw : null, how, matches, ambiguous, guess, untested };
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
    /* the gene on the panel stays first among the suggestions and is marked, so that typing a symbol in full (KRA, then KRAS) never removes it from the list */
    const sugg = gene ? [[gene, null], ...f.matches.filter(m => m[0] !== gene)].slice(0, 8) : f.matches;
    const chips = sugg.map(([g, a]) => `<button data-lookup="${esc(g)}"${g === gene ? ' class="active" aria-pressed="true" data-lookup-shown title="Shown below"' : ''}>${esc(g)}${a ? `<small>${esc(L.aliasNames?.[a] || a)}</small>` : ''}</button>`).join('');
    const ambList = (f.ambiguous || []).map(g => (L.index.has(g) ? `<button type="button" class="link-btn" data-lookup="${esc(g)}">${esc(g)}</button>` : esc(g))).join(', ');
    const amb = f.ambiguous && !picked ? (f.guess
      ? `<p class="note" id="lookup-ambiguous" data-lookup-guess>“${esc(q.trim())}” has no entry of its own. With the Greek letter written as a Latin letter it is a name listed for ${ambList}. Open that gene only if it is the one you mean.</p>`
      : `<p class="note" id="lookup-ambiguous">“${esc(q.trim())}” can mean more than one gene: ${ambList}. Choose one.</p>`) : '';
    const fl = L.filter, un = f.untested && !gene ? f.untested : null;
    const filt = fl ? `the comparison tests genes with at least ${num(fl.minCount)} counts in at least ${num(fl.minSamples)} of the ${num(fl.samples)} samples (${num(L.genes.length)} of ${num(fl.genesInput)} genes)` : 'genes with too few counts are left out before testing';
    const noneMsg = un
      ? `<p class="note" id="lookup-none" data-lookup-untested="${esc(un.gene)}">${un.gene.toLowerCase() === q.trim().toLowerCase() ? '' : `“${esc(q.trim())}” was read as ${esc(un.gene)}. `}<b>${esc(un.gene)}</b> was measured but not tested: it has at least ${num(fl?.minCount ?? 10)} counts in ${num(un.n)} of the ${num(fl?.samples ?? d.samples.length)} samples, and ${filt}. This analysis has no result for it.${un.otherNames?.length ? ` <span id="lookup-other-name">“${esc(un.gene)}” is also listed as a second name of ${un.otherNames.map(g => `<button type="button" class="link-btn" data-lookup="${esc(g)}">${esc(g)}</button>`).join(', ')}, ${un.otherNames.length === 1 ? 'a different gene' : 'different genes'}.</span>` : ''}</p>`
      : !chips && !amb ? `<p class="note" id="lookup-none">“${esc(q.trim())}” is not among the ${num(L.genes.length)} genes tested in this analysis${L.untested ? `, and it is not the symbol of one of the ${num(L.untested.genes.length)} measured genes that were left out for low counts. Check the spelling or try the official gene symbol; former symbols and common names are matched for tested genes only` : '. Either its expression was too low in these samples to be tested, or the name is not a known gene symbol or common name'}.</p>` : '';
    const partial = chips && !gene && !amb && !un ? `<p class="note" id="lookup-partial" style="margin-bottom:0">No gene is listed under exactly “${esc(q.trim())}”. Genes whose symbol or name starts with it:</p>` : '';
    body = `${partial}${chips ? `<div class="toggle-chips" id="lookup-matches" role="group" aria-label="Matching genes" style="margin-top:10px">${chips}</div>` : ''}${amb}${gene ? lookupPanel(d, L, gene, via, via ? f.how : null) : noneMsg}`;
  }
  return `<section class="card section" id="lookup"><div class="card-head"><div><div class="card-title">Look up a gene or target</div><div class="card-sub">Everything this analysis shows for one gene, on one panel</div></div></div>
    <div class="card-body"><div class="controls"><label class="search">${icon('search')}<input class="input" id="lookup-input" type="search" placeholder="Gene symbol or common name" value="${esc(q)}" aria-label="Look up a gene or target" autocomplete="off" spellcheck="false"></label>${ex ? `<span class="note" style="margin:0">For example</span><div class="toggle-chips" id="lookup-examples">${ex}</div>` : ''}</div>${body}</div></section>`;
}
function lookupPanel(d, L, sym, via, how = 'alias') {
  const i = L.index.get(sym), c = d.comparison, lt = L.cellTypes || d.cellTypes.map(t => t.name);
  const lfc = L.de.lfc?.[i], padj = L.de.padj?.[i], bm = L.de.baseMean?.[i], dv = L.de.dir?.[i], tested = Number.isFinite(lfc);
  const dir = lookupCls(dv, padj, L.de.sig?.[i]), info = lookupGeneInfo(d, sym);
  const viaText = !via ? '' : how === 'current' ? `“${esc(via)}” is the current HGNC symbol of ${esc(sym)}, the symbol used in this analysis`
    : how === 'greek-symbol' ? `“${esc(via)}” was read as ${esc(sym)}, with the Greek letter written as a Latin letter`
      : how === 'greek-current' ? `“${esc(via)}”, with the Greek letter written as a Latin letter, is the current HGNC symbol of ${esc(sym)}`
        : how === 'greek-alias' ? `“${esc(via)}”, with the Greek letter spelled out, is listed as a name of ${esc(sym)}` : `“${esc(via)}” is listed as a name of ${esc(sym)}`;
  const bulk = c ? (tested
    ? `<div class="metrics small"><div class="metric"><small>Shrunken log2 fold change</small><b>${sig(lookupNz(lfc))}</b></div><div class="metric"><small>Adjusted p</small><b>${lookupP(padj)}</b></div><div class="metric"><small>Mean normalized count</small><b>${Number.isFinite(bm) ? num(bm, 0) : '—'}</b></div></div>${lookupRawNote({ raw: L.de.lfcRaw?.[i], se: L.de.lfcSE?.[i], cls: dir }, 'lookup-raw')}<p class="note" id="lookup-call" data-de-class="${dir}"><b>${esc(lookupClsLabel(c, dir))}</b> in the comparison of the bulk samples (${esc(lookupVs(c))}). ${LOOKUP_CLS_HELP} A tissue-level difference can come from a change in which cells make up the tissue, from a change within cells, or both.</p>`
    : '<p class="note">This gene was not tested in the bulk comparison.</p>') : '';
  const te = L.typeExpr[i];
  let where;
  if (Array.isArray(te)) {
    const vals = te.map((v, k) => ({ v, n: lt[k] })).filter(x => Number.isFinite(x.v)).sort((a, b) => b.v - a.v);
    where = lookupTypeBars(vals.map(x => ({ v: x.v, label: typeLabel(x.n), color: typeColor(x.n) })))
      + '<p class="note">Estimated from the bulk samples with the healthy pancreas reference. Tumor cells are not a reference cell type, so expression that comes from tumor cells is spread over the healthy types, mostly ductal.</p>';
  } else where = '<p class="note">Not available: this gene is not among the genes shared with the healthy reference.</p>';
  let acc = 0;
  const si = (L.geneSetsDelta[i] || []).map(x => (acc += x)), lead = new Set((L.leadingPos?.[i] || []).map(p => si[p])), enr = enrichmentIndex(c);
  const rows = si.map(j => { const id = L.sets.id[j], e = enr.get(id) || null, nes = L.sets.nes?.[j] ?? (e ? e.nes : null), p = L.sets.padj?.[j] ?? (e ? e.padj : null); return { id, col: L.sets.collection[j], label: L.sets.label[j], lead: lead.has(j), nes, padj: p, top: L.sets.topType?.[j] ?? null, clear: L.sets.topClear?.[j] ?? null, onSite: !!e && !e.progeny }; })
    .sort((a, b) => (b.lead - a.lead) || ((b.padj !== null && b.padj < 0.05) - (a.padj !== null && a.padj < 0.05)) || (Math.abs(b.nes || 0) - Math.abs(a.nes || 0)) || GS_ORDER.indexOf(a.col) - GS_ORDER.indexOf(b.col) || a.label.localeCompare(b.label));
  const shown = state.lookup.all ? rows : rows.slice(0, 10);
  const setRows = shown.map(x => `<tr><td>${esc(x.label)}<small>${esc(x.id)}</small></td><td><span class="badge db-${String(x.col).toLowerCase()}">${esc(GS_LABEL[x.col] || x.col)}</span></td><td class="num">${Number.isFinite(x.nes) ? `<span class="heat" style="${diverge(x.nes, 3)}">${sig(x.nes)}</span>` : '—'}</td><td class="num">${Number.isFinite(x.padj) ? fmtP(x.padj) : '—'}</td><td>${x.lead ? '<span class="badge accent" title="Among the leading-edge genes: the genes that drive this set\u2019s enrichment in the bulk comparison">drives the score</span>' : ''}</td><td>${x.top !== null && lt[x.top] ? (x.clear === 0 ? `<span style="color:var(--ink-3)" data-noclear title="Highest score: ${esc(typeNoun(lt[x.top]))} cells, but not above zero or not clearly ahead of the second cell type (rule on the Cell-type signaling tab)">No clear highest cell type</span>` : esc(typeLabel(lt[x.top]))) : '—'}</td><td class="nowrap">${x.onSite ? `<button type="button" class="link-btn" data-ovset="${esc(x.id)}" data-ovcol="${esc(x.col)}">Bulk</button>` : ''}${x.top !== null ? ` <button type="button" class="link-btn" data-gsjump="${esc(x.id)}" data-gscolj="${esc(x.col)}">Cell types</button>` : ''}</td></tr>`).join('');
  const sets = si.length ? `<div class="table-wrap" style="max-height:380px" data-scroll-id="lookup-sets"><table class="table compact" id="lookup-sets"><thead><tr><th>Gene set</th><th>Database</th><th class="num" title="Enrichment score of the whole set in the bulk comparison (PROGENy: pathway activity score)">Bulk score</th><th class="num">Adjusted p</th><th></th><th title="Cell type with the highest estimated activity of the whole set, not of this gene">Highest in</th><th>Open</th></tr></thead><tbody>${setRows}</tbody></table></div><p class="note" data-color-key="scale" style="margin:6px 0 0">${scaleLegend(3, 'Bulk score')}</p>${rows.length > shown.length ? `<button class="link-btn" data-action="lookupall">Show all ${num(rows.length)} gene sets</button>` : ''}<p class="note">Membership comes from the gene-set databases, not from this data. Bulk score and highest cell type describe the whole set.${Array.isArray(L.sets.topType) ? ` Of the ${num(L.sets.id.length)} gene sets on this site, ${num(L.sets.topType.filter(x => x !== null).length)} are scored by cell type and ${num(L.sets.topType.filter(x => x === null).length)} appear only in the bulk comparison; “Bulk” opens the sets that are listed on the Bulk signaling tab.` : ''}</p>`
    : '<p class="note">Not a member of any gene set shown on this site.</p>';
  const kegg = (L.kegg?.[i] || []).map(id => d.pathways.find(p => p.id === id)).filter(Boolean), notScored = (L.keggNotScored || []).includes(sym);
  const keggLine = kegg.length ? `<div class="note" style="margin:14px 0 6px"><b style="color:var(--ink-2)">Metabolic pathways</b> · enzyme gene in</div><div class="chips" id="lookup-kegg">${kegg.map(p => `<button type="button" class="chip link" data-pathway="${esc(p.id)}" title="KEGG ${esc(metabolicMapId(p.id))}">${esc(p.name)}</button>`).join('')}</div>${notScored ? '<p class="note">This gene was not used to estimate the activity of these pathways.</p>' : ''}` : '';
  const also = (L.symbolAlsoAlias?.[sym] || []).filter(g => L.index.has(g));
  return `<div id="lookup-panel" class="detail-sub" data-lookup-gene="${esc(sym)}"><div class="lookup-head"><div><span class="card-title"><i>${esc(sym)}</i></span>${info?.type ? ` <span class="badge muted" id="lookup-type">${esc(info.type)}</span>` : ''}${info?.current ? ` <span class="note" style="margin:0" id="lookup-current">former symbol; current HGNC symbol ${esc(info.current)}</span>` : ''}${via ? ` <span class="note" style="margin:0" id="lookup-via">${viaText}</span>` : ''}${also.length ? ` <span class="note" style="margin:0" id="lookup-also">${esc(sym)} is also used as a name for ${also.map(g => `<button type="button" class="link-btn" data-lookup="${esc(g)}">${esc(g)}</button>`).join(', ')}</span>` : ''}</div><div class="controls">${c ? `<button class="btn btn-secondary" data-ovgene="${esc(sym)}">Open in Gene expression</button>` : ''}<a class="badge" href="https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(sym)}%5Bsym%5D+AND+human%5Borgn%5D" target="_blank" rel="noopener">NCBI Gene</a></div></div>
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
  const maskedOf = new Map(); for (const [t, gs] of Object.entries(b.masked || {})) for (const g of gs) maskedOf.set(g, b.types.indexOf(t));   /* gene -> the only cell type in which its counts were kept */
  return { ...b, index: new Map(b.genes.map((g, i) => [g, i])), maskedOf };
}
function tumorNote(d, gene, { full = false } = {}) {
  if (!d.geneTumorUrl && !d.geneTumor) return '';
  const T = d.geneTumor, st = String(d.lazy.geneTumor || '');
  if (!T) { if (!st.startsWith('error')) ensureLazy('geneTumor', checkTumor); return full ? `<p class="note">${st.startsWith('error') ? 'The single-cell tumor data could not be loaded.' : 'Loading the single-cell tumor data…'}</p>` : ''; }
  const i = T.index.get(gene);
  if (i === undefined) return full ? '<p class="note" data-tumor-note="none"><b>In tumors:</b> not measured in the public single-cell tumor data.</p>' : '';
  const top = T.top?.[i], fold = T.fold?.[i], lab = k => T.typeLabels?.[k] || T.types[k], low = s => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s), det = T.refDetected?.[i];
  const kept = T.maskedOf?.get(gene), times = Number.isFinite(fold) ? (fold > 100 ? 'more than 100 times the next cell type' : `${sig(fold)} times the next cell type`) : '';
  const basis = top === null || top === undefined ? '' : `mean ${lookupSmall(T.values[i][top])} counts per 10,000${Number.isFinite(T.cells?.[top]) ? ` in ${num(T.cells[top])} cells` : ''}`;
  const lead = top === null || top === undefined ? 'it is not detected in any cell type'
    : kept !== undefined && kept >= 0 ? `it is shown in ${esc(low(lab(kept)))} only (${basis}): its counts in all other cell types were set to zero when the reference was built, so those zeros are not measurements`
      : Number.isFinite(fold) && fold < 1.5 ? `no single cell type stands out (highest: ${esc(low(lab(top)))}, ${times}; ${basis})`
        : `it is highest in ${esc(low(lab(top)))} (${times ? `${times}; ` : ''}${basis})`;
  const ref = det === 0 || det === false ? ' It is not detected in the healthy reference cell types, so the estimates on healthy cell types cannot locate it.' : '';
  let bars = '';
  if (full) {
    const vals = T.values[i].map((v, k) => ({ v, k })).filter(x => Number.isFinite(x.v)).sort((a, b) => b.v - a.v).slice(0, 5), vmax = Math.max(...vals.map(x => x.v), 1e-9);
    bars = `<div class="note" style="margin:16px 0 6px"><b style="color:var(--ink-2)">In tumors</b> · mean expression in public single-cell data from PDAC tumors of other patients, counts per 10,000 (the five highest cell types)</div><div id="lookup-tumor">${vals.map(x => `<div class="hbar"><span>${esc(lab(x.k))}</span><span class="track"><i style="width:${(x.v / vmax * 100).toFixed(1)}%;background:${T.typeGroups?.[x.k] === 'malignant' ? '#b42318' : T.typeGroups?.[x.k] === 'fibroblast' ? '#5f6b76' : '#98a2b3'}"></i></span><b>${lookupSmall(x.v)}</b></div>`).join('')}</div>${colorKey([{ color: '#b42318', label: 'Malignant cells' }, { color: '#5f6b76', label: 'Fibroblasts (cancer-associated fibroblasts)' }, { color: '#98a2b3', label: 'Every other cell type' }], { id: 'lookup-tumor-key' })}`;
  }
  return `<div data-tumor-note="${top === null || top === undefined ? 'undetected' : kept !== undefined && kept >= 0 ? 'masked' : 'ok'}">${bars}<p class="note"><b>In tumors:</b> in public single-cell data from PDAC tumors of other patients, ${lead}.${ref}${full && T.caveat ? ` ${esc(T.caveat)}` : ' These values are not from the samples of this analysis.'}</p></div>`;
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
    <button class="btn btn-secondary" data-view="pathways">All ${metabolicDrawn(d)} pathways</button></div>
    <div class="card-body table-wrap" data-scroll-id="${id}"><table class="table"><thead><tr>${th('name', 'Pathway')}${th('category', 'Category')}${th('top', 'Highest in')}${th('spread', 'Spread', { num: true, title: '(highest − lowest) ÷ mean across cell types' })}${types.map((t, i) => th(`t${i}`, `<span class="swatch" style="background:${t.color};margin-right:5px"></span>${esc(t.label)}`, { num: true })).join('')}</tr></thead>
    <tbody>${rows.map(p => `<tr class="clickable" data-pathway="${esc(p.id)}"><td><button type="button" class="name-link" data-pathway="${esc(p.id)}">${esc(p.name)}</button><small>${esc(metabolicMapId(p.id))} · ${plural(p.reactionCount, 'reaction')}</small></td><td><span class="badge">${esc(p.category)}</span></td><td>${esc(typeLabel(p.top || '—'))}<small>${esc(metabolicLead(d, p))}</small>${metabolicBadges(d, p)}</td><td class="num">${sig(p.spread)}</td>${types.map((t, i) => `<td class="num"><span class="heat" style="${heat(p.activity[i], lo, hi)}" title="${esc(`${p.name} in ${t.label}: ${sig(p.activity[i])} (relative units); z-score across cell types ${sig(p.z[i])}`)}">${sig(p.activity[i])}</span></td>`).join('')}</tr>`).join('') || `<tr><td colspan="${4 + types.length}" class="empty">No pathways.</td></tr>`}</tbody></table></div><div class="card-foot"><span data-color-key="scale">${scaleLegendEnds(sig(lo), sig(hi), 'Cell color: mean activity (relative units)', 'seq')}</span><span></span></div></section>`;
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
    html += `<g font-size="10.5" fill="#667085"><defs><linearGradient id="vir" x1="0" x2="1">${viridis.map((c, i) => `<stop offset="${i / 4}" stop-color="${c}"/>`).join('')}</linearGradient></defs><rect x="${W - 170}" y="10" width="140" height="8" rx="4" fill="url(#vir)"/><text x="${W - 170}" y="32">${sig(s0)}</text><text x="${W - 30}" y="32" text-anchor="end">${sig(s1)}</text><text x="${W - 30}" y="46" text-anchor="end">${esc(samplesText('mapText').scoreLegend || 'Mean pathway activity (relative units)')}</text></g>`;
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
/* Texts of the Samples tab that state numbers of the demo come from demo-data.js (compositionText, fitText, mapText, healthyText). */
const samplesText = k => (state.data?.origin === 'demo' ? DEMO()[k] : null) || {};
/* a value that rounds to zero prints without a sign (never "-0.0") */
const samplesFix = (v, d = 1) => (Number.isFinite(v) ? (Number(v.toFixed(d)) === 0 ? (0).toFixed(d) : v.toFixed(d)) : '—');
const samplesSigned = (v, d = 1) => (Number.isFinite(v) ? (Number(v.toFixed(d)) === 0 ? (0).toFixed(d) : `${v > 0 ? '+' : ''}${v.toFixed(d)}`) : '—');
const samplesLower = g => (/^[A-Z]{2}/.test(String(g)) ? String(g) : String(g).charAt(0).toLowerCase() + String(g).slice(1));
/* Columns of the composition comparison: which difference is shown and how it is labeled (set by the analysis; one definition for every table). */
function samplesCompDisplay(c) {
  const cd = c?.composition?.display || {};
  return { field: cd.differenceField || 'median_difference_pp', label: cd.differenceLabel || 'Difference of medians',
    title: cd.differenceTitle || `Median of ${c.test} minus median of ${c.reference}, percentage points`,
    groupTitle: cd.groupTitle || 'Median of the estimated fraction over the samples of the group, percent',
    dirField: cd.directionField || null, dirLabel: cd.directionLabel || '', dirTitle: cd.directionTitle || '',
    note: cd.note || `Group columns: median of the samples of each group (%). Difference of medians: ${c.test} minus ${c.reference}, in percentage points. Adjusted p: ${c.composition?.test || 'two-sided rank-sum test per cell type, adjusted across cell types'}.` };
}
/* Text under the map when one sample is selected: how many of that sample's profiles the map displays. */
function samplesOneSampleCount(d) {
  const s = d.samples.find(x => x.id === state.sample), n = d.cells.filter(c => c.sample === state.sample).length;
  return `Showing in color ${num(n)} of the ${num(s?.profiles ?? n)} profiles estimated from ${esc(sampleLabel(state.sample))} (the map displays a random subset of all profiles); the other displayed profiles are in gray.`;
}
function samplesUpdateMapCount() {
  const el = $('#map-count'); if (!el || el.dataset.default === undefined) return;
  el.innerHTML = state.sample !== 'all' && mapGroup(state.data) !== HEALTHY ? samplesOneSampleCount(state.data) : el.dataset.default;
}
/* Notes under the map: what the group filter can show, what the immune and ductal islands contain, and what the activity coloring is. */
function samplesMapNote(d, space, mg) {
  const t = samplesText('mapText'), g = groupNames(d), first = [], more = [];
  if (g.length) first.push(t.groups || `${g[0]} and ${samplesLower(g[1])} on the map: the estimated profiles of both groups are generated from the same reference cells, so profiles of a cell type from the two groups overlap by construction. The map cannot show cell states that are specific to one group.`);
  if (state.colorBy === 'score' && mg !== HEALTHY) first.push(t.score || 'Metabolic activity (color): the mean of a profile\u2019s estimated activity over the pathways that are not overview maps, in relative units.');
  if (space === 'expression') more.push(t.immune, t.ductal, t.misplaced); else more.push(t.metabolicRun);
  return [first, more].map((x, i) => (x.filter(Boolean).length ? `<p class="note" id="${i ? 'map-note-islands' : 'map-note'}">${x.filter(Boolean).map(esc).join(' ')}</p>` : '')).join('');
}
/* Marks of the bulk samples (set next to the healthy pancreas samples), by sample id; empty until that file is loaded. */
function samplesMarks(d) {
  const b = d.healthy?.bulk; if (!b || !Array.isArray(b.samples) || !Array.isArray(b.sampleNote)) return {};
  return Object.fromEntries(b.samples.map((s, i) => [s.id, b.sampleNote[i]]).filter(x => x[1]));
}
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
    ? `Showing in color ${num(R.ex.length)}${R.n > R.ex.length ? ` of the ${num(R.n)}` : ''} healthy reference cells${R.n > R.ex.length ? ' (a random subset that keeps at least 100 cells of each type, or all of a type with fewer, so rare types are over-represented)' : ''}; the ${num(d.cells.length)} displayed estimated profiles are in gray. ${esc(DEMO().healthyText?.mapNote || 'The estimated profiles are generated from these reference cells, so the two overlap by construction.')}`
    : mg === 'all' ? (d.cells.length < d.counts.cells ? `Showing ${num(d.cells.length)} of ${num(d.counts.cells)} estimated profiles (a random subset)` : `Showing all ${num(d.cells.length)} estimated profiles`)
      : `Showing in color ${num(shownCells)} of the ${num(d.cells.length)} displayed profiles: those estimated from the ${num(shownSamples.length)} ${esc(samplesLower(mg))} samples; the other profiles are in gray. The filter changes the map only; cell-type values on this site summarize all samples.`;
  return `<section class="card" id="map-card"><div class="card-head"><div><div class="card-title">${space === 'expression' ? 'Expression map' : 'Metabolic map'}</div><div class="card-sub">Each point is one ${mg === HEALTHY ? 'healthy reference cell (color) or estimated single-cell profile (gray)' : 'estimated single-cell profile'}, placed by ${space === 'expression' ? 'similarity of gene expression' : 'similarity of estimated metabolic activity'} (UMAP; axes have no units)</div></div>
      <div class="controls">${hasExpr ? `<div class="segmented" role="group" aria-label="Map"><button class="${space === 'expression' ? 'active' : ''}" data-space="expression">Expression</button><button class="${space === 'metabolic' ? 'active' : ''}" data-space="metabolic">Metabolic</button></div>` : ''}
      <div class="segmented" role="group" aria-label="Color"><button class="${state.colorBy === 'type' || mg === HEALTHY ? 'active' : ''}" data-color="type">Cell type</button><button class="${state.colorBy === 'score' && mg !== HEALTHY ? 'active' : ''}" data-color="score"${mg === HEALTHY ? ' disabled' : ''}>Metabolic activity</button></div>
      ${mapGroups.length || canHealthy ? `<div class="segmented" role="group" aria-label="Group shown in color on the map"><button class="${mg === 'all' ? 'active' : ''}" data-mapgroup="all">All samples</button>${mapGroups.map(g => `<button class="${mg === g ? 'active' : ''}" data-mapgroup="${esc(g)}">${esc(g)}</button>`).join('')}${canHealthy ? `<button class="${mg === HEALTHY ? 'active' : ''}" data-mapgroup="${HEALTHY}"${R ? '' : ` disabled title="${String(d.lazy.healthy || '').startsWith('error') ? 'The healthy reference cells could not be loaded' : 'Loading the healthy reference cells'}"`}>${HEALTHY}</button>` : ''}</div>` : ''}
      <select class="select" id="sample-select" aria-label="Show the profiles of one sample in color"${mg === HEALTHY ? ' disabled' : ''}><option value="all">${mg === 'all' || mg === HEALTHY ? 'All samples' : `All ${esc(samplesLower(mg))} samples`}</option>${shownSamples.map(s => `<option value="${esc(s)}" ${state.sample === s ? 'selected' : ''}>${esc(sampleLabel(s))}</option>`).join('')}</select></div></div>
      <div class="card-body"><div class="embed-wrap"><svg class="embedding main" viewBox="0 0 640 400" data-w="640" data-h="400" role="img" aria-label="Map of estimated single-cell profiles"></svg><div class="tip hidden"></div></div>
      <div class="legend">${d.cellTypes.map(t => `<button class="${state.hidden.has(t.name) ? 'off' : ''}" data-type="${esc(t.name)}"><span class="swatch" style="background:${t.color}"></span>${esc(t.label)}</button>`).join('')}</div>${samplesMapNote(d, space, mg)}</div>
      <div class="card-foot"><span id="map-count" data-default="${esc(`${count}${hasExpr && mg === 'all' ? ' · both maps show the same profiles' : ''}`)}">${state.sample !== 'all' && mg !== HEALTHY ? samplesOneSampleCount(d) : `${count}${hasExpr && mg === 'all' ? ' · both maps show the same profiles' : ''}`}</span>${d.figures.length ? '<button class="link-btn" data-view="figures">How to read this map →</button>' : '<span>Select a cell type to hide it</span>'}</div></section>`;
}
/* Share of each cell type among the healthy reference cells of each donor: counted cells, not estimates from bulk tissue. */
function healthyComposition(d) {
  const R = d.healthy?.referenceCells, C = R?.composition, types = d.healthy?.cellTypes;
  if (!C || !Array.isArray(C.counts) || !Array.isArray(C.donors) || !Array.isArray(types) || !C.counts.length) return null;
  const donors = C.donors.map((id, i) => { const n = C.counts[i].reduce((a, x) => a + x, 0); return { id, n, f: Object.fromEntries(types.map((t, k) => [t, n ? C.counts[i][k] / n : NaN])) }; });
  const med = v => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
  return { donors, n: donors.reduce((a, x) => a + x.n, 0), label: C.label || HEALTHY, short: C.short || 'Healthy cells', note: C.note || '',
    mean: Object.fromEntries(types.map(t => [t, donors.reduce((a, x) => a + x.f[t], 0) / donors.length])), median: Object.fromEntries(types.map(t => [t, med(donors.map(x => x.f[t]))])) };
}
const PAIR_LINE = { color: '#98a2b3', shape: 'line', width: 1.5 };
/* Mean composition of each group, with the test between the groups when a comparison exists. */
function compositionMeansCard(d) {
  const groups = groupNames(d), c = d.comparison;
  const compRows = groups.length && d.samples.some(s => s.meta?.Group)
    ? groups.map(g => ({ g, comp: meanComposition(d, s => s.meta?.Group === g), n: d.samples.filter(s => s.meta?.Group === g).length }))
    : [{ g: null, comp: meanComposition(d), n: d.samples.length }];
  const order = compRows[0].comp.map(t => t.name), test = c?.composition?.table ? new Map(c.composition.table.map(r => [r.cell_type, r])) : null;
  const cd = test ? samplesCompDisplay(c) : null, ctx = samplesText('compositionText'), hc = healthyComposition(d);
  const hcBar = hc ? `<div class="comp-group" id="comp-healthy"><div class="comp-label"><span class="swatch" style="background:${HEALTHY_COLOR}"></span><b>${esc(hc.label)}</b> <small>${plural(hc.donors.length, 'donor')}, ${num(hc.n)} counted cells</small></div><div class="stack">${order.map(name => { const t = compRows[0].comp.find(x => x.name === name); return `<span style="width:${((hc.mean[name] || 0) * 100).toFixed(2)}%;background:${t.color}" title="${esc(t.label)} ${pct(hc.mean[name])}"></span>`; }).join('')}</div></div>` : '';
  return `<section class="card" id="comp-means"><div class="card-head"><div><div class="card-title">Cell-type composition</div><div class="card-sub">${test ? 'Estimated fraction of cells in each group of samples (%): the bars show the group mean, the table the group median' : `Mean estimated fraction of cells${groups.length ? ' in each group of samples' : ` across ${plural(d.samples.length, 'sample')}`} (%)`}</div></div></div>
    <div class="card-body">${compRows.map(r => `<div class="comp-group">${r.g ? `<div class="comp-label"><span class="swatch" style="background:${groupColor(d, r.g)}"></span><b>${esc(r.g)}</b> <small>${plural(r.n, 'sample')}</small></div>` : ''}<div class="stack">${order.map(name => { const t = r.comp.find(x => x.name === name); return `<span style="width:${(t.share * 100).toFixed(2)}%;background:${t.color}" title="${esc(t.label)} ${pct(t.share)}"></span>`; }).join('')}</div></div>`).join('')}${hcBar}
    <div class="table-wrap"><table class="table comp-table"><thead><tr><th>Cell type</th>${compRows.map(r => (test ? `<th class="num" title="${esc(cd.groupTitle)}">${esc(r.g)} (median)</th>` : `<th class="num">${esc(r.g || 'Mean')}</th>`)).join('')}${hc ? `<th class="num" id="comp-healthy-th" title="Median over the ${num(hc.donors.length)} donors of the share of the cell type among the donor's reference cells, percent. Counted cells, not an estimate from bulk tissue">${esc(hc.short)} (median)</th>` : ''}${test ? `<th class="num" title="${esc(cd.title)}">${esc(cd.label)}</th><th class="num" title="${esc(c.composition.test || 'Two-sided rank-sum test per cell type, adjusted across cell types')}">Adjusted p</th>` : ''}</tr></thead><tbody>${order.map(name => { const t = compRows[0].comp.find(x => x.name === name), q = test?.get(name); return `<tr><td><span class="swatch" style="background:${t.color};margin-right:6px"></span>${esc(t.label)}</td>${compRows.map(r => `<td class="num">${test ? (q ? `${samplesFix(r.g === c.test ? q.median_test_pct : q.median_reference_pct)}%` : '—') : pct(r.comp.find(x => x.name === name).share)}</td>`).join('')}${hc ? `<td class="num" data-healthy-median="${esc(name)}">${samplesFix(hc.median[name] * 100)}%</td>` : ''}${test ? `<td class="num">${q ? samplesSigned(q[cd.field]) : '—'}</td><td class="num">${q ? fmtP(q.padj) : '—'}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>
    ${test ? `<p class="note" id="comp-means-note">${esc(cd.note)}${hc ? ` ${esc(cd.label)} and adjusted p compare ${esc(c.test)} with ${esc(samplesLower(c.reference))} only.` : ''}</p>` : ''}${hc && hc.note ? `<p class="note" id="comp-healthy-note"><b>${esc(hc.label)}.</b> ${esc(hc.note)}</p>` : ''}${ctx.reading ? `<p class="note" id="comp-reading">${esc(ctx.reading)}</p>` : ''}${test && ctx.caveat ? `<p class="note" id="comp-caveat">${esc(ctx.caveat)}</p>` : ''}</div>
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
  const rows = types.map((t, ti) => `<tr class="clickable${focus === t ? ' selected' : ''}" data-focustype="${esc(t)}" tabindex="0"><td><span class="swatch" style="background:${typeColor(t, ti)};margin-right:6px"></span>${esc(typeLabel(t))}</td>${groups.map((g, gi) => `<td class="num">${f2(V.meanExprCorr[gi]?.[ti])}<small>healthy cells: ${f2(V.meanExprCorrHealthy?.[gi]?.[ti])}</small></td>`).join('')}${groups.map((g, gi) => `<td class="num">${f2(V.nnDistRatioOtherCells[gi]?.[ti])}</td>`).join('')}${V.nearestIsSource ? groups.map((g, gi) => `<td class="num">${pct(V.nearestIsSource[gi]?.[ti], 0)}</td>`).join('') : ''}${groups.map((g, gi) => `<td class="num">${num(ts.nProfiles?.[gi]?.[ti])}</td>`).join('')}${ts.nSourceCells ? groups.map((g, gi) => `<td class="num">${num(ts.nSourceCells[gi]?.[ti])}</td>`).join('') : ''}</tr>`).join('');
  const gh = () => groups.map(g => `<th class="num">${esc(g)}</th>`).join('');
  return `<section class="card section" id="healthy-types"><div class="card-head"><div><div class="card-title">Cell types next to the healthy reference cells</div><div class="card-sub">How close the estimated profiles of each group are to healthy reference cells of the same type. Descriptions, not tests. Select a row to show only that cell type on the map at the top of this tab.</div></div><span class="badge">Descriptive</span></div>
    <div class="card-body"><div class="table-wrap"><table class="table compact" id="healthy-type-table"><thead><tr><th rowspan="2">Cell type</th><th class="num" colspan="${groups.length}" title="${esc(def('meanExprCorr'))}">Correlation with healthy cells</th><th class="num" colspan="${groups.length}" title="${esc(def('nnDistRatioOtherCells'))}">Distance to the nearest healthy cell (× healthy spacing)</th>${V.nearestIsSource ? `<th class="num" colspan="${groups.length}" title="${esc(def('nearestIsSource'))}">Nearest healthy cell is the profile's own source</th>` : ''}<th class="num" colspan="${groups.length}">Estimated profiles</th>${ts.nSourceCells ? `<th class="num" colspan="${groups.length}" title="Number of distinct reference cells from which these profiles were generated">Source cells</th>` : ''}</tr><tr>${gh()}${gh()}${V.nearestIsSource ? gh() : ''}${gh()}${ts.nSourceCells ? gh() : ''}</tr></thead><tbody>${rows}</tbody></table></div>
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
  const val = usePos ? mk.position : mk ? mk.corrHealthy : b.corrHealthy, valLabel = usePos ? (tx.positionAxis || 'Position on marker genes') : 'Correlation with the healthy pancreas average';
  const cmp = groupNames(d), groups = [...new Set(b.samples.map(s => s.group))].sort((p, q) => (cmp.includes(p) ? 2 - cmp.indexOf(p) : 0) - (cmp.includes(q) ? 2 - cmp.indexOf(q) : 0));
  const note = i => b.sampleNote?.[i] || null, title = (i, extra = '') => `${esc(b.samples[i].label || b.samples[i].id)} · ${esc(b.samples[i].group)}${extra}${note(i) ? ` · ${esc(note(i))}` : ''}`;
  const dot = (i, cx, cy, r) => { const k = healthyGroupColor(d, b.samples[i].group), m = !!note(i); return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}" fill="${m ? '#fff' : k}" fill-opacity="${m ? 1 : .8}" stroke="${m ? k : '#fff'}" stroke-width="${m ? 1.6 : .8}"${m ? ' data-marked="1"' : ''}><title>${title(i, Number.isFinite(val?.[i]) ? `: ${samplesFix(val[i], 2)}` : '')}</title></circle>`; };
  const L = 52, W = 430, T = 12, H = 300, x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), px = (x1 - x0) * .05 || 1, py = (y1 - y0) * .05 || 1;
  const X = v => L + (v - x0 + px) / (x1 - x0 + 2 * px) * W, Y = v => T + H - (v - y0 + py) / (y1 - y0 + 2 * py) * H;
  const idx = b.samples.map((s, i) => i).sort((p, q) => (cmp.includes(b.samples[p].group) ? 1 : 0) - (cmp.includes(b.samples[q].group) ? 1 : 0));
  const tk = (a, z, f) => ticksFor(a, z, 5).map(f).join('');
  /* lines between the tumor and the adjacent sample of one patient: at = sample id -> [x, y] */
  const sidx = Object.fromEntries(b.samples.map((s, i) => [s.id, i]));
  const pairLines = at => { const first = {}, out = []; for (const s of d.samples) { const p = patientOf(s), xy = at(s.id); if (!p || !xy) continue; if (first[p]) out.push(`<line class="pair-line" data-patient="${esc(p)}" x1="${first[p][0].toFixed(1)}" y1="${first[p][1].toFixed(1)}" x2="${xy[0].toFixed(1)}" y2="${xy[1].toFixed(1)}" stroke="#98a2b3" stroke-opacity=".6"><title>Patient ${esc(p)}</title></line>`); else first[p] = xy; } return out.join(''); };
  const scatterPairs = pairLines(id => (sidx[id] === undefined ? null : [X(xs[sidx[id]]), Y(ys[sidx[id]])]));
  const scatter = `<svg class="svgplot" id="healthy-scatter" viewBox="0 0 ${L + W + 10} ${T + H + 44}" role="img" aria-label="Healthy, adjacent and tumor samples by expression similarity"><g font-size="11.5" fill="#667085">${tk(x0, x1, v => `<line x1="${X(v).toFixed(1)}" x2="${X(v).toFixed(1)}" y1="${T + H}" y2="${T + H + 5}" stroke="#98a2b3"/><text x="${X(v).toFixed(1)}" y="${T + H + 18}" text-anchor="middle">${sig(v)}</text>`)}${tk(y0, y1, v => `<line x1="${L - 5}" x2="${L}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#98a2b3"/><text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${sig(v)}</text>`)}<line x1="${L}" x2="${L}" y1="${T}" y2="${T + H}" stroke="#98a2b3"/><line x1="${L}" x2="${L + W}" y1="${T + H}" y2="${T + H}" stroke="#98a2b3"/>
    <text class="axis-title" x="${L + W / 2}" y="${T + H + 38}" text-anchor="middle" fill="#344054">${esc(axes?.[0] || 'Component 1')}</text><text class="axis-title" transform="translate(13 ${T + H / 2}) rotate(-90)" text-anchor="middle" fill="#344054">${esc(axes?.[1] || 'Component 2')}</text></g>${scatterPairs}${idx.map(i => dot(i, X(xs[i]), Y(ys[i]), 4)).join('')}</svg>`;
  let strip = '';
  if (Array.isArray(val)) {
    const pts = b.samples.map((s, i) => i).filter(i => Number.isFinite(val[i]));
    const lo = Math.min(...pts.map(i => val[i]), usePos ? 0 : Infinity), hi = Math.max(...pts.map(i => val[i]), usePos ? 1 : -Infinity), pad = (hi - lo) * .08 || .01, a = lo - pad, z = hi + pad, L2 = 56, W2 = 300, cw = W2 / groups.length, Y2 = v => T + H - (v - a) / (z - a) * H;
    const spos = {}, sd = pts.map((i, n) => { const k = groups.indexOf(b.samples[i].group), x = L2 + cw * (k + .5) + ((((n + 1) * 7919) % 97) / 97 - .5) * cw * .5; spos[b.samples[i].id] = [x, Y2(val[i])]; return dot(i, x, Y2(val[i]), 3.6); }).join('');
    const stripPairs = pairLines(id => spos[id] || null);
    const med = groups.map((g, k) => { const v = pts.filter(i => b.samples[i].group === g).map(i => val[i]).sort((p, q) => p - q); if (!v.length) return ''; const m = v.length % 2 ? v[v.length >> 1] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2, x = L2 + cw * (k + .5); return `<line x1="${(x - cw * .3).toFixed(1)}" x2="${(x + cw * .3).toFixed(1)}" y1="${Y2(m).toFixed(1)}" y2="${Y2(m).toFixed(1)}" stroke="#0b1f33" stroke-width="2"><title>Median of the samples shown, ${esc(g)}: ${m.toFixed(2)}</title></line>`; }).join('');
    const pm = tx.positionMarks || ['0 = healthy average', '1 = tumor average'];
    const refs = usePos ? [0, 1].map(v => `<line x1="${L2}" x2="${L2 + W2}" y1="${Y2(v).toFixed(1)}" y2="${Y2(v).toFixed(1)}" stroke="#d0d5dd" stroke-dasharray="3 3"/><text class="ref-mark" x="${v ? L2 + 4 : L2 + W2 - 2}" y="${(Y2(v) - 4).toFixed(1)}" text-anchor="${v ? 'start' : 'end'}" font-size="10.5">${esc(pm[v])}</text>`).join('') : '';
    const xl = groups.map((g, k) => `<text x="${(L2 + cw * (k + .5)).toFixed(1)}" y="${T + H + 17}" text-anchor="middle" fill="#344054">${esc(g.replace(/ \(GTEx\)$/, ''))}</text><text x="${(L2 + cw * (k + .5)).toFixed(1)}" y="${T + H + 31}" text-anchor="middle">n = ${pts.filter(i => b.samples[i].group === g).length}</text>`).join('');
    strip = `<svg class="svgplot" id="healthy-strip" viewBox="0 0 ${L2 + W2 + 8} ${T + H + 44}" role="img" aria-label="${esc(valLabel)} by group"><g font-size="11.5" fill="#667085">${tk(a, z, v => `<line x1="${L2 - 5}" x2="${L2}" y1="${Y2(v).toFixed(1)}" y2="${Y2(v).toFixed(1)}" stroke="#98a2b3"/><text x="${L2 - 8}" y="${(Y2(v) + 4).toFixed(1)}" text-anchor="end">${v.toFixed(2)}</text>`)}${refs}<line x1="${L2}" x2="${L2}" y1="${T}" y2="${T + H}" stroke="#98a2b3"/><line x1="${L2}" x2="${L2 + W2}" y1="${T + H}" y2="${T + H}" stroke="#98a2b3"/>${xl}<text class="axis-title" transform="translate(13 ${T + H / 2}) rotate(-90)" text-anchor="middle" fill="#344054">${esc(valLabel)}</text></g>${stripPairs}${sd}${med}</svg>`;
  }
  const g = b.gtex || {}, nMarked = (b.sampleNote || []).filter(Boolean).length;
  const toggle = b.markerOnly ? `<div class="segmented" role="group" aria-label="Genes used"><button class="${mk ? 'active' : ''}" data-healthyview="markers">Marker genes</button><button class="${mk ? '' : 'active'}" data-healthyview="all">All genes</button></div>` : '';
  return `<section class="card section" id="healthy-bulk"><div class="card-head"><div><div class="card-title">Bulk samples next to healthy pancreas</div><div class="card-sub">${mk ? `Pancreas samples of deceased donors from another project (GTEx, shown as healthy pancreas), adjacent pancreas and PDAC on ${num(mk.nGenes)} marker genes of acinar, ductal, islet and stromal cells` : `Pancreas samples of deceased donors from another project (GTEx, shown as healthy pancreas), adjacent pancreas and PDAC on the ${num(b.nGenes)} expressed genes shared by both sources; the main axis separates the two data sources`}</div></div><div class="controls">${toggle}<span class="badge">Descriptive</span></div></div>
    <div class="card-body">${mk ? '' : `<div class="alert warn" id="healthy-source-warning">${esc(tx.bulkCaveat || 'The horizontal axis mainly separates the two data sources, not healthy from diseased tissue.')}</div>`}
    <div class="grid halves"><div>${scatter}</div><div>${strip}</div></div>
    <div class="legend static">${groups.map(x => `<span><span class="swatch" style="background:${healthyGroupColor(d, x)}"></span>${esc(x)} (${num(b.samples.filter(s => s.group === x).length)}${x.includes('GTEx') && g.n ? ` of ${num(g.n)} shown` : ''})</span>`).join('')}${nMarked ? `<span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#fff" stroke="#667085" stroke-width="1.6"/></svg>Marked sample (${num(nMarked)}; see the note below)</span>` : ''}${scatterPairs ? `<span id="healthy-pair-key"><svg width="18" height="10" aria-hidden="true"><line x1="1" y1="5" x2="17" y2="5" stroke="#98a2b3" stroke-width="1.5"/></svg>Line: the PDAC and the adjacent sample of one patient</span>` : ''}${strip ? '<span><svg width="18" height="10" aria-hidden="true"><line x1="1" y1="5" x2="17" y2="5" stroke="#0b1f33" stroke-width="2"/></svg>Group median (right chart)</span>' : ''}</div>
    <p class="note">${esc(mk ? (tx.markerCaption || '') : (tx.bulkCaption || ''))}${usePos && mk.positionDefinition ? ` ${esc(mk.positionDefinition)}` : ''}</p>
    ${mk && tx.markerReading ? `<p class="note" id="healthy-reading"><b>Reading.</b> ${esc(tx.markerReading)}</p>` : ''}${!mk && tx.corrNote ? `<p class="note">${esc(tx.corrNote)}</p>` : ''}
    ${tx.markedNote ? `<p class="note">Marked samples: ${esc(tx.markedNote)}</p>` : ''}
    ${b.batchNote ? `<details class="advanced" id="healthy-batch"><summary>How much of the difference between the two data sources is technical</summary><p class="note">${esc(b.batchNote)}</p></details>` : ''}
    ${g.release ? `<p class="note">Healthy pancreas: ${esc(g.release)}, pancreas, ${num(g.n)} samples${g.nShown && g.nShown < g.n ? ` (${num(g.nShown)} shown, chosen at random; averages and components use all)` : ''}${g.url ? ` · <a href="${esc(g.url)}" target="_blank" rel="noopener">GTEx Portal</a>` : ''}. Credit in About.${tx.gtexNote ? ` <span id="healthy-gtex-note">${esc(tx.gtexNote)}</span>` : ''}</p>` : ''}</div></section>`;
}
function viewSamples() {
  const d = state.data, c = d.comparison;
  if (!d.healthy && d.healthyUrl && !String(d.lazy.healthy || '').startsWith('error')) ensureLazy('healthy', checkHealthy);
  const hasFractions = d.samples.length && d.samples.some(s => Object.keys(s.fractions).length);
  if (!hasFractions)
    return `${pageHead('Samples', 'Samples and map', '')}${d.metabolic ? mapCard(d) : ''}<div class="card section"><div class="empty">This result does not include per-sample fractions.</div></div>`;
  const order = meanComposition(d).map(t => t.name), types = d.cellTypes.map(t => t.name);
  const metaKeys = [...new Set(d.samples.flatMap(s => Object.keys(s.meta)))].filter(k => k !== 'Tissue');
  const ctx = samplesText('compositionText'), ftx = samplesText('fitText'), marks = samplesMarks(d);
  const metaTitle = { Stage: ctx.stageTitle, Age: ctx.ageTitle, 'Fit to reference': ftx.columnTitle || 'How well the best mixture of the reference cell types reproduces the sample\u2019s expression. A property of the fit, not a statement that a sample is healthy' };
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
  const sortedBy = s.key === 'label' ? 'sample name' : s.key.startsWith('f:') ? `${typeNoun(s.key.slice(2))} fraction` : s.key.startsWith('m:') ? s.key.slice(2).toLowerCase() : 'estimated profiles';
  const th = (k, l, o = {}) => sortTh('samples', k, l, { defKey, defDir: 1, ...o });
  const table = `<table class="table"><thead><tr>${th('label', 'Sample')}${metaKeys.map(k => th(`m:${k}`, esc(k), { num: numericMeta.has(k), title: metaTitle[k] || '' })).join('')}${order.map(t => th(`f:${t}`, `${esc(typeLabel(t))} (%)`, { num: true })).join('')}${th('profiles', 'Estimated profiles', { num: true, title: 'Single-cell profiles estimated from this sample' })}</tr></thead>
  <tbody>${rows.map(x => `<tr class="clickable${x.id === sel.id ? ' selected' : ''}" data-sample-pick="${esc(x.id)}"><td><button type="button" class="name-link" data-sample-pick="${esc(x.id)}">${esc(x.label)}</button>${x.label !== x.id ? `<small>${esc(x.id)}</small>` : ''}${marks[x.id] ? `<small class="sample-mark">Marked: ${esc(marks[x.id])}</small>` : ''}</td>${metaKeys.map(k => `<td${numericMeta.has(k) ? ' class="num"' : ''}>${k === 'Fit to reference' && x.meta[k] === 'Poor' ? '<span class="badge warn">Poor</span>' : esc(x.meta[k] ?? '—')}</td>`).join('')}${order.map(t => `<td class="num">${Number.isFinite(x.fractions[t]) ? (x.fractions[t] * 100).toFixed(1) : '—'}</td>`).join('')}<td class="num">${num(x.profiles)}</td></tr>`).join('')}</tbody></table>`;
  const byGroup = !!c?.composition, cv = byGroup && state.compView === 'groups' ? 'groups' : 'samples';
  const stacked = `<svg viewBox="0 0 ${L + W + 4} ${T + H + 52}" style="width:100%;height:auto" role="img" aria-label="Stacked composition per sample">
    <g font-size="12" fill="#667085">${axis}<line x1="${L}" x2="${L}" y1="${T}" y2="${T + H}" stroke="#98a2b3"/>
    <text transform="translate(14 ${T + H / 2}) rotate(-90)" text-anchor="middle" fill="#344054">Estimated fraction of cells (%)</text>
    <text x="${L + W / 2}" y="${T + H + 40}" text-anchor="middle" fill="#344054">Samples (n = ${num(rows.length)}) in table order, sorted by ${esc(sortedBy)}${c ? '; strip under the bars: group' : ''}</text></g>${bars}${groupStripRects}</svg>
  <div class="legend static">${order.map(t => `<span><span class="swatch" style="background:${typeColor(t, types.indexOf(t))}"></span>${esc(typeLabel(t))}</span>`).join('')}${c ? groupNames(d).map(g => `<span><span class="swatch" style="background:${groupColor(d, g)};border-radius:1px"></span>${esc(g)} (strip)</span>`).join('') : ''}</div>`;
  const compSamples = `<section class="card section" id="comp-samples"><div class="card-head"><div><div class="card-title">${cv === 'groups' ? 'Composition by group' : 'Composition of every sample'}</div><div class="card-sub">${cv === 'groups' ? `Estimated fraction of cells of each type in every sample (%), by group, with the ${c.composition?.paired ? 'paired ' : ''}test between the groups` : 'Estimated fraction of cells of each type in every sample (%). The chart follows the order of the table below; select a bar to see the sample.'}</div></div>
    ${byGroup ? `<div class="segmented" role="group" aria-label="Composition view"><button class="${cv === 'samples' ? 'active' : ''}" data-compview="samples">Per sample</button><button class="${cv === 'groups' ? 'active' : ''}" data-compview="groups">By group and cell type</button></div>` : ''}</div>
    <div class="card-body">${cv === 'groups' ? compositionCompare(c, { body: true }) : stacked}</div></section>`;
  return `${pageHead('Samples', 'Samples, map and cell-type composition', `The estimated single-cell profiles on the map, and the estimated share of cells of each type in each of the ${plural(rows.length, 'bulk sample')}${c ? ' and in each group' : ''}. Select a column header to sort a table and a sample to see its details on the right.${ctx.selection ? ` ${esc(ctx.selection)}` : ''}`,
    `<div class="controls">${c && byGroup ? `<span class="note" style="margin:0">Groups compared on the bulk samples: ${esc(generalVs(c))}</span>` : ''}<button class="btn btn-secondary" data-action="exportcomposition">${icon('download')} CSV</button></div>`)}
  ${oodBanner(d)}
  ${d.metabolic ? `<div class="grid two samples-top">${mapCard(d)}${compositionMeansCard(d)}</div>` : compositionMeansCard(d)}
  ${String(d.lazy.healthy || '').startsWith('error') ? '<div class="alert warn section" id="healthy-error">The comparison with healthy pancreas (healthy reference cells on the map, cell types next to the reference cells, bulk samples next to healthy pancreas) could not be loaded. Reload the page to try again.</div>' : ''}
  ${compSamples}
  ${healthyBulkCard(d)}
  <div class="split section" id="sample-split"><section class="card"><div class="card-head"><div><div class="card-title">Composition table</div><div class="card-sub">Estimated fraction of cells per type (%); patient characteristics as reported by the source study</div></div></div>
    <div class="card-body table-wrap tall" data-scroll-id="samples-table">${table}</div>${ctx.idNote ? `<div class="card-foot"><span id="sample-id-note">${esc(ctx.idNote)}</span></div>` : ''}</section>
    <aside class="detail">${sampleDetail(d, sel, order)}</aside></div>
  ${healthyTypeCard(d)}
  <div class="section">${glossary(d, { compact: true })}</div>`;
}
function sampleDetail(d, s, order) {
  const g = s.meta?.Group, peers = g ? d.samples.filter(x => x.meta?.Group === g) : d.samples;
  const median = t => { const v = peers.map(x => x.fractions[t]).filter(Number.isFinite).sort((a, b) => a - b); return v.length ? (v.length % 2 ? v[v.length >> 1] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; };
  const vmax = Math.max(...order.map(t => Math.max(s.fractions[t] || 0, median(t) || 0)), .05);
  const bars = order.map(t => { const v = s.fractions[t] || 0, m = median(t); return `<div class="hbar med"><span>${esc(typeLabel(t))}</span><span class="track"><i style="width:${(v / vmax * 100).toFixed(1)}%;background:${typeColor(t)}"></i>${Number.isFinite(m) ? `<em style="left:${(m / vmax * 100).toFixed(1)}%" title="Median of ${esc(g ? generalGroupInText(g) : 'all')} samples: ${pct(m)}"></em>` : ''}</span><b>${pct(v)}</b></div>`; }).join('');
  const pair = s.meta?.Patient ? d.samples.find(x => x.id !== s.id && x.meta?.Patient === s.meta.Patient) : null;
  const facts = ['Group', 'Patient', 'Stage', 'Grade', 'Sex', 'Age'].filter(k => s.meta?.[k] !== undefined && s.meta[k] !== null && s.meta[k] !== '').map(k => `<div class="metric"><small>${esc(k)}</small><b>${esc(s.meta[k])}</b></div>`).join('');
  const fit = s.fit ? `<p class="note" id="sample-fit">Fit to the reference mixture: correlation ${samplesFix(s.fit.fit_r, 3)}, unassigned share ${Number.isFinite(s.fit.unexplained) ? (s.fit.unexplained * 100).toFixed(1) : '—'}% · ${s.fit.outside_reference ? '<span class="badge warn">Poor fit</span>' : 'adequate fit'}. Both numbers are defined under Composition by group.</p>` : '';
  const mark = samplesMarks(d)[s.id], shownHere = d.cells.filter(c => c.sample === s.id).length;
  const pbt = s.profilesByType ? `<p class="note">Estimated profiles from this sample, by cell type: ${order.filter(t => s.profilesByType[t]).map(t => `${esc(typeLabel(t))} ${num(s.profilesByType[t])}`).join(' · ')}</p>` : '';
  const hasMap = d.metabolic && d.cells.some(c => c.sample === s.id);
  return `<section class="card"><div class="card-head"><div><div class="card-title">${esc(s.label)}</div><div class="card-sub">${esc(s.meta?.Tissue || s.id)}${s.profiles ? ` · ${plural(s.profiles, 'estimated profile')}` : ''}</div></div>${g ? `<span class="badge" style="background:${groupColor(d, g)}1a;color:${groupColor(d, g)}">${esc(g)}</span>` : ''}</div>
    <div class="card-body">${facts ? `<div class="metrics small">${facts}</div>` : ''}
    <div class="note" style="margin:14px 0 4px">Estimated composition of this sample (bars) and the median of ${esc(g ? `${g} samples` : 'all samples')} (marks)</div>${bars}${TYPE_COLOR_NOTE}${fit}${mark ? `<p class="note" id="sample-mark"><b>Marked sample.</b> ${esc(mark)}</p>` : ''}${pbt}
    ${pair ? `<p class="note">Same patient: <button type="button" class="link-btn" data-sample-pick="${esc(pair.id)}">${esc(pair.label)}</button></p>` : ''}
    ${hasMap ? `<div class="note" style="margin:16px 0 4px">Profiles estimated from this sample on the metabolic map (colored by cell type; other samples' profiles in gray). The map displays ${num(shownHere)} of this sample's ${num(s.profiles ?? shownHere)} profiles.</div><div class="embed-wrap"><svg class="embedding mini" viewBox="0 0 440 280" data-w="440" data-h="280" data-space="metabolic" role="img" aria-label="Profiles of this sample on the metabolic map"></svg><div class="tip hidden"></div></div>` : ''}</div></section>`;
}

/* ---------- Metabolic pathways ---------- */
const CAT_COLORS = ['#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#76b7b2', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac', '#86bcb6', '#d37295'];
function filteredPathways(d) {
  const q = state.search;
  return d.pathways.filter(x => (!q || `${x.name} ${x.id} ${metabolicMapId(x.id)} ${x.category}`.toLowerCase().includes(q)) && (state.category === 'all' || x.category === state.category));
}
function heatRows(d) {
  let rows = filteredPathways(d).filter(p => !isOverviewMap(p.id) || state.category === 'Overview map');
  if (!state.heatAll) { const sel = rows.find(p => p.id === state.pathway); rows = rows.slice().sort((a, b) => b.spread - a.spread).slice(0, METABOLIC_TOP); if (sel && !rows.includes(sel)) rows.push(sel); }
  const cats = [...new Set(d.pathways.map(p => p.category))].sort();
  return rows.slice().sort((a, b) => cats.indexOf(a.category) - cats.indexOf(b.category) || b.spread - a.spread);
}
function pathwayHover(d, p, i) {
  const t = d.cellTypes[i], v = p.activity[i], order = p.activity.map((x, k) => [x, k]).filter(x => Number.isFinite(x[0])).sort((a, b) => b[0] - a[0]);
  const rank = order.findIndex(x => x[1] === i) + 1, info = d.pathwayInfo[p.id];
  return `<b>${esc(p.name)}</b> (${esc(metabolicMapId(p.id))})<br>${esc(p.category)} · ${plural(p.reactionCount, 'reaction')} · ${plural(p.genes.length, 'enzyme gene')} in the model` +
    (info?.description ? `<br><i>${esc(info.description)}</i>` : '') +
    `<br><br><b>${esc(t.label)}</b>: activity ${sig(v)} (relative units)<br>z-score across cell types: ${sig(p.z[i])} · rank ${rank} of ${order.length}` +
    `<br>Highest in: ${esc(typeLabel(p.top || '—'))}${metabolicLead(d, p) ? ` (${esc(metabolicLead(d, p))})` : ''} · mean over all profiles ${sig(p.score)}<br><span style="color:#667085">Select to open this pathway</span>`;
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
    const lim = zmode ? Math.max(1.5, ...z.flat().filter(Number.isFinite).map(Math.abs)) : null, cap = zmode ? null : metabolicCap(z.flat());
    const main = { type: 'heatmap', z, x: types.map(t => t.label), y: rows.map(p => p.name), text: rows.map(p => types.map((t, i) => pathwayHover(d, p, i))), hoverinfo: 'text',
      colorscale: zmode ? [[0, '#2166ac'], [.5, '#f7f7f7'], [1, '#b2182b']] : [[0, '#f0f9f7'], [1, '#0f766e']], zmid: zmode ? 0 : undefined, zmin: zmode ? -lim : 0, zmax: zmode ? lim : cap.max,
      xgap: 1, ygap: 1, colorbar: { title: { text: zmode ? 'z-score across<br>cell types' : `Activity<br>(relative units${cap.capped ? `;<br>scale ends at ${sig(cap.max)}` : ''})`, side: 'right' }, thickness: 12, len: Math.min(1, 360 / (rows.length * 18 + 60)), y: 1, yanchor: 'top', outlinewidth: 0 } };
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
  const nHeat = heatRows(d).length, nHeatAll = list.filter(x => !isOverviewMap(x.id) || state.category === 'Overview map').length;
  return `${pageHead('Metabolic pathways', 'Metabolic pathway explorer', `Estimated activity of ${metabolicCountText(d)} in each cell type, from the metabolic model applied to the estimated single-cell profiles (relative units; compare values within this analysis). Select a pathway in the heatmap or the table to see its details, map and literature support.`, `<div class="controls"><button class="btn btn-secondary" data-action="exportpathways">${icon('download')} CSV</button></div>`)}
  ${metabolicNotes()?.scope ? `<div class="banner" id="metabolic-scope">${icon('info')}<div>${esc(metabolicNotes().scope)}</div></div>` : ''}
  <section class="card"><div class="card-head"><div><div class="card-title">Pathway activity heatmap</div><div class="card-sub">Rows: KEGG pathways, grouped by category (left strip); columns: cell types. Color: ${state.heatScale === 'z' ? 'z-score of the pathway\u2019s activity across cell types (red: above the pathway\u2019s average over cell types; blue: below)' : 'mean activity in relative units; the color scale ends at the 95th percentile of the values shown, and higher values have the darkest color'}. Hover a cell to outline its pathway (row) and cell type (column) and to see the category, reactions, enzyme genes, value and rank. Select a cell to keep its pathway and cell type outlined and to open the pathway below.</div></div></div>
    <div class="card-body"><div class="controls" style="margin-bottom:10px">${controls}<div class="segmented" role="group" aria-label="Rows"><button class="${state.heatAll ? '' : 'active'}" data-heat-all="0">${METABOLIC_TOP} most variable</button><button class="${state.heatAll ? 'active' : ''}" data-heat-all="1">All ${num(nHeatAll)}</button></div>
    <div class="segmented" role="group" aria-label="Color scale"><button class="${state.heatScale === 'z' ? 'active' : ''}" data-heat-scale="z">z-score</button><button class="${state.heatScale === 'raw' ? 'active' : ''}" data-heat-scale="raw">Activity</button></div><span class="note" style="margin:0">${plural(nHeat, 'pathway')} shown${!state.heatAll && nHeat > METABOLIC_TOP ? ` (the ${METABOLIC_TOP} most variable and the selected pathway)` : ''}${state.category === 'Overview map' ? '' : '; overview maps are in the table'}</span></div>
    <div id="pathway-heat" class="heatmap-frame"><div class="empty">Loading the heatmap…</div></div>
    <div class="legend static">${categories.filter(c => heatRows(d).some(x => x.category === c)).map(c => `<span><span class="swatch" style="background:${CAT_COLORS[categories.indexOf(c) % CAT_COLORS.length]}"></span>${esc(c)}</span>`).join('')}</div>${metabolicReading(d)}</div></section>
  <div class="split section" id="pathway-detail"><section class="card"><div class="card-head"><div><div class="card-title">All pathways</div><div class="card-sub">${list.length < d.pathways.length ? `${plural(rows.length, 'row')} ${rows.length === 1 ? 'matches' : 'match'} the filter (of ${num(d.pathways.length)})` : metabolicCountText(d)}. Select a column header to sort.</div></div></div>
    <div class="card-body table-wrap tall" data-scroll-id="pathways-table"><table class="table"><thead><tr>${th('name', 'Pathway')}${th('category', 'Category')}${th('score', 'Mean activity (all profiles)', { num: true, title: 'Mean over all estimated profiles, relative units; cell types with many profiles weigh more. Not the mean of the cell-type values.' })}${th('top', 'Highest in', { title: `Cell type with the highest mean activity, and its lead: its value divided by the value of the second cell type.${metabolicNotes()?.runsShort ? ` ${metabolicNotes().runsShort}` : ''}` })}${th('spread', 'Spread', { num: true, title: '(highest − lowest) ÷ mean of the cell-type values' })}${th('rx', 'Reactions', { num: true, title: 'Reactions of the metabolic model in the pathway; the map counts reaction steps, so its number can differ' })}${th('genes', 'Enzyme genes', { num: true, title: 'Genes that the metabolic model attaches to the reactions of the pathway; not KEGG\u2019s human gene list' })}</tr></thead>
    <tbody>${rows.map(x => `<tr class="clickable${x.id === p.id ? ' selected' : ''}" data-pathway="${esc(x.id)}"><td><button type="button" class="name-link" data-pathway="${esc(x.id)}">${esc(x.name)}</button><small>${esc(metabolicMapId(x.id))}</small></td><td><span class="badge"${d.pathwayInfo[x.id]?.keggClass ? ` title="KEGG class: ${esc(d.pathwayInfo[x.id].keggClass)}"` : ''}>${esc(x.category)}</span></td><td class="num">${sig(x.score)}</td><td>${esc(typeLabel(x.top || '—'))}<small>${esc(metabolicLead(d, x))}</small>${metabolicBadges(d, x)}</td><td class="num">${sig(x.spread)}</td><td class="num">${num(x.reactionCount)}</td><td class="num">${num(x.genes.length)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No pathways match the filter.</td></tr>'}</tbody></table></div></section>
    <aside class="detail">${pathwayDetail(d, p)}</aside></div>
  <section class="card section"><div class="card-head"><div><div class="card-title">Pathway map: ${esc(p.name)}</div><div class="card-sub">Lines are reaction steps and points are metabolites. A step joins all reactions between two metabolites, in either direction, and has one activity value. Line color: mean reaction activity across all estimated profiles (relative units), from 0 to the highest step of this map; colors cannot be compared between maps.${Array.isArray(d.pathwayInfo[p.id]?.reactionsNoHumanGene) && d.pathwayInfo[p.id].reactionsNoHumanGene[0] ? ` The map is a KEGG reference map: ${num(d.pathwayInfo[p.id].reactionsNoHumanGene[0])} of its ${plural(d.pathwayInfo[p.id].reactionsNoHumanGene[1], 'KEGG reaction')} ${d.pathwayInfo[p.id].reactionsNoHumanGene[0] === 1 ? 'has' : 'have'} no human gene in KEGG.` : ''} Hover a line for its enzymes and literature; select a row of the literature table to highlight its step.</div></div><a class="badge accent" href="https://www.kegg.jp/pathway/hsa${esc(p.id.slice(2))}" target="_blank" rel="noopener" title="Open the human KEGG map">KEGG ${esc(p.id.replace('rn', 'hsa'))}</a></div>
    <div class="card-body"><div id="pathway-map" class="map-frame"><div class="empty">Loading pathway map…</div></div>${metabolicStepNotes(d, p)}</div></section>
  <section class="card section" id="literature-card"><div class="card-head"><div><div class="card-title">Literature support</div><div class="card-sub">${esc(literatureScopeText())}</div></div><span class="badge accent">${esc(literatureScopeBadge())}</span></div>
    <div class="card-body" id="literature-body"><div class="empty">Loading literature support…</div></div></section>`;
}
function pathwayDetail(d, p) {
  const vals = p.activity.map((v, i) => ({ v, t: d.cellTypes[i], z: p.z[i] })).filter(x => Number.isFinite(x.v)).sort((a, b) => b.v - a.v);
  const vmax = Math.max(...vals.map(x => x.v), 1e-9), info = d.pathwayInfo[p.id];
  return `<section class="card"><div class="card-head"><div><div class="card-title">${esc(p.name)}</div><div class="card-sub">${esc(metabolicMapId(p.id))} · <span${info?.keggClass ? ` title="KEGG class: ${esc(info.keggClass)}"` : ''}>${esc(p.category)}</span></div></div><span class="badge accent">KEGG</span></div>
    <div class="card-body">${info?.description ? `<p class="lead">${esc(info.description)}</p>` : ''}${info?.background ? `<p class="note" data-metabolic-background style="margin:0 0 12px"><b>Known biology, not a result of this analysis:</b> ${esc(info.background)}</p>` : ''}${p.note ? `<p class="note" style="margin:0 0 12px">${esc(p.note)}</p>` : ''}${(info?.flags || []).map(f => `<p class="note" data-metabolic-flag="${esc(f[0])}" style="margin:0 0 12px"><b>Read with care.</b> ${esc(f[2])}</p>`).join('')}
    <div class="metrics"><div class="metric" title="Mean over all estimated profiles; cell types with many profiles weigh more. Not the mean of the cell-type values below."><small>Mean activity (all profiles)</small><b>${sig(p.score)}</b></div><div class="metric" title="Reactions of the metabolic model in this pathway; the map counts reaction steps, so its number can differ"><small>Reactions</small><b>${num(p.reactionCount)}</b></div><div class="metric" title="Genes that the metabolic model attaches to the reactions of the pathway"><small>Enzyme genes</small><b>${num(p.genes.length)}</b></div><div class="metric" title="Lead: value of the highest cell type divided by the value of the second cell type"><small>Highest activity</small><b>${esc(typeLabel(p.top || '—'))}</b>${metabolicLead(d, p) ? `<span class="of">${esc(metabolicLead(d, p))}</span>` : ''}</div></div>
    <div class="note" style="margin:16px 0 6px">Activity by cell type (relative units; z-score across cell types in brackets)</div>${vals.map(x => `<div class="hbar"><span>${esc(x.t.label)}</span><span class="track"><i style="width:${(x.v / vmax * 100).toFixed(1)}%;background:${x.t.color}"></i></span><b>${sig(x.v)} <small>(${x.z >= 0 ? '+' : ''}${sig(x.z)})</small></b></div>`).join('')}${TYPE_COLOR_NOTE}
    ${spatialPanel(d, 'metabolic', p.id, p.name)}
    ${metabolicGeneNotes(d, p)}
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
      /* integration (general-032): a map file is fetched once per session; the figure is copied because it is changed below */
      state.mapCache ||= {};
      const cached = state.mapCache[id] ??= await (await fetch(d.maps[id])).json();
      fig = JSON.parse(JSON.stringify(cached));
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
      hover.text = hover.text.map((txt, j) => byIndex.has(j) ? `${txt}${metabolicStepHover(d, id, byIndex.get(j))}` : txt);
    }
    metabolicRescaleMap(fig, hover);
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
  cancer: { badge: 'Pancreatic tumors', noun: 'pancreatic tumor papers', short: 'pancreatic tumor papers', col: 'Pancreatic tumor papers' },
  no_cancer: { badge: 'Human pancreas', noun: 'human pancreas papers (pancreatic cancer excluded)', short: 'human pancreas', col: 'Human pancreas papers' },
  all: { badge: 'Human pancreas', noun: 'human pancreas papers', short: 'human pancreas', col: 'Human pancreas papers' },
};
const scopeInfo = () => SCOPE[litScope()] || SCOPE.all;
function literatureScopeText() { return `Papers that mention the enzymes of each reaction step drawn on the map: ${scopeInfo().noun} in PubMed (genes recognized automatically by PubTator3, in the full text where it is available) and curated enzyme evidence (UniProtKB/Swiss-Prot). A count is a count of mentions: it shows that an enzyme is discussed, not that the paper is about it or that the reaction is active.`; }
/* Audit fixes of 20 November 2026 (area literature): wording helpers of the literature panels. */
const literatureExpected = v => (Number.isFinite(v) && Math.abs(v) >= 1000 ? num(Math.round(v)) : sig(v));
const literatureNoun = (n, noun) => (Number(n) === 1 ? noun.replace(/papers\b/, 'paper') : noun);
const literatureVerb = n => (Number(n) === 1 ? 'mentions' : 'mention');
const literaturePct = v => (Number.isFinite(v) ? `${num(100 * v, v < 0.01 ? 2 : v < 0.1 ? 1 : 0)}%` : '—');
const literatureMark = (g, marks) => (marks?.[g] ? ` <span class="badge warn" title="${esc(`${g}: ${marks[g]}`)}">check name</span>` : '');
/* Sentences that every literature panel carries: what a link is, what is left out (numbers from the literature files). */
function literatureGuide(c) {
  if (!c) return '';
  return ` Genes are recognized in the full text where it is available: the gene is named in the title, abstract or keywords in ${literaturePct(c.geneNamedInTitleAbstractShare ?? c.titleAbstractShare)} of the gene-paper links, so a linked paper may not show the gene in its abstract. ${num(c.wrongNameLinksRemoved)} links in which the recognized name stands for something else (an abbreviation of a drug, disease, cell type or method, or another gene) and ${num(c.retractedRemoved)} retracted publications are not counted. Genes marked “check name” mostly appear under a family name or an ambiguous abbreviation, or only in the full text; they are left out of the rankings.`;
}
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
  if (!c.genes?.length) return '<br>Enzyme genes: none in the metabolic model';
  const genes = c.genes.slice(0, 4).join(', ') + (c.genes.length > 4 ? ` +${c.genes.length - 4}` : '');
  return `<br>Enzymes: ${esc(genes)}<br>${esc(scopeInfo().col)}: ${num(c.pancreas)}` +
    (c.top ? `<br>Most specific cell type: ${esc(typeLabel(c.top))}; papers that also mention ${esc(typeNoun(c.top))} cells: ${num(c.cell)} (expected ${sig(c.expected)})` : '') +
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
  if (!r.genes?.length) return ['none', 'No enzyme gene in the model'];
  if (r.hypothesis) return ['hyp', 'Candidate hypothesis'];
  if ((r.cell || 0) > 0) return ['cell', `Mentioned with ${typeNoun(r.top)} cells`];
  if ((r.pancreas || 0) > 0) return ['scope', `Mentioned in ${scopeInfo().short}`];
  if ((r.pancreasInclCancer || 0) > 0) return ['other', 'Other pancreas papers only'];
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
    const marked = g ? r.genes.filter(x => lit.marks?.[x]) : [];
    const genes = g ? esc(r.genes.slice(0, 3).join(', ')) + (r.genes.length > 3 ? ` <small>+${r.genes.length - 3} more</small>` : '') + (marked.length ? ` <span class="badge warn" title="${esc(marked.map(x => `${x}: ${lit.marks[x]}`).join(' '))}">check name</span>` : '') : '<span class="note">None in the model</span>';
    const rx = String(r.reactions || '').split(';').filter(Boolean);
    return `<tr class="clickable${sel && sel.key === r.key ? ' selected' : ''}" data-litrow="${esc(r.key)}"><td><button type="button" class="name-link" data-litrow="${esc(r.key)}">${r.steps.map(x => `${esc(x.a)} – ${esc(x.b)}`).join('<br>')}</button><small>${esc(rx.slice(0, 3).join(', '))}${rx.length > 3 ? ` +${rx.length - 3}` : ''}</small></td>
      <td>${genes}</td><td>${r.top ? esc(typeLabel(r.top)) : '—'}<small>${esc(specificity(r))}</small></td>
      <td class="num">${g ? paperLink(r.pancreas, r.pancreasPmids, sc.noun) : '—'}</td>
      <td class="num">${g && r.top ? paperLink(r.cell, r.cellPmids, `also mention ${typeNoun(r.top)} cells`) : '—'}${g && Number.isFinite(r.expected) ? `<small>expected ${sig(r.expected)}</small>` : ''}</td>
      <td class="num">${g && Number.isFinite(r.expected) ? sig((r.cell + .5) / (r.expected + .5)) : '—'}</td>
      <td class="num">${g ? paperLink(r.curated, r.curatedPmids, 'curated enzyme evidence') : '—'}</td>
      <td><span class="status s-${st}">${esc(stLabel)}</span></td></tr>`;
  }).join('');
  const recent = paperList(s.pancreasPmids, lit.titles, 5);
  const summary = `<div class="metrics five"><div class="metric"><small>Reaction steps on the map</small><b>${num(rowsAll.length)}</b></div><div class="metric"><small>With enzyme genes in the model</small><b>${num(withGenes.length)}</b></div><div class="metric"><small>Mentioned in ${esc(sc.short)}</small><b>${num(nScope)} <span class="of">of ${num(withGenes.length)}</span></b></div><div class="metric"><small>Mentioned with the most specific cell type</small><b>${num(nCell)} <span class="of">of ${num(withGenes.length)}</span></b></div><div class="metric"><small>Candidate hypotheses</small><b>${num(nHyp)}</b></div></div>
    <div class="lit-summary">${top ? `<p><b>Most specific cell type for this pathway: ${esc(label)}</b> (highest relative activity)${differ ? `; the highest absolute activity is in ${esc(typeNoun(p.top))} cells (see the definitions below)` : ''}.</p>
      <p>The pathway's enzymes are mentioned in ${paperLink(s.pancreasPapers, s.pancreasPmids, sc.noun)} ${esc(literatureNoun(s.pancreasPapers, sc.noun))}; ${paperLink(s.cellTypePapers, s.cellTypePmids, `also mention ${noun} cells`)} of them also ${literatureVerb(s.cellTypePapers)} ${esc(noun)} cells, ${esc(ratioText(s.cellTypePapers, s.expected))} for enzymes mentioned this often (expected ${sig(s.expected)}).${s.markedGenes?.length ? ` <span id="lit-marked">Without ${s.markedGenes.map(([x]) => `<i>${esc(x)}</i>${literatureMark(x, lit.marks)}`).join(', ')}: ${num(s.pancreasPapersUnmarked)} ${esc(literatureNoun(s.pancreasPapersUnmarked, sc.noun))}.</span>` : ''}</p>` : '<p>No cell type stands out for this pathway.</p>'}
      ${recent ? `<div class="note" style="margin:10px 0 4px">Most recent ${esc(sc.noun)} on this pathway's enzymes</div>${recent}` : ''}</div>`;
  const toolbar = `<div class="lit-toolbar"><div class="segmented" role="group" aria-label="Rows"><button class="${filter === 'genes' ? 'active' : ''}" data-litfilter="genes">With enzyme genes (${num(withGenes.length)})</button><button class="${filter === 'all' ? 'active' : ''}" data-litfilter="all">All steps (${num(rowsAll.length)})</button><button class="${filter === 'hyp' ? 'active' : ''}" data-litfilter="hyp">Candidate hypotheses (${num(nHyp)})</button></div><span class="note">Select a column header to sort; select a step to see its papers and highlight it on the map.</span></div>`;
  const table = `<div class="table-wrap lit-table" data-scroll-id="lit-table"><table class="table"><colgroup><col class="c-rxn"><col class="c-genes"><col class="c-top"><col class="c-num"><col class="c-num"><col class="c-num"><col class="c-num"><col class="c-status"></colgroup><thead><tr>${th('step', 'Reaction step (metabolites)')}${th('genes', 'Enzyme genes')}${th('top', 'Most specific cell type')}${th('pancreas', esc(sc.col), { num: true })}${th('cell', 'Papers that also mention that cell type', { num: true })}${th('ratio', 'Observed ÷ expected', { num: true, title: '(papers that also mention the cell type + 0.5) ÷ (expected + 0.5)' })}${th('curated', 'Curated enzyme papers', { num: true })}${th('status', 'Evidence')}</tr></thead>
    <tbody>${body || `<tr><td colspan="8"><div class="empty">${filter === 'hyp' ? 'No candidate hypotheses on this map.' : 'No reaction steps on this map.'}</div></td></tr>`}</tbody></table></div>`;
  return `${summary}${toolbar}${table}${sel ? stepDetail(sel, lit) : ''}${literatureDefinitions(state.lit.defsOpen)}`;
}
function stepDetail(r, lit) {
  const sc = scopeInfo(), rx = String(r.reactions || '').split(';').filter(Boolean), [st, stLabel] = evidenceStatus(r);
  return `<div class="step-detail" id="step-detail"><div class="step-head"><b>${r.steps.map(x => `${esc(x.a)} – ${esc(x.b)}`).join('; ')}</b><span class="status s-${st}">${esc(stLabel)}</span></div>
    <p class="note">KEGG reactions: ${rx.map(x => `<a href="https://www.kegg.jp/entry/${esc(x)}" target="_blank" rel="noopener">${esc(x)}</a>`).join(', ') || '—'}${r.steps.length > 1 ? ` · drawn as ${r.steps.length} lines on the map` : ''}</p>
    ${r.genes?.length ? `<div class="chips">${r.genes.map(g => `<span class="chip">${esc(g)}</span>`).join('')}</div>${r.genes.filter(g => lit.marks?.[g]).map(g => `<p class="note" data-lit-caution><b>Check this gene name: ${esc(g)}.</b> ${esc(lit.marks[g])}</p>`).join('')}` : '<p class="note">The metabolic model attaches no gene to this step, so no literature is counted.</p>'}
    ${r.top ? `<p class="note">Most specific cell type: <b>${esc(typeLabel(r.top))}</b>${specificity(r) ? `, ${esc(specificity(r))}` : ''}.</p>` : ''}
    ${r.genes?.length ? `<p class="note" id="step-counts">${num(r.pancreas)} ${esc(literatureNoun(r.pancreas, sc.noun))} ${literatureVerb(r.pancreas)} these enzymes${r.top ? `; ${num(r.cell)} also ${literatureVerb(r.cell)} ${esc(typeNoun(r.top))} cells (expected ${sig(r.expected)})` : ''}; ${plural(r.pancreasInclCancer, 'human pancreas paper')} in total; ${plural(r.curated, 'paper')} with curated experimental evidence of the enzymes' activity.</p>` : ''}
    <div class="grid halves">${r.pancreasPmids?.length ? `<div><div class="note" style="margin:8px 0 4px">Most recent ${esc(sc.noun)}</div>${paperList(r.pancreasPmids, lit.titles)}</div>` : ''}${r.cellPmids?.length ? `<div><div class="note" style="margin:8px 0 4px">Most recent of these that also mention ${esc(typeNoun(r.top))} cells</div>${paperList(r.cellPmids, lit.titles)}</div>` : ''}</div>
    ${r.curatedPmids?.length ? `<p class="note">Curated enzyme evidence (UniProtKB/Swiss-Prot): ${r.curatedPmids.map(x => `<a href="https://pubmed.ncbi.nlm.nih.gov/${esc(x)}/" target="_blank" rel="noopener">PMID ${esc(x)}</a>`).join(', ')}</p>` : ''}</div>`;
}
function literatureDefinitions(open) {
  const m = literatureMeta(), sc = scopeInfo();
  const shares = m?.cellTypeShare ? Object.keys(m.cellTypeShare).sort((a, b) => m.cellTypeShare[b] - m.cellTypeShare[a]).map(t => `${typeNoun(t)} ${num(100 * m.cellTypeShare[t], m.cellTypeShare[t] < 0.01 ? 2 : 1)}%`).join(', ') : '';
  return `<details class="lit-defs"${open ? ' open' : ''}><summary>How these numbers are computed</summary><dl>
    <dt>Reaction step</dt><dd>One line on the pathway map between two metabolites. A step can include several KEGG reactions catalyzed by the same enzymes; a step drawn as several lines is listed once. The pathway card above counts the reactions of the metabolic model in this pathway; one line can stand for several reactions and one reaction can be drawn as several lines, so the two numbers differ.</dd>
    <dt>Most specific cell type</dt><dd>Each estimated profile's reaction activities are divided by that profile's mean activity over all reactions, which removes differences in overall activity between profiles. These relative activities are averaged per cell type and compared across cell types as z-scores; the most specific cell type has the highest z-score. The margin is its lead over the second cell type in standard deviations (SD) of the nine cell-type means: at least 1 SD is a clear lead, below 0.25 SD a near tie. It describes a difference between means and is not a statistical test. The pathway's <i>highest activity</i> shown above uses absolute activity instead, so the two can name different cell types.</dd>
    <dt>${esc(sc.col)}</dt><dd>PubMed records indexed with the MeSH term Humans that concern the pancreas${litScope() === 'cancer' ? ` and are indexed under pancreatic neoplasms: PDAC and all other tumors of the pancreas${Number.isFinite(m?.neuroendocrineShare) ? ` (${literaturePct(m.neuroendocrineShare)} of the papers are indexed as neuroendocrine tumors)` : ''}` : litScope() === 'no_cancer' ? ', excluding pancreatic tumors' : ''}, and in which at least one enzyme gene of the step is recognized automatically (PubTator3 gene annotations, in the full text where it is available). Each paper counts once. The paper mentions the enzyme; it does not have to be about it.</dd>
    <dt>Papers that also mention that cell type</dt><dd>The subset that also mentions the most specific cell type in its title, abstract, keywords or index terms. This is a co-mention; the paper does not have to say anything about the enzyme in that cell type. For ductal and acinar cells tumor names do not count: a paper counts for ductal cells when it names ductal or duct cells or epithelium, not when it only names “ductal adenocarcinoma”, and not for acinar cells when it only names “acinar cell carcinoma”.${shares ? ` Share of ${esc(sc.noun)} that mention each cell type: ${esc(shares)}.` : ''}</dd>
    <dt>Expected and observed ÷ expected</dt><dd>Expected = ${esc(sc.noun)} on the enzymes × the share of ${esc(sc.noun)} that mention the cell type. Observed ÷ expected = (papers that also mention the cell type + 0.5) ÷ (expected + 0.5): above 1, the enzymes are mentioned with that cell type more often than an average gene. No uncertainty is given: when the expected count is far below 1, as for most steps and the rarely studied cell types, the ratio stays near 1 and carries little information.</dd>
    <dt>Curated enzyme papers</dt><dd>Papers cited as experimental evidence for the enzyme's catalytic activity in reviewed human UniProtKB/Swiss-Prot entries, matched to the step by EC number.</dd>
    <dt>Evidence</dt><dd>Mentioned with the cell type: at least one paper mentions the enzymes together with the most specific cell type. Mentioned in ${esc(sc.short)}: papers exist, but none also mentions that cell type. Other pancreas papers only: the enzymes are mentioned in human pancreas papers outside this scope. No enzyme gene in the model: the metabolic model attaches no enzyme gene to the step.</dd>
    <dt>Candidate hypothesis</dt><dd>A step is a candidate hypothesis when all of these hold: the predicted activity is specific to one cell type (margin of at least 1 SD); at least one paper with that cell type would be expected; no human pancreas paper mentions the enzymes with that cell type; at least one enzyme gene of the step is among the genes tested on this site and has its highest estimated expression in that cell type; and PubMed has no record that names an enzyme of the step and the cell type together with the pancreas in title or abstract (any species${m?.hypothesisSearchDate ? `, searched ${esc(m.hypothesisSearchDate)}` : ''}).${Number.isFinite(m?.hypotheses) ? ` On all maps ${plural(m.hypotheses, 'map line')} of the ${num(m.hypothesesBaseRule)} that meet the first three conditions pass the last two; the others are not shown as hypotheses.` : ''} Hypotheses are predictions for follow-up, not findings. Because few papers mention the endocrine cell types, the rule can hardly be met for them.</dd>
    <dt>Reading the counts</dt><dd>Paper counts are counts of mentions. They do not show that a reaction is active or that a paper is about the enzyme, and much-studied genes collect more papers.${esc(literatureGuide(m))} A marked gene stays in the counts of its step; the pathway summary also gives the count without the marked genes.</dd>
  </dl>${m ? `<p class="note" style="margin:10px 0 0">Literature index ${esc(m.version || '')}, built ${esc(m.built || '')}: ${num(m.papers)} ${esc(sc.noun)}${m.papersAllPancreas ? ` (of ${num(m.papersAllPancreas)} human pancreas papers)` : ''} that mention at least one of the ${num(m.genes)} enzyme genes.</p>` : ''}</details>`;
}
async function loadLiterature() {
  const holder = $('#literature-body'); if (!holder) return;
  const id = state.pathway || defaultPathway();
  const lit = await getLiterature(id);
  if (state.view !== 'pathways' || (state.pathway || defaultPathway()) !== id || !$('#literature-body')) return;
  const p = state.data.pathways.find(x => x.id === id);
  const defs = $('#literature-body details.lit-defs'); if (defs) state.lit.defsOpen = defs.open;   /* keep the definitions open across re-renders */
  $('#literature-body').innerHTML = lit ? literatureBody(p, lit) : `<div class="empty">${isOverviewMap(id) ? `Literature support is shown for the ${num(metabolicDrawn(state.data))} pathways that have a map; the ${num(state.data.pathways.length - metabolicDrawn(state.data))} KEGG overview maps have none.` : 'Literature support is not available for this pathway.'}</div>`;
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
  return `<div class="table-wrap"><table class="table compact lit-types"><thead><tr><th>Cell type</th><th class="num" title="Pancreatic tumor papers on the gene or gene set that also mention the cell type (a co-mention)">Papers that also mention the cell type</th><th class="num" title="Papers × the share of pancreatic tumor papers that mention the cell type">Expected</th><th class="num" title="(papers + 0.5) ÷ (expected + 0.5)">Observed ÷ expected</th></tr></thead><tbody>${types.map((t, i) => `<tr class="${t === top ? 'selected' : ''}"><td><span class="swatch" style="background:${typeColor(t, i)};margin-right:6px"></span>${esc(typeLabel(t))}</td><td class="num">${num(obs[i])}</td><td class="num">${literatureExpected(exp[i])}</td><td class="num">${ratioCell(enr[i])}</td></tr>`).join('')}</tbody></table></div><p class="note" data-color-key="scale" style="margin:6px 0 0">${scaleLegendEnds('1/8', '8', 'Observed ÷ expected')}</p>`;
}
function litCaution(gene) { const c = state.data.geneLit?.marks?.[gene] || DEMO().litCautions?.[gene]; return c ? `<p class="note" data-lit-caution><b>Check this gene name.</b> ${esc(c)}</p>` : ''; }
const LIT_READING = 'Papers are human pancreatic tumor papers in PubMed (indexed under pancreatic neoplasms: PDAC and all other tumors of the pancreas, including neuroendocrine tumors) in which the gene is recognized automatically (PubTator3). A count by cell type is a co-mention: the paper also mentions the cell type in its title, abstract, keywords or index terms; it does not have to say anything about the gene in that cell type. For ductal and acinar cells tumor names (ductal adenocarcinoma, acinar cell carcinoma) do not count. Expected = the papers on the gene × the share of pancreatic tumor papers that mention the cell type; observed ÷ expected = (papers + 0.5) ÷ (expected + 0.5). The highlighted cell type has the highest ratio among cell types with at least 3 papers. Counts show how much a gene is mentioned in a context, not that it is expressed or active there, and automatic gene recognition makes mistakes.';
const LIT_HOWTO_HTML = '<p class="note lit-howto"><b>How to read this.</b> A ratio above 1 means the gene and the cell type are mentioned in the same papers more often than expected from how often each is mentioned on its own. It measures attention in the literature; it is not evidence that the gene is expressed or active in that cell type, and a marker gene is often mentioned most with a cell type other than its own.</p>';
function geneLiterature(d, gene, { compact = false, id = 'gene-lit' } = {}) {
  if (!d.geneLitUrl && !d.geneLit) return '';
  const head = `<div class="note" style="margin:18px 0 6px"><b style="color:var(--ink-2)">Literature support</b> · human pancreatic tumor papers that mention this gene</div>`;
  const wait = lazyState('geneLit', checkGeneLit);
  if (wait !== null) return `<div id="${id}" class="detail-sub">${head}${wait}</div>`;
  const L = d.geneLit, r = geneLitRecord(L, gene);
  if (!r) return `<div id="${id}" class="detail-sub">${head}<p class="note">No human pancreatic tumor paper is counted for this gene.</p></div>`;
  const ti = r.top ? L.cellTypes.indexOf(r.top) : -1;
  const metrics = `<div class="metrics small"><div class="metric"><small>Pancreatic tumor papers</small><b>${num(r.scope)}</b></div><div class="metric"><small>All human pancreas papers</small><b>${num(r.pancreas)}</b></div><div class="metric"><small>Cell type mentioned with it most</small><b>${r.top ? `${esc(typeLabel(r.top))} <span class="of">× ${sig(r.enr[ti])}</span>` : '—'}</b></div></div>`;
  const recent = r.links?.[0]?.length ? `<div class="note" style="margin:12px 0 4px">Most recent pancreatic tumor papers</div>${paperList(r.links[0], L.titles, compact ? 3 : 5)}` : '';
  const inType = !compact && r.top && r.links?.[1]?.length ? `<div class="note" style="margin:12px 0 4px">Most recent papers that also mention ${esc(typeNoun(r.top))} cells</div>${paperList(r.links[1], L.titles, 5)}` : '';
  return `<div id="${id}" class="detail-sub">${head}${metrics}${litCaution(r.sym)}${compact ? '' : LIT_HOWTO_HTML + litTypeTable(L.cellTypes, r.obs, r.exp, r.enr, r.top)}${recent}${inType}<p class="note">${compact ? 'Counts show how often a gene is mentioned, not that it is expressed or active. The cell type is the one mentioned in the same papers more often than expected (× observed ÷ expected); it is a co-mention and often differs from the cell type that expresses the gene.' : esc(LIT_READING) + esc(literatureGuide(L.meta?.corrections))}${r.sym !== gene ? ` Counted under the current symbol ${esc(r.sym)}.` : ''}</p></div>`;
}
/* Genes studied most in connection with each cell type (Gene expression tab). */
function celltypeLiteratureCard(d) {
  if (!d.celltypeLitUrl && !d.celltypeLit) return '';
  const wait = lazyState('celltypeLit', checkTypeLit);
  const shell = body => `<section class="card section" id="lit-celltypes"><div class="card-head"><div><div class="card-title">Literature support by cell type</div><div class="card-sub">Genes mentioned in the same papers as a cell type more often than expected, among human pancreatic tumor papers</div></div><span class="badge accent">Pancreatic tumors</span></div><div class="card-body">${body}</div></section>`;
  if (wait !== null) return shell(wait);
  const C = d.celltypeLit, types = d.cellTypes.map(t => t.name).filter(t => C.cellTypes[t]);
  const t = types.includes(state.lit.type) ? state.lit.type : types.find(x => (C.cellTypes[x].topGenes || []).length >= 20) || types[0], k = C.cellTypes[t];
  const picker = `<div class="toggle-chips" role="group" aria-label="Cell type for the literature table" id="lit-type">${types.map((x, i) => `<button class="${x === t ? 'active' : ''}" data-littype="${esc(x)}" aria-pressed="${x === t}"><span class="swatch" style="background:${typeColor(x, i)}"></span>${esc(typeLabel(x).replace(' (gamma)', ''))}<small>${num(C.cellTypes[x].scopePapers)}</small></button>`).join('')}</div>`;
  const rows = (k.topGenes || []).map(([g, obs, exp, enr, all, pm]) => { const tt = pm?.length ? C.titles?.[String(pm[0])] : null; return `<tr><td><i>${esc(g)}</i>${(C.marks?.[g] || DEMO().litCautions?.[g]) ? ` <span class="badge warn" title="${esc(C.marks?.[g] || DEMO().litCautions[g])}">check name</span>` : ''}</td><td class="num">${num(obs)}</td><td class="num">${sig(exp)}</td><td class="num">${ratioCell(enr)}</td><td class="num">${num(all)}</td><td>${tt ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(pm[0])}/" target="_blank" rel="noopener">${esc(shorten(tt.t, 90))}</a><small>${esc([tt.j, tt.y].filter(Boolean).join(', '))}</small>` : '<span class="note">—</span>'}</td></tr>`; }).join('');
  return shell(`${picker}${LIT_HOWTO_HTML}<p class="note" style="margin:10px 0">${num(k.scopePapers)} ${literatureNoun(k.scopePapers, 'pancreatic tumor papers')} also ${literatureVerb(k.scopePapers)} ${esc(typeNoun(t))} cells. ${plural(k.topGenes.length, 'gene')} with at least 5 such papers, highest observed ÷ expected first${k.topGenes.length < 50 ? ' (few genes reach 5 papers for this cell type)' : ''}.</p>
    <div class="table-wrap" style="max-height:420px" data-scroll-id="lit-celltypes"><table class="table"><thead><tr><th>Gene</th><th class="num">Papers that also mention ${esc(typeNoun(t))} cells</th><th class="num">Expected</th><th class="num">Observed ÷ expected</th><th class="num">All pancreatic tumor papers</th><th>Most recent paper</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="empty">No gene has 5 papers for this cell type.</td></tr>'}</tbody></table></div>
    ${(k.excluded || []).length ? `<p class="note" id="lit-excluded">Not ranked: ${k.excluded.map(([g]) => `<i>${esc(g)}</i>${literatureMark(g, C.marks)}`).join(', ')}. By their numbers these genes would be in the list, but their papers mostly name a gene family or an ambiguous abbreviation, or name the gene only in the full text.</p>` : ''}
    <p class="note">${esc(LIT_READING)}${esc(literatureGuide(C.meta?.corrections))}${C.meta?.corrections?.contexts ? ` Before this correction the word “ductal” alone counted, which matched ${num(C.meta.corrections.contexts.ductal.beforeScope)} papers, mostly through “ductal adenocarcinoma”; ductal or duct cells or epithelium are named in ${num(C.meta.corrections.contexts.ductal.afterScope)}.` : ''}</p>`);
}
/* Literature on the member genes of a gene set (Cell-type signaling tab). */
function genesetLiteratureCard(d, g, s) {
  if (!s || (!d.genesetLitUrl && !d.genesetLit)) return '';
  const shell = body => `<section class="card section" id="gs-lit"><div class="card-head"><div><div class="card-title">Literature on the member genes: ${esc(s.label)}</div><div class="card-sub">Human pancreatic tumor papers that mention the member genes of this gene set, overall and together with each cell type</div></div><span class="badge accent">Pancreatic tumors</span></div><div class="card-body">${body}</div></section>`;
  const wait = lazyState('genesetLit', checkSetLit);
  if (wait !== null) return shell(wait);
  const L = d.genesetLit, r = L.sets[s.id];
  if (!r) return shell('<p class="note">No literature record for this gene set.</p>');
  const [nLib, nWith, papers, obs, exp, enr, top] = r, types = g.cellTypes;
  let ti = types.indexOf(state.gs.type); if (ti < 0 || !Number.isFinite(s.activity[ti])) ti = Number.isInteger(s.best) && s.best >= 0 ? s.best : 0;
  const t = types[ti], gl = d.geneLit, gg = d.genesetGenes;
  const metrics = `<div class="metrics small"><div class="metric"><small>Member genes with papers</small><b>${num(nWith)} <span class="of">of ${num(nLib)}</span></b></div><div class="metric"><small>Pancreatic tumor papers that mention member genes</small><b>${num(papers)}</b></div><div class="metric"><small>Cell type mentioned with them most</small><b>${top ? `${esc(typeLabel(top))} <span class="of">× ${sig(enr[L.cellTypes.indexOf(top)])}</span>` : '—'}</b></div></div>`;
  const act = Number.isInteger(s.best) && s.best >= 0 ? types[s.best] : null, ag = L.meta?.activityAgreement;
  const agree = top && act ? `<p class="note" id="gs-lit-agree">The activity of this gene set is highest in ${esc(typeNoun(act))} cells; its member genes are mentioned most with ${esc(typeNoun(top))} cells${act === top ? ' (the same cell type)' : ' (a different cell type)'}.${ag ? ` The two name the same cell type for ${num(ag.same)} of ${num(ag.sets)} gene sets: the literature ratio shows which cell types the genes are written about with, not where the gene set is active.` : ''}</p>` : '';
  let genes = '';
  if (gg) {
    const waitG = lazyState('geneLit', checkGeneLit);
    if (waitG !== null) genes = waitG;
    else {
      const li = gl.cellTypes.indexOf(t), items = setGenesInType(gg, s, t);
      const rows = items.map(x => { const q = geneLitRecord(gl, x.name), tt = q?.links?.[0]?.length ? gl.titles?.[String(q.links[0][0])] : null; return `<tr><td><i>${esc(x.name)}</i></td><td class="num">${q ? num(q.scope) : '0'}</td><td class="num">${q ? num(q.obs[li]) : '0'}</td><td class="num">${q ? literatureExpected(q.exp[li]) : '—'}</td><td class="num">${q ? ratioCell(q.enr[li]) : '—'}</td><td>${tt ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(q.links[0][0])}/" target="_blank" rel="noopener">${esc(shorten(tt.t, 80))}</a><small>${esc([tt.j, tt.y].filter(Boolean).join(', '))}</small>` : '<span class="note">—</span>'}</td></tr>`; }).join('');
      genes = `<div class="note" style="margin:0 0 6px">Genes of this set that contribute most to its score in ${esc(typeNoun(t))} cells (the genes of the plot above; choose the cell type there)</div><div class="table-wrap" style="max-height:360px" data-scroll-id="gs-lit-genes"><table class="table compact" id="gs-lit-genes"><thead><tr><th>Gene</th><th class="num">Pancreatic tumor papers</th><th class="num">Papers that also mention ${esc(typeNoun(t))} cells</th><th class="num">Expected</th><th class="num">Observed ÷ expected</th><th>Most recent paper</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="empty">No gene to list for this cell type.</td></tr>'}</tbody></table></div>`;
    }
  }
  return shell(`${metrics}${agree}${LIT_HOWTO_HTML}<div class="grid halves" style="margin-top:14px"><div><div class="note" style="margin:0 0 6px">All member genes together, each paper counted once</div>${litTypeTable(L.cellTypes, obs, exp, enr, top)}</div><div>${genes}</div></div><p class="note">${esc(LIT_READING)}${esc(literatureGuide(L.meta?.corrections))} A gene set is counted on the papers of all its member genes; large sets collect many papers, so compare the ratios, not the counts.</p>`);
}
function geneRows(d) {
  const types = d.cellTypes, info = d.markerInfo || {};
  /* bulk result of every marker gene from the full comparison, not only from the listed table */
  const deOf = g => { const x = lookupDe(d, g); return x ? { log2FCShrunk: x.lfc, padj: x.padj, direction: x.cls === 'sub' ? 'ns' : x.cls, cls: x.cls, raw: x.raw, se: x.se } : null; };
  return Object.keys(d.geneExpression).map(g => {
    const v = d.geneExpression[g], b = argmax(v), others = v.filter((x, i) => i !== b && Number.isFinite(x));
    const mo = others.length ? others.reduce((a, x) => a + x, 0) / others.length : NaN;
    return { gene: g, v, b, top: b >= 0 ? types[b].name : null, max: b >= 0 ? v[b] : null, lead: b >= 0 && Number.isFinite(mo) ? v[b] - mo : null, info: info[g] || null, de: deOf(g) };
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
    ${d.comparison ? colorKey([...gs.map(g => ({ color: groupColor(d, g), label: g })), ...(lines ? [{ color: '#98a2b3', shape: 'line', width: 1.5, label: 'Same patient' }] : []), { color: '#0b1f33', shape: 'line', label: 'Group median' }]) : ''}
    <p class="note" style="margin:4px 0 0">Points: samples${pairs.size ? '; gray lines join the tumor and adjacent sample of one patient' : ''}; black bars: group medians.</p>`;
}
/* How the genes of the marker table, and the marker genes used elsewhere on the site, were chosen. */
function markerMethodNote(d, n) {
  const m = d.origin === 'demo' ? DEMO().markerMethod : null;
  const table = m?.table || `The ${plural(n, 'gene')} in this table are a fixed panel of well-known marker genes taken from the literature; they were not selected from this data. “Known marker of” is the role from the literature; “Highest estimated in” and “Lead over other types” are computed from the estimated profiles, so the two can disagree.`;
  return `<div class="card section" id="marker-method"><div class="card-head"><div><div class="card-title">How the marker genes were chosen</div><div class="card-sub">Where the genes of this table and the marker genes used on other tabs come from</div></div></div>
    <div class="card-body"><p class="note" style="margin-top:0" id="marker-method-table">${esc(table)}</p>${m?.check ? `<p class="note" id="marker-method-check">${esc(m.check)}</p>` : ''}
    ${m?.others?.length ? `<p class="note" style="margin-bottom:4px">Marker genes used elsewhere on this site are chosen by rule from the reference cells, not by hand:</p><ul class="note-list" id="marker-method-others">${m.others.map(x => `<li><b>${esc(x.where)}.</b> ${esc(x.text)}</li>`).join('')}</ul>` : ''}</div></div>`;
}
function viewGenes() {
  const d = state.data, c = d.comparison, rowsAll = geneRows(d), types = d.cellTypes, hasDE = !!c;
  if (d.geneLookupUrl && !d.geneLookup && !d.lazy.geneLookup) ensureLazy('geneLookup', checkLookup);   /* full comparison, cell types and names of every tested gene */
  if (!c && d.comparisonUrl && !String(d.lazy.comparison || '').startsWith('error')) ensureLazy('comparison', checkComparison);
  const intro = `${hasDE ? 'Genes that differ between the two groups of bulk samples, and the' : 'The'} mean estimated expression of pancreatic and PDAC marker genes in each cell type of the estimated single-cell profiles. Select a column header to sort and a gene to see its plots on the right.`;
  const head = pageHead('Gene expression', hasDE ? 'Differential expression and marker genes' : 'Marker genes across cell types', intro,
    `<div class="controls">${hasDE ? `<button class="btn btn-secondary" data-action="exportde">${icon('download')} Differential expression${tissue_exports_count(tissue_exports_part('de'))} (CSV)</button>` : ''}${rowsAll.length ? `<button class="btn btn-secondary" data-action="exportgenes">${icon('download')} Marker genes (CSV)</button>` : ''}</div>`);
  if (!rowsAll.length && !hasDE) return `${head}<div class="card"><div class="empty">This result does not include marker-gene summaries.</div></div>`;
  let deBlock = '';
  if (hasDE) {
    const de = c.de, s = de.summary || {};
    const kpis = [[c.test, de.nTest, 'Samples in the test group'], [c.reference, de.nReference, 'Samples in the reference group'], ['Genes tested', s.n_padj_defined ?? s.n_genes_tested, de.filter ? `of ${num(de.filter.genesInput)} genes in the count table: at least ${num(de.filter.minCount)} counts in at least ${num(de.filter.minSamples)} samples` : `${num(de.genesAfterFilter)} genes passed the expression filter`],
      ['Differentially expressed genes', s.n_sig, `Adjusted p < 0.05: ${num(s.n_sig_up)} higher and ${num(s.n_sig_down)} lower in ${c.test}${Number.isFinite(s.n_display_up) && Number.isFinite(s.n_display_down) ? `; ${num(s.n_display_up + s.n_display_down)} of them by at least 2-fold (${num(s.n_display_up)} higher, ${num(s.n_display_down)} lower)` : ''}`]]
      .map(([k, v, f]) => `<div class="card kpi"><div class="k-label">${esc(k)}</div><div class="k-value">${num(v)}</div><div class="k-foot">${esc(f)}</div></div>`).join('');
    const notices = (c.notices || []).map(n => `<div class="alert warn">${esc(n)}</div>`).join('')
      + (d.origin === 'demo' && DEMO().compareNote ? `<div class="banner" role="note" id="compare-note">${icon('info')}<div>${esc(DEMO().compareNote)}</div></div>` : '');
    deBlock = `${notices}<div class="grid kpis">${kpis}</div>
    <div class="section">${compareMethods(c, ['de'])}</div>
    <h2 class="section-title" id="genes-de">Differential expression: ${esc(lookupVs(c))} (bulk samples)</h2>
    <div class="split" id="de-split"><div class="col-stack">${volcanoCard(c)}${deTableCard(c)}</div><aside class="detail">${deGeneDetail(d, c)}</aside></div>`;
  }
  let markerBlock = '';
  if (rowsAll.length) {
    const cols = { gene: { v: r => r.gene }, known: { v: r => r.info?.marks ? `${r.info.order ?? 99}`.padStart(3, '0') + r.info.marks : null }, top: { v: r => (r.top ? typeLabel(r.top) : null) }, max: { v: r => r.max }, lead: { v: r => r.lead }, fc: { v: r => r.de?.log2FCShrunk ?? null }, padj: { v: r => r.de?.padj ?? null }, dir: { v: r => r.de?.cls ?? null } };
    const defKey = d.markerInfo ? 'known' : 'gene', rows = sortRows('genes', rowsAll, cols, defKey, 1);
    const sel = rowsAll.find(r => r.gene === state.gene) || rows[0]; state.gene = sel.gene;
    const th = (k, l, o = {}) => sortTh('genes', k, l, { defKey, defDir: 1, ...o });
    const body = rows.map(r => `<tr class="clickable${r.gene === sel.gene ? ' selected' : ''}" data-gene="${esc(r.gene)}"><td><button type="button" class="name-link gene" data-gene="${esc(r.gene)}">${esc(r.gene)}</button>${r.info?.name ? `<small>${esc(r.info.name)}</small>` : ''}</td>
      <td>${r.info?.marks ? esc(r.info.marks) : '<span class="note">—</span>'}</td><td>${r.top ? `<span class="swatch" style="background:${typeColor(r.top, r.b)};margin-right:6px"></span>${esc(typeLabel(r.top))}` : '—'}</td>
      <td class="num">${sig(r.max)}</td><td class="num">${sig(r.lead)}</td>${hasDE ? `<td class="num">${r.de ? `<span class="heat" style="${diverge(r.de.log2FCShrunk, 3)}">${sig(lookupNz(r.de.log2FCShrunk))}</span>` : '—'}</td><td class="num">${r.de ? lookupP(r.de.padj) : '—'}</td><td data-de-class="${r.de ? r.de.cls : ''}">${r.de ? esc(lookupClsLabel(c, r.de.cls)) : '—'}</td>` : ''}</tr>`).join('');
    const table = `<section class="card"><div class="card-head"><div><div class="card-title">Marker genes</div><div class="card-sub">${plural(rowsAll.length, 'gene')} · estimated expression in log(1 + counts per 10,000)${hasDE ? `; bulk fold change ${esc(lookupVs(c))} from the comparison above, for every marker gene` : ''}</div></div></div>
      <div class="card-body table-wrap tall" data-scroll-id="genes-table"><table class="table"><thead><tr>${th('gene', 'Gene')}${th('known', 'Known marker of')}${th('top', 'Highest estimated in')}${th('max', 'Highest value', { num: true, title: 'Mean estimated expression in that cell type' })}${th('lead', 'Lead over other types', { num: true, title: 'Highest value minus the mean of the other cell types' })}${hasDE ? `${th('fc', 'Bulk log2 fold change', { num: true, title: `Shrunken log2 fold change, ${lookupVs(c)}` })}${th('padj', 'Adjusted p', { num: true })}${th('dir', 'Bulk comparison', { title: LOOKUP_CLS_HELP })}` : ''}</tr></thead><tbody>${body}</tbody></table></div>${hasDE ? `<div class="card-foot"><span data-color-key="scale">${scaleLegend(3, 'Bulk log2 fold change')}</span><span></span></div>` : ''}</section>`;
    markerBlock = `<h2 class="section-title" id="genes-markers">Marker genes across cell types</h2>
    <div class="split" id="marker-split">${table}<aside class="detail">${geneDetail(d, sel)}</aside></div>
    ${celltypeLiteratureCard(d)}
    <p class="note">Estimated profiles are assigned to the nine cell types of the healthy pancreas reference. Malignant epithelial cells and cancer-associated fibroblasts have no reference type of their own; their expression is attributed mostly to the ductal and stellate types.</p>
    ${markerMethodNote(d, rowsAll.length)}`;
  }
  return `${head}${oodBanner(d)}${deBlock}${markerBlock}`;
}
function geneDetail(d, r) {
  const types = d.cellTypes, vals = r.v.map((v, i) => ({ v, t: types[i] })).filter(x => Number.isFinite(x.v)).sort((a, b) => b.v - a.v);
  const bx = d.bulkExpression, bulk = bx?.values?.[r.gene] ? Object.fromEntries(bx.samples.map((s, i) => [s, bx.values[r.gene][i]])) : null, de = r.de;
  return `<section class="card"><div class="card-head"><div><div class="card-title"><i>${esc(r.gene)}</i></div><div class="card-sub">${esc(r.info?.name || '')}${r.info?.marks ? ` · ${esc(lookupMarks(r.info.marks))}` : ''}</div></div><a class="badge" href="https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(r.gene)}%5Bsym%5D+AND+human%5Borgn%5D" target="_blank" rel="noopener">NCBI Gene</a></div>
    <div class="card-body">${r.info?.note ? `<p class="lead">${esc(r.info.note)}</p>` : ''}
      <div class="note" style="margin:0 0 6px">Estimated expression by cell type, log(1 + counts per 10,000)</div>${lookupTypeBars(vals.map(x => ({ v: x.v, label: x.t.label, color: x.t.color })))}
      ${bulk ? `<div class="note" style="margin:18px 0 4px">Measured bulk expression in each sample, ${esc(bx.unit || 'log2(normalized count + 1)')}</div>${groupStrip(bulk, bx.unitShort || 'log2 normalized count', { width: 330, height: 190 })}` : ''}
      ${de ? `<div class="metrics small" style="margin-top:14px"><div class="metric"><small>Bulk log2 fold change</small><b>${sig(lookupNz(de.log2FCShrunk))}</b></div><div class="metric"><small>Adjusted p</small><b>${lookupP(de.padj)}</b></div><div class="metric" data-de-class="${de.cls}" title="${esc(LOOKUP_CLS_HELP)}"><small>Bulk comparison</small><b>${esc(lookupClsLabel(d.comparison, de.cls))}</b></div></div>${lookupRawNote(de)}` : ''}
      <p class="note">Bulk differences between the groups combine changes in cell-type composition and changes within cells; the estimated cell-type values above are not compared between the groups.</p>
      ${geneLiterature(d, r.gene)}</div></section>`;
}
function exportGenes() {
  const d = state.data, types = d.cellTypes.map(t => t.name), rows = [['gene', 'known_marker_of', 'highest_estimated_in', ...types.map(t => `expression_${csvType(t)}`), 'class', 'log2_fold_change_shrunk', 'padj']];
  for (const r of geneRows(d)) rows.push([r.gene, r.info?.marks || '', csvType(r.top || ''), ...r.v, r.de?.cls && d.comparison ? lookupClsLabel(d.comparison, r.de.cls) : '', r.de?.log2FCShrunk ?? '', r.de?.padj ?? '']);
  download('cellaris-marker-genes.csv', rows.map(x => x.map(csvCell).join(',')).join('\n'));
}

/* ---------- Shared helpers for gene sets and comparisons ---------- */
const GS_ORDER = ['H', 'PROGENY', 'REACTOME', 'WIKIPATHWAYS', 'GOBP'];
const GS_LABEL = { H: 'Hallmark', PROGENY: 'PROGENy', REACTOME: 'Reactome', WIKIPATHWAYS: 'WikiPathways', GOBP: 'GO Biological Process' };
const GS_DB = {
  H: { name: 'MSigDB Hallmark', version: 'MSigDB v2026.2.Hs', what: 'well-defined biological states and processes; each Hallmark set summarizes several overlapping MSigDB sets', cite: 'Liberzon et al., Cell Systems 2015', doi: '10.1016/j.cels.2015.12.004', home: 'https://www.gsea-msigdb.org/gsea/msigdb/human/genesets.jsp?collection=H' },
  PROGENY: { name: 'PROGENy', version: 'model_human_full, up to 500 top-weighted genes per pathway', what: 'signaling pathways, each defined by the genes whose expression responds when the pathway is perturbed (a weighted “footprint”), not by the pathway’s own members', cite: 'Schubert et al., Nature Communications 2018', doi: '10.1038/s41467-017-02391-6', home: 'https://saezlab.github.io/progeny/' },
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
/* Agreement of the cell-type ranking of related gene sets across databases. It was computed in advance on public human islet
   single-cell data and is a property of the gene set, not a result of the analysis or of the bulk comparison on screen. */
const CONSENSUS = { 'consistent across databases': ['Agrees across databases', 'ok'], 'single database': ['Not confirmed', ''], 'one database only': ['One database only', 'muted'], 'not assessable': ['Not assessable', 'muted'] };
const CONSENSUS_BASIS = 'computed in advance on public human islet single-cell data (Segerstolpe et al., Cell Metabolism 2016; Muraro et al., Cell Systems 2016; Lawlor et al., Genome Research 2017), not on this analysis';
const CONSENSUS_HELP = {
  'consistent across databases': `sets from different databases that describe this theme rank the cell types alike after their shared genes are removed; ${CONSENSUS_BASIS}`,
  'single database': `compared with related sets from other databases, which do not rank the cell types alike once shared genes are removed; ${CONSENSUS_BASIS}`,
  'one database only': 'the theme of this set exists in one database only, so there is nothing to compare',
  'not assessable': `the sets of this theme share too many genes to compare databases independently; ${CONSENSUS_BASIS}`,
};
const CONSENSUS_TITLE = 'Cell-type ranking across databases';
const CONSENSUS_NOTE = `Whether gene sets from different databases that describe the same theme rank the cell types alike; ${CONSENSUS_BASIS}`;
const consensusHelp = v => state.data?.genesets?.consensusLevels?.[v] || CONSENSUS_HELP[v] || '';
const consensusBadge = v => CONSENSUS[v] ? `<span class="badge ${CONSENSUS[v][1]}" title="${esc(consensusHelp(v))}">${esc(CONSENSUS[v][0])}</span>` : '<span class="note">—</span>';
/* p values. A stored 0 is a value below the precision of the calculation that produced it (double precision resolves an upper tail
   down to about 1e-16), so it is shown as the bound "< 1e-15", never as a smaller number. Below 0.001: scientific notation with two
   significant figures. Otherwise three decimals, with more decimals when rounding would move the value across 0.05. */
const P_FLOOR = '< 1e-15';
const fmtP = v => { if (!Number.isFinite(v) || v < 0 || v > 1) return '—'; if (v === 0) return P_FLOOR; if (v < 1e-3) return v.toExponential(1); let d = 3; while (d < 6 && (v < 0.05) !== (Number(v.toFixed(d)) < 0.05)) d++; return v.toFixed(d); };
const shorten = (s, n = 46) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
/* numbers are written as numbers; the guard against spreadsheet formulas applies to text cells only */
const csvCell = v => { if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''; let s = String(v ?? ''); if (/^[=+@\t\r-]/.test(s) && !/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
/* CSV headers and cells name the cell types as the site displays them: the reference type "gamma" is PP (gamma) */
const csvType = t => (t === 'gamma' ? 'PP_gamma' : t ?? '');
/* exports that hold part of a table say so in the button label and in the file name */
function tissue_exports_part(kind) {
  const c = state.data?.comparison;
  if (kind === 'de' && c?.de) { const n = c.de.table.length, N = c.de.genesAfterFilter || c.de.summary?.n_genes_tested || n; return { n, N, partial: n < N, unit: 'genes' }; }
  if (kind === 'enrich' && c) { const cols = Object.values(c.pathways?.collections || {}), pr = (c.pathways?.progeny || []).length, n = cols.reduce((a, k) => a + (k.sets || []).length, 0) + pr, N = cols.reduce((a, k) => a + (k.tested || (k.sets || []).length), 0) + pr; return { n, N, partial: n < N, unit: 'gene sets' }; }
  return { n: 0, N: 0, partial: false, unit: '' };
}
const tissue_exports_count = p => (p.partial ? `, ${num(p.n)} of ${num(p.N)} ${p.unit}` : '');
const tissue_exports_file = (stem, p) => `${stem}${p.partial ? `-${p.n}-of-${p.N}` : ''}.csv`;
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
/* Key of the colors of a chart. items: [{color, label, shape: 'line' | 'row', opacity, width}] */
function colorKey(items, { id = '', lead = '' } = {}) {
  const mark = x => (x.shape === 'line' ? `<svg width="18" height="10" aria-hidden="true"><line x1="1" y1="5" x2="17" y2="5" stroke="${x.color}" stroke-width="${x.width || 2}"${x.opacity ? ` stroke-opacity="${x.opacity}"` : ''}/></svg>`
    : x.shape === 'row' ? `<span class="swatch" style="background:${x.color};width:18px;box-shadow:inset 0 0 0 1px #fecdca"></span>`
      : `<span class="swatch" style="background:${x.color}${x.opacity ? `;opacity:${x.opacity}` : ''}"></span>`);
  return `<div class="legend static color-key"${id ? ` id="${id}"` : ''} data-color-key>${lead ? `<span class="key-lead">${esc(lead)}</span>` : ''}${items.map(x => `<span>${mark(x)}${esc(x.label)}</span>`).join('')}</div>`;
}
const TYPE_COLOR_NOTE = '<p class="note" data-color-key="types" style="margin:4px 0 0">Bar colors: cell types, as on the maps.</p>';
/* Key of a cell color scale with free end labels (ratios), and of the light-to-dark scale of the pathway table. */
function scaleLegendEnds(lo, hi, label, cls = '') {
  return `<span class="scale-legend${cls ? ` ${cls}` : ''}" role="img" aria-label="${esc(label)}: color scale from ${esc(lo)} to ${esc(hi)}"><span>${esc(lo)}</span><i></i><span>${esc(hi)}</span><small>${esc(label)}</small></span>`;
}
const RED_BLUE = (up, down) => [{ color: '#b42318', label: up }, { color: '#175cd3', label: down }];
/* Horizontal bars around zero. items: [{name, v, color, faint, mark, note, hi}]; key: entries of the color key shown under the bars */
function divergingBars(items, label, { labelWidth = 150, width = 420, row = 24, key = null } = {}) {
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
  return `<svg class="svgplot" viewBox="0 0 ${L + W + 8} ${T + H + 46}" role="img" aria-label="${esc(label)}"><g font-size="12" fill="#667085">${body}<line x1="${X(0).toFixed(1)}" x2="${X(0).toFixed(1)}" y1="${T}" y2="${T + H}" stroke="#344054"/><line x1="${L}" x2="${L + W}" y1="${T + H}" y2="${T + H}" stroke="#98a2b3"/>${ticks}<text class="axis-title" x="${L + W / 2}" y="${T + H + 38}" text-anchor="middle" fill="#344054">${esc(label)}</text></g></svg>${key ? colorKey(key) : ''}`;
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
    const obj = await r.json();
    /* A block may ship in several files (no file of the site reaches 4 MiB): top-level keys of each part are merged in. */
    for (const part of (Array.isArray(obj?.parts) ? obj.parts : [])) {
      const rp = await fetch(part); if (!rp.ok) throw new Error(`HTTP ${rp.status}`);
      for (const [k, v] of Object.entries(await rp.json())) if (k !== 'meta') obj[k] = v;
    }
    d[key] = check(obj); d.lazy[key] = 'done';
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
  for (const s of rows) { const v = s.activity.filter(Number.isFinite); s.range = v.length > 1 ? Math.max(...v) - Math.min(...v) : null; s.best = argmax(s.activity); s.clear = signalingHighest(g, s).clear; }
  return rows;
}
/* A highest cell type is named only when there is one: score above zero and a lead over the second cell type of at least
   minLead score units and minLeadOfRange of the range across cell types (rule shipped with the data; defaults 0.1 and 10%). */
function signalingHighest(g, s) {
  const r = g.highestRule || {}, minLead = r.minLead ?? 0.1, minShare = r.minLeadOfRange ?? 0.1;
  const v = s.activity.map((x, i) => ({ x, i })).filter(o => Number.isFinite(o.x)).sort((a, b) => b.x - a.x || a.i - b.i);
  if (v.length < 2) return { best: v[0]?.i ?? -1, second: -1, lead: null, clear: false, why: 'fewer than two cell types have a score' };
  const lead = v[0].x - v[1].x, range = v[0].x - v[v.length - 1].x, t = g.cellTypes;
  const why = v[0].x <= 0 ? `no cell type has a score above zero (highest: ${typeNoun(t[v[0].i])} cells, ${sig(v[0].x)})`
    : lead < minLead || lead < minShare * range ? `${typeNoun(t[v[0].i])} cells (${sig(v[0].x)}) lead ${typeNoun(t[v[1].i])} cells (${sig(v[1].x)}) by ${sig(lead)}, less than the margin` : '';
  return { best: v[0].i, second: v[1].i, lead, range, clear: !why, why };
}
const SIGNALING_NO_HIGHEST = 'No clear highest cell type';
const signalingRuleText = g => g.highestRule?.text || 'A highest cell type is named when its score is above zero and exceeds the second cell type by at least 0.1 score units and by at least 10% of the range between the highest and lowest cell type.';
/* Flags shipped with the data: one member gene, or the ribosomal protein genes, carry at least half of the score in the highest cell type. */
function signalingFlags(g, s, { long = false } = {}) {
  const out = [];
  if (s.ribosomal) out.push([`carried by ribosomal protein genes (${pct(s.ribosomal, 0)} of the score)`, `Ribosomal protein genes carry ${pct(s.ribosomal, 0)} of this score. They are highly expressed in every cell type, so the set scores high everywhere whatever its name says. ${g.ribosomalRule?.text || ''}`]);
  else if (Array.isArray(s.driver)) out.push([`driven by ${s.driver[0]} (${pct(s.driver[1], 0)} of the score)`, `One gene, ${s.driver[0]}, carries ${pct(s.driver[1], 0)} of this score in the cell type with the highest score; the set name says more than this result supports. ${g.driverRule?.text || ''}`]);
  return out.map(([t, tip]) => (long ? `<p class="note gs-flag">${esc(tip)}</p>` : `<small class="gs-flag" title="${esc(tip)}">${esc(t)}</small>`)).join('');
}
function signalingReferenceNote(g) {
  const rc = g.referenceCells; if (!rc) return '';
  const im = g.immuneReference, n = k => num(im?.[k]?.cells);
  const list = g.cellTypes.map(t => `${typeLabel(t).replace(' (gamma)', '')} ${num(rc[t])}${g.profiles ? ` (${num(g.profiles[t])})` : ''}`).join(', ');
  return `<p class="note" id="gs-reference-note"><b>Reference cells behind each cell type</b> (distinct healthy reference cells from which the estimated profiles are generated${g.profiles ? '; in brackets the number of estimated profiles' : ''}): ${esc(list)}.${im ? ` The immune type pools ${num(rc.immune)} reference cells: ${n('macrophage')} macrophages, ${n('mast')} mast cells and ${n('t_cell')} T cells (${num(g.profiles?.immune)} estimated profiles, ${num(im.macrophage?.profiles)} of them from macrophages). It contains no B cells and no neutrophils, so gene sets named for T cells, B cells or neutrophils are scored on this pool and mostly reflect macrophage and antigen-presentation genes.` : ''}</p>`;
}
function sourceMethodCard(g) {
  const d = state.data, cols = GS_ORDER.filter(c => g.collections[c]), m = g.method || {};
  const dbRows = cols.map(c => { const k = g.collections[c], db = GS_DB[c]; return `<tr><td><b style="font-weight:600">${esc(db.name)}</b><small>${esc(db.what)}</small></td><td>${esc(db.version)}${c === 'PROGENY' && k.libraryGenesRange ? ` (${num(k.libraryGenesRange[0])} to ${num(k.libraryGenesRange[1])} of them are in the gene-set library)` : ''}<small>${esc(k.release && !db.version.includes(String(k.release).replace(/^MSigDB /, '')) ? k.release : '')}</small></td><td class="num">${num(k.scorableSets)}${k.groupedByTheme ? `<small>${num(k.shownSets)} themes listed</small>` : ''}</td><td><a href="${esc(db.home)}" target="_blank" rel="noopener">${esc(db.home.replace(/^https:\/\//, '').replace(/\/.*$/, ''))}</a><small>${esc(db.cite)}</small></td></tr>`; }).join('');
  return `<section class="card source-card"><div class="card-head"><div><div class="card-title">Where these pathways come from</div><div class="card-sub">Curated gene-set databases scored on the estimated single-cell profiles. Unlike the metabolic pathways, no metabolic model is involved.</div></div><span class="badge accent">${icon('database')} ${num(cols.length)} databases</span></div>
    <div class="card-body"><div class="grid halves">
      <div class="table-wrap"><table class="table compact"><thead><tr><th>Database</th><th>Version</th><th class="num">Sets scored</th><th>Source</th></tr></thead><tbody>${dbRows}</tbody></table></div>
      <div class="prose method-steps"><ol>
        <li><b>Expression.</b> ${esc(m.expression ? m.expression.charAt(0).toUpperCase() + m.expression.slice(1) : 'log(1 + counts per 10,000) of each estimated single-cell profile')}, over the ${num(g.scoringGenes)} genes of the pancreas reference.</li>
        <li><b>Score.</b> For each profile and gene set, a univariate linear model regresses the profile's expression on set membership (PROGENy: on the footprint weights); the score is the model's t-value (method of decoupler; Badia-i-Mompel et al., Bioinformatics Advances 2022). Positive: the set's genes are expressed above the profile's average gene. The score measures expression of the member genes, not signaling itself, and as a t-value it grows with the number of genes in a set: compare cell types within a set, not one set with another. PROGENy is scored here with one model per pathway and in <a href="#compare" data-view="compare">Bulk signaling</a> with all 14 pathways in one model, so its values on the two tabs are not on the same scale.</li>
        <li><b>Summarize.</b> Mean per sample and cell type; the cell-type value is the mean over samples with at least 3 profiles of that type${g.perSampleAvailable ? '. Per-sample values are shown when a sample has at least 20 profiles of the cell type (10–19: low confidence)' : ''}.</li>
        <li><b>Top genes.</b> ${esc((g.topGenesDefinition || 'Not available for this result.').replace(/^Top genes:\s*/, '').replace(/^./, x => x.toUpperCase()))}</li>
        <li><b>Highest cell type.</b> ${esc(signalingRuleText(g))}${g.highestRule ? ` ${num(g.highestRule.nClear)} of the ${num(g.highestRule.nSets)} listed sets have a clear highest cell type; in ${num(g.highestRule.nAllNegative)} no cell type is above zero.` : ''}</li>
        ${g.driverRule ? `<li><b>Flags.</b> "Driven by one gene" (${num(g.driverRule.nSets)} sets): one member gene carries at least half of the positive contributions to the score in the cell type with the highest score, so the set name says more than the result supports. "Carried by ribosomal protein genes" (${num(g.ribosomalRule?.nSets)} sets): the same for the ${num(g.ribosomalRule?.nGenes)} ribosomal protein genes together.</li>` : ''}
      </ol>${g.scoredSets ? `<p class="note" id="gs-set-counts" style="margin:6px 0 0">${num(g.scoredSets)} gene sets are scored and ${num(cols.reduce((a, c) => a + (g.collections[c].shownSets || 0), 0))} are listed: all sets of Hallmark, PROGENy, Reactome and WikiPathways, and one representative term for each of the ${num(g.collections.GOBP?.shownSets)} themes of overlapping GO Biological Process terms.</p>` : ''}
      <p class="note" id="gs-db-note" style="margin:6px 0 0">Hallmark and PROGENy can name different cell types for a pathway of the same name: a Hallmark set lists genes that belong to a process, PROGENy weights the genes that respond when the pathway is perturbed (negative weights for genes that go down).${g.sameName ? ` Across all five databases ${num(g.sameName.names)} set names occur in more than one database with different member genes; for ${num(g.sameName.differentHighest)} of them the cell type with the highest score differs.` : ''}</p><p class="note" style="margin:6px 0 0">Gene sets with fewer than ${num(g.minGenesPerSet || 5)} genes among the scoring genes are not scored. "Genes used" counts member genes among the scoring genes, out of the genes of the set in the gene-set library (genes named in the pancreas reference), which can be fewer than the source database lists. Scores are relative units: compare them between cell types and samples of this analysis, not with other analyses. Tumor-versus-adjacent differences are tested on the bulk data in <a href="#compare" data-view="compare">Bulk signaling</a> (fgsea and decoupler on DESeq2 statistics).</p></div>
    </div></div></section>`;
}
function viewSignaling() {
  const d = state.data, g = d.genesets;
  const intro = 'Expression scores of curated gene sets (signaling pathways and other functional sets) in each cell type of the estimated single-cell profiles. A score measures how strongly the member genes of a set are expressed; it is not a direct measurement of signaling. Select a column header to sort and a gene set to see its plots on the right.';
  const head = pageHead('Cell-type signaling', 'Signaling and functional pathways by cell type', intro, g ? `<div class="controls"><button class="btn btn-secondary" data-action="exportgenesets">${icon('download')} CSV, all ${num(Object.values(g.collections).reduce((a, k) => a + k.sets.length, 0))} gene sets</button></div>` : '');
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
  const sc = { label: { v: s => s.label }, db: { v: s => GS_LABEL[s.collection] }, cons: { v: s => CONSENSUS[s.consensus]?.[0] || null }, range: { v: s => s.range }, top: { v: s => (s.best >= 0 && s.clear ? typeLabel(types[s.best]) : null) }, genes: { v: s => s.genesUsed } };
  types.forEach((t, i) => { sc[`t${i}`] = { v: s => s.activity[i] }; });
  /* default order (no column chosen): sets carried by ribosomal protein genes go to the end; they are flagged, not hidden */
  const sorted = sortRows('gs', all, sc, 'range', -1), nRibo = all.filter(s => s.ribosomal).length, riboLast = !state.sort.gs && nRibo > 0;
  const rows = riboLast ? [...sorted.filter(s => !s.ribosomal), ...sorted.filter(s => s.ribosomal)] : sorted, shown = rows.slice(0, state.gs.limit);
  const off = cols.filter(c => !state.gs.on.has(c)), offHits = state.gs.search ? off.map(c => [c, genesetRows(g, [c]).length]).filter(x => x[1]) : [];
  const offText = offHits.map(([c, k]) => `${GS_LABEL[c]} (${num(k)})`).join(', '), nUnclear = all.filter(s => !s.clear).length;
  const searchNote = state.gs.search && off.length ? `The search covers only the databases that are switched on (${on.map(c => GS_LABEL[c]).join(', ')}). ${offHits.length ? `Matches in databases that are switched off: ${offText}; switch them on above to see them.` : `No match in the databases that are switched off (${off.map(c => GS_LABEL[c]).join(', ')}).`}` : '';
  const sel = all.find(s => s.id === state.gs.set) || rows[0]; if (sel) state.gs.set = sel.id;
  const th = (k, l, o = {}) => sortTh('gs', k, l, { defKey: 'range', defDir: -1, ...o });
  const toggles = cols.map(c => { const k = g.collections[c], a = state.gs.on.has(c); return `<button class="${a ? 'active' : ''}" data-gscol="${c}" aria-pressed="${a}">${esc(k.label || GS_LABEL[c])}<small>${num(k.shownSets)}</small></button>`; }).join('');
  const topCell = s => { const tg = s.best >= 0 ? s.topGenes?.[s.best] : null; return tg?.length ? `<span class="genes">${esc(tg.slice(0, 3).join(', '))}</span><small${s.clear ? '' : ` class="gs-unclear" title="${esc(signalingRuleText(g))}"`}>${s.clear ? `in ${esc(typeNoun(types[s.best]))}` : `${esc(SIGNALING_NO_HIGHEST.toLowerCase())}; genes shown for ${esc(typeNoun(types[s.best]))}`}</small>` : '<span class="note">—</span>'; };
  const heatCell = (s, v, i) => `<td class="num"><span class="heat" style="${diverge(v, m)}" title="${esc(s.label)} · ${esc(typeLabel(types[i]))}: ${sig(v)}${s.topGenes?.[i]?.length ? ` · top genes: ${esc(s.topGenes[i].join(', '))}` : ''}">${sig(v)}</span></td>`;
  const table = `<table class="table gs-table"><thead><tr>${th('label', 'Gene set')}${th('db', 'Database')}${types.map((t, i) => th(`t${i}`, `<span class="swatch" style="background:${typeColor(t, i)};margin-right:4px"></span>${esc(typeLabel(t).replace(' (gamma)', ''))}`, { num: true, title: `Mean activity in ${typeNoun(t)} cells` })).join('')}${th('range', 'Range', { num: true, title: 'Highest minus lowest cell type' })}${th('top', 'Top genes (highest cell type)', { title: signalingRuleText(g) })}${th('cons', 'Ranking across databases', { title: CONSENSUS_NOTE })}${th('genes', 'Genes used', { num: true, title: 'Member genes among the scoring genes, of the genes of the set in the gene-set library (genes named in the pancreas reference; the source database can list more)' })}</tr></thead>
    <tbody>${shown.map(s => `<tr class="clickable${s.id === sel?.id ? ' selected' : ''}" data-gs="${esc(s.id)}" tabindex="0"><td><button type="button" class="name-link" data-gs="${esc(s.id)}">${esc(s.label)}</button><small>${esc(s.id)}${s.collection === 'GOBP' && s.theme ? ` · theme: ${esc(s.theme)}` : ''}</small>${signalingFlags(g, s)}</td><td><span class="badge db-${s.collection.toLowerCase()}">${esc(GS_LABEL[s.collection])}</span></td>${s.activity.map((v, i) => heatCell(s, v, i)).join('')}<td class="num">${sig(s.range)}</td><td>${topCell(s)}</td><td>${consensusBadge(s.consensus)}</td><td class="num">${num(s.genesUsed)} / ${num(s.libraryGenes)}</td></tr>`).join('') || `<tr><td colspan="${6 + types.length}" class="empty" id="gs-empty">No gene sets match${state.gs.search ? ` in the databases that are switched on (${esc(on.map(c => GS_LABEL[c]).join(', '))})` : ' the filter'}.${offHits.length ? ` ${esc(offText)} match in databases that are switched off; switch them on above.` : ''}</td></tr>`}</tbody></table>`;
  return `${head}${oodBanner(d)}
  <div class="split wide-left section"><section class="card"><div class="card-body" style="padding-bottom:6px"><div class="controls">
    <div class="toggle-chips" role="group" aria-label="Gene-set databases">${toggles}</div>
    <label class="search">${icon('search')}<input class="input" id="gs-search" type="search" placeholder="Search gene sets, themes or genes" value="${esc(state.gs.search)}" aria-label="Search gene sets"></label></div>
    <p class="note" style="margin:8px 0 0" id="gs-count">${plural(all.length, 'gene set')} · mean score per cell type (relative units)${on.includes('GOBP') ? ' · GO Biological Process: one representative term per theme of overlapping terms' : ''}. Hover a value for the top genes in that cell type.${searchNote ? ` <span id="gs-search-note">${esc(searchNote)}</span>` : ''}</p>
    <p class="note" style="margin:6px 0 0" id="gs-highest-rule">${esc(signalingRuleText(g))} ${num(nUnclear)} of the ${plural(all.length, 'listed set')} have no clear highest cell type.${nRibo ? ` <span id="gs-ribo-note">${plural(nRibo, 'listed set')} ${nRibo === 1 ? 'is' : 'are'} carried by ribosomal protein genes: these genes are highly expressed in every cell type, so such sets score high everywhere under names (influenza infection, selenoamino acid metabolism, SLIT and ROBO expression) that say nothing about the cells. They are flagged and ${riboLast ? 'listed at the end of the default order; sorting by a column places them by value' : 'placed by value in the chosen order'}.</span>` : ''}</p>${signalingReferenceNote(g)}</div>
    <div class="card-body table-wrap tall" style="padding-top:0" data-scroll-id="gs-table">${table}</div>
    <div class="card-foot">${scaleLegend(m, 'Activity score (relative units)')}<span><span class="note" id="gs-shown" style="margin:0 10px 0 0">${num(shown.length)} of ${plural(rows.length, 'gene set')} shown</span>${rows.length > shown.length ? `<button class="link-btn" data-action="gsmore">Show ${num(Math.min(60, rows.length - shown.length))} more</button>` : ''}</span></div></section>
  <aside class="detail">${sel ? genesetDetail(g, sel, m) : ''}</aside></div>
  ${genesetLiteratureCard(d, g, sel)}
  <div class="section">${sourceMethodCard(g)}</div>`;
}
function genesetDetail(g, s, m) {
  const types = g.cellTypes, vals = s.activity.map((v, i) => ({ v, i })).filter(x => Number.isFinite(x.v));
  const hi = vals.length ? vals.reduce((a, b) => (b.v > a.v ? b : a)) : null, lo = vals.length ? vals.reduce((a, b) => (b.v < a.v ? b : a)) : null, db = GS_DB[s.collection], top = signalingHighest(g, s);
  const bars = divergingBars(types.map((t, i) => ({ name: typeLabel(t), v: s.activity[i], color: typeColor(t, i), note: Number.isFinite(s.activity[i]) ? '' : 'too few profiles' })), 'Activity score (relative units)', { labelWidth: 100, width: 300 });
  const tg = s.topGenes ? types.map((t, i) => ({ t, i, genes: s.topGenes[i] || [] })).filter(x => Number.isFinite(s.activity[x.i])).sort((a, b) => s.activity[b.i] - s.activity[a.i]) : null;
  return `<section class="card"><div class="card-head"><div><div class="card-title">${esc(s.label)}</div><div class="card-sub">${esc(s.id)}${s.theme && s.theme !== s.label ? ` · theme: ${esc(s.theme)}` : ''}</div></div>${consensusBadge(s.consensus)}</div>
    <div class="card-body"><div class="source-line">${icon('database')}<div><b>${esc(db.name)}</b> · ${esc(db.version)}<br>${setLinks(s).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">View in ${esc(n)}</a>`).join(' · ')}</div></div>
      <div class="metrics small"><div class="metric" title="Member genes among the scoring genes, of the genes of the set in the gene-set library (genes named in the pancreas reference; the source database can list more)"><small>Genes used</small><b>${num(s.genesUsed)} <span class="of">of ${num(s.libraryGenes)} in the library</span></b></div><div class="metric" id="gs-highest"><small>Highest in</small><b>${esc(!hi ? '—' : top.clear ? typeLabel(types[hi.i]) : SIGNALING_NO_HIGHEST)}</b></div><div class="metric"><small>Lowest in</small><b>${esc(lo ? typeLabel(types[lo.i]) : '—')}</b></div></div>
      ${hi && !top.clear ? `<p class="note" id="gs-highest-note">${esc(SIGNALING_NO_HIGHEST)}: ${esc(top.why)}. ${esc(signalingRuleText(g))}</p>` : ''}${signalingFlags(g, s, { long: true })}
      <div class="note" style="margin:14px 0 4px">Mean score by cell type</div>${bars}${TYPE_COLOR_NOTE}
      ${genesetTypePlots(g, s)}
      ${spatialPanel(state.data, 'set', s.id, s.label)}
      ${tg ? `<div class="note" style="margin:6px 0 4px">Top genes in each cell type (highest activity first)</div><div class="table-wrap"><table class="table compact topgenes"><tbody>${tg.map(x => `<tr><td><span class="swatch" style="background:${typeColor(x.t, x.i)};margin-right:6px"></span>${esc(typeLabel(x.t))}</td><td><span class="genes">${esc(x.genes.join(', ') || '—')}</span></td></tr>`).join('')}</tbody></table></div><p class="note">${esc(g.topGenesDefinition || '')}</p><p class="note" id="gs-carryover">Hormone and digestive-enzyme genes (INS, GCG, SST, PPY, PRSS1) can rank among the top genes of cell types that do not make them: the reference cells of those types contain these very abundant transcripts, most likely carried over from neighboring cells when the single cells were prepared. Read them as a property of the reference data, not as expression by that cell type.</p>` : '<p class="note">Top genes are not available for this result.</p>'}
      ${CONSENSUS[s.consensus] ? `<p class="note" id="gs-ranking-note">${esc(CONSENSUS_TITLE)}: ${esc(CONSENSUS[s.consensus][0].toLowerCase())}. ${esc(consensusHelp(s.consensus).replace(/^./, x => x.toUpperCase()))}.</p>` : ''}
      <div class="detail-sub"><div class="note" style="margin:10px 0 4px;display:flex;justify-content:space-between;align-items:center"><span>Score in each sample and cell type</span>${s.perSample ? `<button class="link-btn" data-action="exportgssamples">${icon('download')} CSV</button>` : ''}</div>${perSamplePlot(g, s)}</div></div></section>`;
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
    genes = items.length ? divergingBars(items, `Expression in ${noun} cells relative to the other cell types (log2)`, { labelWidth: 90, width: 300, row: 21, key: RED_BLUE(`Higher in ${noun} cells than in the other cell types`, 'Lower') })
      : '<p class="note">No member gene of this set contributes positively to the score in this cell type.</p>';
  } else if (d.genesetGenesUrl && !String(st || '').startsWith('error')) { ensureLazy('genesetGenes', checkGenesetGenes); genes = '<p class="note">Loading the genes…</p>'; }
  else genes = `<p class="note">${st ? `The genes could not be loaded (${esc(String(st).replace(/^error: /, ''))}).` : 'Gene-level values are not available for this result.'}</p>`;
  const prog = (g.collections.PROGENY?.sets || []).filter(x => Number.isFinite(x.activity[ti])).map(x => ({ name: x.label, v: x.activity[ti], hi: x.id === s.id })).sort((a, b) => b.v - a.v);
  return `<div class="detail-sub" id="gs-type-plots"><div class="note" style="margin:10px 0 6px">Genes and signaling in one cell type. Choose the cell type:</div>${picker}
    <div class="note" style="margin:12px 0 4px" id="gs-genes-title">Genes of this set in ${esc(noun)} cells: the member genes that contribute most to the score there (the first five are the top genes listed below). They are ranked by their contribution to the score (expression above the average gene of the cell type, times the set weight); the bars show a different quantity, expression relative to the other cell types, so a top gene can have a bar that points left.</div><div id="gs-genes">${genes}</div>
    ${prog.length ? `<div class="note" style="margin:12px 0 4px" id="gs-progeny-title">Signaling pathway activity in ${esc(noun)} cells (PROGENy, ${num(prog.length)} pathways${prog.some(x => x.hi) ? '; the selected pathway is highlighted' : ''})</div><div id="gs-progeny">${divergingBars(prog, 'Activity score (relative units)', { labelWidth: 100, width: 300, row: 21, key: [...RED_BLUE('Activity above zero', 'Activity below zero'), ...(prog.some(x => x.hi) ? [{ color: '#fef3f2', shape: 'row', label: 'Selected pathway' }] : [])] })}</div>` : ''}</div>`;
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
    <div class="legend static"><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#667085"/></svg>20 or more profiles</span><span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#fff" stroke="#667085" stroke-width="1.2"/></svg>10–19 profiles (low confidence)</span><span>Fewer than 10: not shown</span></div><p class="note" id="gs-persample-note">Each point is the mean over the estimated profiles of one cell type in one sample.${g.referenceCells ? ` In every sample these profiles are generated from the same pool of healthy reference cells (for example ${num(g.referenceCells.immune)} for the immune type and ${num(g.referenceCells.stellate)} for stellate cells), so the points are not independent measurements and their spread understates the variation between patients.` : ''}</p>${state.data.comparison ? '<p class="note">Points are not grouped by comparison group: differences between the groups within a cell type were not validated for this dataset and are not tested.</p>' : ''}`;
}
async function exportGenesets() {
  const d = state.data; if (!d.genesets && d.genesetsUrl) await ensureLazy('genesets', checkGenesets);
  const g = d.genesets; if (!g) return toast('This result has no gene-set activity.');
  const on = GS_ORDER.filter(c => g.collections[c]);   /* all databases, not only those switched on in the table */
  const rows = [['database', 'database_version', 'gene_set', 'source_id', 'label', 'theme', 'celltype_ranking_across_databases_islet_data', 'genes_used', 'library_genes', ...g.cellTypes.map(t => `activity_${csvType(t)}`), ...(g.topGenesDefinition ? g.cellTypes.map(t => `top_genes_${csvType(t)}`) : [])]];
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
    de: `<li><b>Differential expression</b>: ${esc(m.de || 'DESeq2 negative binomial model (PyDESeq2), Wald test')}; model ${esc(de.design === 'covariate + group' ? 'patient + group, so each tumor is compared with adjacent pancreas from the same patient' : 'group')}; ${esc(de.sizeFactors?.chosen === 'positive counts' ? 'size factors from positive counts' : 'median-of-ratios size factors')}; ${esc(m.shrinkage || 'fold changes shrunken toward zero where the estimate is uncertain (large standard error)')}; adjusted p: Benjamini–Hochberg false discovery rate. A gene is called higher or lower at adjusted p < 0.05 and at least a 2-fold shrunken change; genes with adjusted p < 0.05 and a smaller change are listed as “Significant, below 2-fold”.</li>`,
    enrichment: `<li><b>Pathway enrichment</b>: ${esc(m.enrichment || 'fgsea (multilevel) on the DESeq2 Wald statistics of all tested genes')}; gene sets with 15–500 genes from MSigDB Hallmark, Reactome, WikiPathways and GO Biological Process. Adjusted p: Benjamini–Hochberg within each database, not across all tested sets. The test permutes genes: it shows that the genes of a set rank unusually high or low among all genes, and it does not measure variation between patients.</li>`,
    progeny: `<li><b>Signaling activity (PROGENy)</b>: ${esc(m.progeny || 'multivariate linear model (decoupler) of the Wald statistics on the PROGENy footprint weights, up to 500 genes per pathway')}.${c.pathways?.progenyTest ? ` p values: ${esc(c.pathways.progenyTest.formula)}.` : ''} The model treats the tested genes as independent observations, so, like the enrichment p values, these do not measure variation between patients. A p value shown as ${esc(P_FLOOR)} was stored as 0: it is below the precision of the calculation.</li>`,
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
  const nSig = cols.reduce((a, k) => a + (k.significant || 0), 0), nTested = cols.reduce((a, k) => a + (k.tested || 0), 0), nThemes = (P.themes || []).length, nUp = cols.reduce((a, k) => a + (k.significantUp || 0), 0), nDown = cols.reduce((a, k) => a + (k.significantDown || 0), 0);
  const kpis = [[c.test, de.nTest, 'Samples in the test group'], [c.reference, de.nReference, 'Samples in the reference group'],
    ['Enriched gene sets', nSig, `Adjusted p < 0.05${nUp + nDown === nSig && nSig ? `: ${num(nUp)} higher and ${num(nDown)} lower in ${c.test}` : ''}; of ${num(nTested)} tested in ${plural(cols.length, 'database')}`],
    ['Themes consistent across databases', nThemes, `Related gene sets that change the same way in more than one database${P.themeSignals?.n ? `; ${plural(P.themeSignals.n, 'distinct signal')} (themes sharing their leading genes are cross-referenced)` : ''}`]]
    .map(([k, v, f]) => `<div class="card kpi"><div class="k-label">${esc(k)}</div><div class="k-value">${num(v)}</div><div class="k-foot">${esc(f)}</div></div>`).join('');
  const notices = (c.notices || []).map(n => `<div class="alert warn">${esc(n)}</div>`).join('')
    + (d.origin === 'demo' && DEMO().compareNote ? `<div class="banner" role="note" id="compare-note">${icon('info')}<div>${esc(DEMO().compareNote)}</div></div>` : '');
  return `${pageHead('Bulk signaling', `${generalVs(c)}`, intro, `<div class="controls"><button class="btn btn-secondary" data-action="exportenrich">${icon('download')} Pathways${tissue_exports_count(tissue_exports_part('enrich'))} (CSV)</button></div>`)}
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
  const q = state.cmp.geneSearch.trim(); let rows = c.de.table;
  if (q) rows = rows.filter(r => r.gene.toLowerCase().includes(q));
  const cols = { gene: { v: r => r.gene }, base: { v: r => r.baseMean }, fc: { v: r => r.log2FC }, fcs: { v: r => r.log2FCShrunk }, se: { v: r => r.lfcSE }, p: { v: r => r.pvalue }, padj: { v: r => r.padj }, dir: { v: r => lookupCls(r.direction, r.padj) } };
  return sortRows('de', rows, cols, 'padj', 1);
}
/* Tested genes outside the listed table whose symbol starts with the search text: any tested gene (KRAS) can be opened from this tab. */
function deOtherGenes(c) {
  const raw = state.cmp.geneSearch.trim(), q = raw.toLowerCase(); if (q.length < 2) return '';
  const listed = new Set(c.de.table.map(r => r.gene)), hit = [];
  for (const p of c.de.volcano?.points || []) { const g = String(p[0]); if (!listed.has(g) && g.toLowerCase().startsWith(q)) hit.push(g); }
  if (!hit.length) return '';
  hit.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return `<div id="cmp-gene-other"><span>${plural(hit.length, 'tested gene')} outside this list ${hit.length === 1 ? 'has' : 'have'} a symbol that starts with “${esc(raw)}”${hit.length > 8 ? '; the first 8 are shown' : ''}. Select one to see its result on the right:</span><div class="toggle-chips" role="group" aria-label="Tested genes outside the listed table">${hit.slice(0, 8).map(g => `<button type="button" data-cmpgene="${esc(g)}"${g === state.cmp.gene ? ' class="active" aria-pressed="true"' : ''}>${esc(g)}</button>`).join('')}</div></div>`;
}
function volcanoCard(c) {
  const n = c.de.nSignDiscordant || 0, k = lookupClsCounts(c);
  return `<section class="card"><div class="card-head"><div><div class="card-title">Volcano plot</div><div class="card-sub">Each point is one gene: shrunken log2 fold change (${esc(lookupVs(c))}) against −log10 adjusted p-value. Select a point or a table row to show the gene on the right; the selected gene is circled.</div></div></div>
    <div class="card-body"><div id="volcano" class="plot-frame"><div class="empty">Loading the plot…</div></div></div>
    <div class="card-foot"><span id="volcano-foot">Red: higher in ${esc(c.test)} (${num(k.up)} genes); blue: lower in ${esc(c.test)} (${num(k.down)}); both need adjusted p < 0.05 and at least a 2-fold shrunken change. Dark gray: significant, below 2-fold (${num(k.sub)}). Light gray: not significant, adjusted p ≥ 0.05 (${num(k.ns)}). Dotted lines: adjusted p = 0.05 and a 2-fold change.${n ? ` Open circles: ${num(n)} genes whose fold change changes sign under shrinkage; all lie at zero and are not significant.` : ''}</span></div></section>`;
}
function deTableCard(c) {
  const rows = deRows(c), shown = rows.slice(0, state.cmp.geneLimit), sel = state.cmp.gene || rows[0]?.gene;
  const th = (k, l, o = {}) => sortTh('de', k, l, { defKey: 'padj', defDir: 1, ...o });
  return `<section class="card"><div class="card-head"><div><div class="card-title">Differentially expressed genes</div><div class="card-sub">The ${num(c.de.table.length)} genes with the smallest adjusted p; the full table is in the results download${state.data.geneLookupUrl ? ', and any tested gene can be looked up on the Overview' : ''}</div></div>
    <label class="search">${icon('search')}<input class="input" id="cmp-gene-search" type="search" placeholder="Search the ${num(c.de.table.length)} listed genes" value="${esc(state.cmp.geneSearch)}" aria-label="Search the ${num(c.de.table.length)} listed genes" title="Filters the ${num(c.de.table.length)} listed genes; other tested genes whose symbol starts with the text are offered under the table"></label></div>
    <div class="card-body table-wrap" style="max-height:520px" data-scroll-id="de-table"><table class="table"><thead><tr>${th('gene', 'Gene')}${th('base', 'Mean normalized count', { num: true })}${th('fc', 'log2 fold change', { num: true })}${th('fcs', 'Shrunken log2 fold change', { num: true })}${th('se', 'Standard error', { num: true })}${th('p', 'p', { num: true })}${th('padj', 'Adjusted p', { num: true })}${th('dir', 'Result', { title: LOOKUP_CLS_HELP })}</tr></thead>
    <tbody>${shown.map(r => `<tr class="clickable${r.gene === sel ? ' selected' : ''}" data-cmpgene="${esc(r.gene)}"><td><button type="button" class="name-link gene" data-cmpgene="${esc(r.gene)}">${esc(r.gene)}</button>${lookupGeneSmall(state.data, r.gene)}${r.signDiscordant ? '<small>fold change changes sign under shrinkage</small>' : ''}</td><td class="num">${num(r.baseMean, 1)}</td><td class="num">${sig(r.log2FC)}</td><td class="num"><span class="heat" style="${diverge(r.log2FCShrunk, 4)}">${sig(r.log2FCShrunk)}</span></td><td class="num">${sig(r.lfcSE)}</td><td class="num">${fmtP(r.pvalue)}</td><td class="num">${fmtP(r.padj)}</td><td data-de-class="${lookupCls(r.direction, r.padj)}">${esc(lookupClsLabel(c, lookupCls(r.direction, r.padj)))}</td></tr>`).join('') || `<tr><td colspan="8" class="empty" id="cmp-gene-none">None of the ${num(c.de.table.length)} listed genes matches. The table holds the genes with the smallest adjusted p${state.data.geneLookupUrl ? '; look up any other tested gene on the <button type="button" class="link-btn" data-view="overview">Overview</button>' : ''}.${deOtherGenes(c)}</td></tr>`}${shown.length && deOtherGenes(c) ? `<tr class="other-genes"><td colspan="8">${deOtherGenes(c)}</td></tr>` : ''}</tbody></table></div>
    <div class="card-foot"><span class="foot-key" data-color-key="scale">${scaleLegend(4, 'Shrunken log2 fold change')}</span><span>Fold changes: ${esc(lookupVs(c))}; adjusted p: false discovery rate. Higher or lower: adjusted p < 0.05 and at least a 2-fold shrunken change; significant, below 2-fold: adjusted p < 0.05 with a smaller change</span>${rows.length > shown.length ? `<button class="link-btn" data-action="cmpgenemore">Show 60 more</button>` : '<span></span>'}</div></section>`;
}
function typeValues(d, gene) {
  const v = d.geneExpression?.[gene] || d.typeExpression?.[gene]; if (v) return v;
  const L = d.geneLookup, i = L ? L.index.get(gene) : undefined, te = i !== undefined ? L.typeExpr[i] : null;   /* every tested gene: values of the lookup file */
  if (!Array.isArray(te)) return null;
  const lt = L.cellTypes || d.cellTypes.map(t => t.name);
  return d.cellTypes.map(t => { const k = lt.indexOf(t.name); return k >= 0 ? te[k] : NaN; });
}
function deGeneDetail(d, c) {
  const gene = state.cmp.gene || deRows(c)[0]?.gene, r = c.de.table.find(x => x.gene === gene) || null;
  const vp = r ? null : c.de.volcano.points.find(p => p[0] === gene);
  if (!r && !vp) return '<section class="card"><div class="card-body"><div class="empty">Select a gene in the table or the volcano plot.</div></div></section>';
  const x = lookupDe(d, gene), fc = x.lfc, padj = x.padj, dir = x.cls, tag = lookupGeneTag(d, gene);
  const bx = d.bulkExpression, bg = bulkOfGene(d, gene), bulk = bg ? Object.fromEntries(bg.samples.map((sm, i) => [sm, bg.values[i]])) : null;
  const pending = d.bulkAllUrl && !d.bulkAll && !String(d.lazy.bulkAll || '').startsWith('error');
  const baseMean = r ? r.baseMean : bg && Number.isFinite(bg.baseMean) ? bg.baseMean : null;
  const tv = typeValues(d, gene), types = d.cellTypes;
  let where = d.geneLookup && !tv ? '<p class="note" id="cmp-types-none">No cell-type estimates: this gene is not among the genes shared with the healthy reference.</p>' : '';
  if (tv) {
    const vals = tv.map((v, i) => ({ v, t: types[i] })).filter(x => Number.isFinite(x.v)).sort((a, b) => b.v - a.v), top = vals[0]?.v > 0 ? vals[0].t : null;
    const comp = c.composition?.table?.find(x => x.cell_type === top?.name);
    const shift = comp && comp.padj < 0.05 ? `The estimated ${esc(typeNoun(top.name))} fraction is ${comp.median_difference_pp > 0 ? 'higher' : 'lower'} in ${esc(c.test)} (median ${comp.median_difference_pp > 0 ? '+' : ''}${sig(comp.median_difference_pp)} percentage points), so part of this bulk change can come from composition.` : '';
    where = `<div class="note" style="margin:16px 0 6px">Where it is expressed: estimated expression by cell type, log(1 + counts per 10,000)</div><div id="cmp-types">${lookupTypeBars(vals.map(x => ({ v: x.v, label: x.t.label, color: x.t.color })))}</div>${shift ? `<p class="note">${shift}</p>` : ''}`;
  }
  return `<section class="card"><div class="card-head"><div><div class="card-title"><i>${esc(gene)}</i></div><div class="card-sub" id="cmp-gene-call" data-de-class="${dir}" title="${esc(LOOKUP_CLS_HELP)}">${esc(lookupClsLabel(c, dir))}${tag ? ` · ${esc(tag)}` : ''}</div></div><a class="badge" href="https://www.ncbi.nlm.nih.gov/gene/?term=${encodeURIComponent(gene)}%5Bsym%5D+AND+human%5Borgn%5D" target="_blank" rel="noopener">NCBI Gene</a></div>
    <div class="card-body"><div class="metrics small"><div class="metric"><small>Shrunken log2 fold change</small><b id="cmp-gene-fc">${sig(lookupNz(fc))}</b></div><div class="metric"><small>Adjusted p</small><b id="cmp-gene-padj">${lookupP(padj)}</b></div><div class="metric"><small>Mean normalized count</small><b id="cmp-basemean">${baseMean !== null ? num(baseMean, 0) : pending ? '…' : '—'}</b></div></div>${lookupRawNote(x, 'cmp-gene-raw')}
      ${bulk ? `<div class="note" style="margin:16px 0 4px">Bulk expression in each sample, ${esc(bg.unit || 'log2(normalized count + 1)')}</div>${groupStrip(bulk, bg.unitShort || 'log2 normalized count', { width: 330, height: 190 })}` : pending ? '<p class="note" id="cmp-bulk-pending">Loading the per-sample values of this gene…</p>' : d.bulkAllUrl ? '<p class="note">The per-sample values of this gene could not be loaded.</p>' : '<p class="note">Per-sample values of this gene are in the results download.</p>'}
      ${where}${tumorNote(d, gene)}${geneLiterature(d, gene, { compact: true, id: 'cmp-gene-lit' })}</div></section>`;
}
async function drawVolcano() {
  const holder = $('#volcano'); if (!holder) return;
  const c = state.data.comparison, pts = c.de.volcano.points, selGene = state.cmp.gene || deRows(c)[0]?.gene;
  try {
    const Plotly = await loadPlotly(); if (state.view !== 'genes' || !$('#volcano')) return;
    let gl = false; try { gl = !!document.createElement('canvas').getContext('webgl'); } catch (e) { gl = false; }
    const groups = [['ns', '#98a2b3', 4], ['sub', '#475467', 4], ['down', '#175cd3', 5.5], ['up', '#b42318', 5.5]], clsOf = p => lookupCls(p[3], 10 ** -p[2]);
    const traces = groups.map(([key, color, size]) => {
      const sel = pts.filter(p => clsOf(p) === key), name = `${lookupClsLabel(c, key)} (${num(sel.length)})`;
      return { type: gl ? 'scattergl' : 'scatter', mode: 'markers', name, x: sel.map(p => p[1]), y: sel.map(p => p[2]), customdata: sel.map(p => p[0]), hoverinfo: 'text',
        text: sel.map(p => `<b>${esc(p[0])}</b><br>log2 fold change ${sig(lookupNz(p[1]))}<br>adjusted p ${fmtP(10 ** -p[2])}<br>${esc(lookupClsLabel(c, key))}${p[4] ? '<br>fold change changes sign under shrinkage' : ''}`),
        marker: { size, color: sel.map(p => (p[4] ? 'rgba(255,255,255,0)' : color)), line: { color, width: sel.map(p => (p[4] ? 1.2 : 0)) }, opacity: key === 'ns' ? .55 : key === 'sub' ? .6 : .85 } };
    });
    const byGene = new Map(pts.map(p => [p[0], p]));
    const ann = (c.de.volcano.labels || []).filter(g => g !== selGene).map(g => byGene.get(g)).filter(Boolean).map(p => ({ x: p[1], y: p[2], text: esc(p[0]), showarrow: true, arrowhead: 0, arrowwidth: .8, arrowcolor: '#667085', ax: p[1] >= 0 ? 22 : -22, ay: -16, font: { size: 11, color: '#1d2939' } }));
    const sp = byGene.get(selGene);
    if (sp) { ann.push({ x: sp[1], y: sp[2], text: `<b>${esc(sp[0])}</b>`, showarrow: true, arrowhead: 2, arrowcolor: '#0b1f33', ax: sp[1] >= 0 ? 40 : -40, ay: -34, bgcolor: '#fff', bordercolor: '#0b1f33', font: { size: 12, color: '#0b1f33' } }); traces.push({ type: 'scatter', mode: 'markers', x: [sp[1]], y: [sp[2]], hoverinfo: 'skip', showlegend: false, marker: { size: 15, color: 'rgba(0,0,0,0)', line: { color: '#0b1f33', width: 2 } } }); }
    ann.push({ xref: 'paper', x: 1, xanchor: 'right', y: -Math.log10(0.05), yanchor: 'bottom', text: 'adjusted p = 0.05', showarrow: false, font: { size: 10.5, color: '#667085' } });
    for (const v of [-1, 1]) ann.push({ x: v, yref: 'paper', y: 1, yanchor: 'bottom', xanchor: 'center', text: '2-fold', showarrow: false, font: { size: 10.5, color: '#667085' } });
    holder.innerHTML = '';
    await Plotly.newPlot(holder, traces, {
      height: 420, margin: { l: 64, r: 16, t: 34, b: 56 }, paper_bgcolor: '#fff', plot_bgcolor: '#fff', hovermode: 'closest',
      font: { family: 'Inter, -apple-system, Segoe UI, Helvetica, Arial, sans-serif', size: 12, color: '#1d2939' },
      legend: { orientation: 'h', x: 0, y: 1.1, font: { size: 11.5 } }, annotations: ann,
      shapes: [{ type: 'line', xref: 'paper', x0: 0, x1: 1, y0: -Math.log10(0.05), y1: -Math.log10(0.05), line: { color: '#98a2b3', width: 1, dash: 'dot' } },
        ...[-1, 1].map(v => ({ type: 'line', yref: 'paper', y0: 0, y1: 1, x0: v, x1: v, line: { color: '#98a2b3', width: 1, dash: 'dot' } }))],
      xaxis: { title: { text: `Shrunken log2 fold change (${esc(lookupVs(c))})` }, zeroline: true, zerolinecolor: '#d0d5dd', gridcolor: '#f2f4f7' },
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
  const tabs = cols.map(x => `<button class="${x === k ? 'active' : ''}" data-cmpcol="${x}" title="Significant sets (adjusted p < 0.05) of the sets tested${Number.isFinite(P.collections[x].significantUp) ? `: ${num(P.collections[x].significantUp)} higher, ${num(P.collections[x].significantDown)} lower in ${esc(c.test)}` : ''}">${esc(GS_LABEL[x])} <small>${num(P.collections[x].significant)} of ${num(P.collections[x].tested)}</small></button>`).join('');
  const lab = signalingSetLabels(c), nList = (col.sets || []).length, listDown = (col.sets || []).filter(r => r.padj < 0.05 && r.nes < 0).length;
  const listNote = nList < col.tested ? `The table lists the ${num(nList)} sets with the smallest p of the ${num(col.tested)} tested in this database${Number.isFinite(col.significantDown) ? `; ${num(listDown)} of the ${num(col.significantDown)} significant sets that are lower in ${c.test} are among them` : ''}. All tested sets are in the results download.` : `The table lists all ${num(col.tested)} sets tested in this database.`;
  const leadCell = r => { const lg = r.leadingGenes || [], n = r.leadingN ?? lg.length; return `<span class="genes">${esc(lg.slice(0, 6).join(', '))}</span>${n > 6 ? `<small>first 6 of ${num(n)}</small>` : ''}`; };
  return `<div class="split section"><section class="card"><div class="card-head"><div><div class="card-title">Enriched gene sets</div><div class="card-sub">Gene sets whose genes rank toward higher (positive score) or lower (negative score) expression in ${esc(c.test)}; tabs show significant sets (adjusted p < 0.05) of the sets tested in each database</div></div></div>
    <div class="card-body"><div class="controls"><div class="segmented" role="group" aria-label="Gene-set database">${tabs}</div><label class="search">${icon('search')}<input class="input" id="cmp-set-search" type="search" placeholder="Search gene sets or genes" value="${esc(state.cmp.setSearch)}" aria-label="Search gene sets"></label></div>
    <div class="table-wrap" style="max-height:520px;margin-top:12px" data-scroll-id="enr-table"><table class="table"><thead><tr>${th('label', 'Gene set')}${th('nes', 'Score', { num: true, title: 'Normalized enrichment score' })}${th('size', 'Genes tested', { num: true, title: 'Member genes of the set among the genes tested in the comparison' })}${th('padj', 'Adjusted p', { num: true, title: 'Benjamini–Hochberg within this database' })}<th>Leading-edge genes</th>${th('cons', 'Cell-type ranking (islet data)', { title: `Not a result of this comparison. ${CONSENSUS_NOTE}` })}</tr></thead>
    <tbody>${shown.map(r => `<tr class="clickable${r.id === sel?.id ? ' selected' : ''}" data-cmpset="${esc(r.id)}"><td><button type="button" class="name-link" data-cmpset="${esc(r.id)}">${esc(r.label)}</button><small>${esc(r.id)}${k === 'GOBP' && r.theme ? ` · theme: ${esc(r.theme)}` : ''}</small>${r.sameAs ? `<small class="gs-flag">same tested genes and result as ${esc(lab(r.sameAs))}</small>` : ''}</td><td class="num"><span class="heat" style="${diverge(r.nes, 3)}">${sig(r.nes)}</span></td><td class="num">${num(r.size)}</td><td class="num">${fmtP(r.padj)}</td><td>${leadCell(r)}</td><td>${consensusBadge(r.consensus)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No gene sets match.</td></tr>'}</tbody></table></div>
    <p class="note" data-color-key="scale" style="margin:8px 0 0">${scaleLegend(3, 'Score')}</p><p class="note" id="enr-shown" style="margin:8px 0 0">${num(shown.length)} of ${plural(rows.length, 'listed set')} shown${state.cmp.setSearch ? ' (search covers the listed sets of this database)' : ''}. ${rows.length > shown.length ? `<button class="link-btn" data-action="cmpsetmore">Show more (${num(rows.length - shown.length)} remaining)</button>` : ''}</p>
    <p class="note" id="enr-note">Score: normalized enrichment score (fgsea); positive = the set's genes rank toward higher expression in ${esc(c.test)}. Adjusted p: Benjamini–Hochberg within this database. Source: ${esc(GS_DB[k].name)}, ${esc(GS_DB[k].version)}. ${esc(listNote)}</p>
    <p class="note" id="enr-names-note">Sets named after an infection or another disease (SARS-CoV, HIV, HCMV, influenza) consist of human genes: a significant result reflects those genes (see the leading-edge genes; often interferon-response, proteasome, histone or ribosomal genes), not that infection or disease. The last column, cell-type ranking, is not a result of this comparison: it describes the gene set in public islet single-cell data.</p></div></section>
    <aside class="detail">${sel ? enrichmentDetail(c, { ...sel, collection: k }) : ''}</aside></div>`;
}
function enrichmentDetail(c, r) {
  const de = new Map(c.de.table.map(x => [x.gene, x.log2FCShrunk])), vp = new Map(c.de.volcano.points.map(p => [p[0], p[1]]));
  const genes = (r.leadingGenes || []).slice(0, 15).map(g => ({ name: g, v: de.has(g) ? de.get(g) : vp.get(g) })).filter(x => Number.isFinite(x.v));
  const db = GS_DB[r.collection];
  return `<section class="card"><div class="card-head"><div><div class="card-title">${esc(r.label)}</div><div class="card-sub">${esc(r.id)}</div></div></div>
    <div class="card-body"><div class="source-line">${icon('database')}<div><b>${esc(db.name)}</b> · ${esc(db.version)}<br>${setLinks(r).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">View in ${esc(n)}</a>`).join(' · ')}</div></div>
      <div class="metrics small"><div class="metric"><small>Normalized enrichment score</small><b>${sig(r.nes)}</b></div><div class="metric"><small>Adjusted p</small><b>${fmtP(r.padj)}</b></div><div class="metric" title="Member genes of the set among the genes tested in the comparison; the Cell-type signaling tab counts member genes among the genes of the pancreas reference, so the two numbers can differ"><small>Genes tested</small><b>${num(r.size)}</b></div></div>
      <p class="note">${r.padj < 0.05 ? `The set's genes rank toward ${r.nes > 0 ? 'higher' : 'lower'} expression in ${esc(c.test)} than expected by chance.` : 'Not significant at adjusted p < 0.05.'}</p>
      ${genes.length ? `<div class="note" style="margin:12px 0 4px">Leading-edge genes (the genes driving the score${Number.isFinite(r.leadingN) && r.leadingN > genes.length ? `; first ${num(genes.length)} of ${num(r.leadingN)}` : ''}) and their shrunken log2 fold change</div>${divergingBars(genes, `log2 fold change (${generalVs(c)})`, { labelWidth: 90, width: 300, row: 21, key: RED_BLUE(`Higher in ${c.test}`, `Lower in ${c.test}`) })}` : '<p class="note">No leading-edge genes are listed for this set.</p>'}
      ${r.theme && r.theme !== r.label ? `<p class="note">Theme: ${esc(r.theme)}.</p>` : ''}${r.sameAs ? `<p class="note gs-flag">Same tested genes and same result as ${esc(signalingSetLabels(c)(r.sameAs))}: the two sets are one finding.</p>` : ''}
      ${CONSENSUS[r.consensus] ? `<p class="note" id="enr-ranking">${esc(CONSENSUS_TITLE)} (a property of the gene set in public islet data, not a result of this comparison): ${consensusBadge(r.consensus)} ${esc(consensusHelp(r.consensus).replace(/^./, x => x.toUpperCase()))}.</p>` : ''}${spatialPanel(state.data, 'set', r.id, r.label)}</div></section>`;
}
function progenyCard(c) {
  const p = c.pathways?.progeny || [], T = c.pathways?.progenyTest, byId = new Map(p.map(r => [r.id, r]));
  const items = [...p].sort((a, b) => b.score - a.score).map(r => ({ name: r.label, v: r.score, faint: !(r.padj < 0.05), mark: r.padj < 0.05 ? ' *' : '', note: `adjusted p ${fmtP(r.padj)}, ${num(r.targets)} genes tested${Number.isFinite(r.libraryGenes) ? ` of ${num(r.libraryGenes)} in the gene-set library` : ''}` }));
  const tg = p.map(r => r.targets).filter(Number.isFinite), lg = p.map(r => r.libraryGenes).filter(Number.isFinite);
  const used = tg.length ? `; genes used per pathway: ${lg.length ? `${num(Math.min(...lg))} to ${num(Math.max(...lg))} in the gene-set library, ` : ''}${num(Math.min(...tg))} to ${num(Math.max(...tg))} among the tested genes (shown with each bar)` : '';
  /* PROGENy pathways whose Hallmark sets of the same name are significant in the opposite direction */
  const H = c.pathways?.collections?.H?.sets || [], KEY = { PROGENY_p53: /_P53_/, PROGENY_Estrogen: /_ESTROGEN_/, PROGENY_Hypoxia: /_HYPOXIA$/, PROGENY_TGFb: /_TGF_BETA_/, PROGENY_TNFa: /_TNFA_/, PROGENY_NFkB: /_NFKB$/, PROGENY_WNT: /_WNT_/, PROGENY_JAK_STAT: /_JAK_STAT/, PROGENY_PI3K: /_PI3K_/, PROGENY_Androgen: /_ANDROGEN_/ };
  const opp = p.filter(r => r.padj < 0.05 && KEY[r.id]).map(r => [r, H.filter(h => KEY[r.id].test(h.id) && h.padj < 0.05 && Math.sign(h.nes) === -Math.sign(r.score))]).filter(x => x[1].length);
  const oppNote = opp.length ? `<p class="note" id="progeny-hallmark-note">PROGENy and Hallmark disagree for ${opp.map(([r, hs]) => `${esc(r.label)} (PROGENy ${sig(r.score)}; Hallmark ${hs.map(h => `${esc(h.label)} ${sig(h.nes)}`).join(', ')})`).join(' and ')}. The two databases use different genes and directions: a Hallmark set lists genes that belong to the process, PROGENy weights the genes that respond when the pathway is perturbed, with negative weights for genes that go down, so the two need not agree${opp.some(x => x[0].id === 'PROGENY_p53') ? '; the TP53 mutation status of the patients is not part of this dataset, so the p53 result cannot be checked against it' : ''}.</p>` : '';
  /* integration (tissue_figures-016): a PROGENy pathway can be selected here to see it on the tissue section and to open it by cell type */
  const selP = byId.get(state.cmp.progeny) || null, hasTissue = !!(state.data.spatialUrl || state.data.spatial);
  const pick = hasTissue || state.data.genesetsUrl || state.data.genesets ? `<div class="note" style="margin:12px 0 4px">Select a pathway${hasTissue ? ' to see it on the tissue section' : ''}:</div><div class="chips" id="progeny-pick">${[...p].sort((a, b) => a.label.localeCompare(b.label)).map(r => `<button type="button" class="chip link${selP?.id === r.id ? ' active' : ''}" data-cmpprogeny="${esc(r.id)}" aria-pressed="${selP?.id === r.id}">${esc(r.label.replace(/ pathway$/, ''))}</button>`).join('')}</div>${selP ? `<p class="note" id="progeny-selected"><b style="color:var(--ink-2)">${esc(selP.label)}</b>: activity score ${sig(selP.score)}, adjusted p ${fmtP(selP.padj)}. <button type="button" class="link-btn" data-gsjump="${esc(selP.id)}" data-gscolj="PROGENY">Open by cell type</button></p>${spatialPanel(state.data, 'set', selP.id, selP.label)}` : ''}` : '';
  const pNote = T ? `<p class="note" id="progeny-p-note">Score: t-value of the pathway in the linear model. ${esc(T.formula.replace(/^p = /, 'p value = '))}.${T.recomputed?.length ? ` The p values of ${T.recomputed.map(id => esc(byId.get(id)?.label || id)).join(', ')} were stored as 0 by the software and were recomputed from the scores with this formula.` : ''}</p>` : '';
  return `<section class="card"><div class="card-head"><div><div class="card-title">Signaling pathway activity (PROGENy)</div><div class="card-sub">Activity of 14 signaling pathways inferred from their response genes, ${esc(generalVs(c))} (* adjusted p < 0.05). Database: PROGENy, ${esc(GS_DB.PROGENY.version)}${esc(used)}</div></div></div>
    <div class="card-body" id="progeny-card-body">${items.length ? divergingBars(items, `Pathway activity score (${generalVs(c)})`, { labelWidth: 120, width: 400, row: 22, key: [...RED_BLUE(`Higher activity in ${c.test}`, `Lower activity in ${c.test}`), { color: '#667085', opacity: .35, label: 'Pale bar: not significant (adjusted p of 0.05 or more)' }] }) + pNote + oppNote + pick : '<div class="empty">Pathway activity is not available for this comparison.</div>'}</div></section>`;
}
/* Display name of a gene set named anywhere in the comparison block (listed sets, PROGENy pathways, member sets of the themes). */
function signalingSetLabels(c) {
  const P = c.pathways || {};
  if (!P._labels) {
    const m = new Map();
    for (const t of P.themes || []) for (const [id, l] of t.sets || []) m.set(id, l);
    for (const col of Object.values(P.collections || {})) for (const s of col.sets || []) m.set(s.id, s.label);
    for (const r of P.progeny || []) m.set(r.id, r.label);
    for (const [id, l] of Object.entries(P.setLabels || {})) if (!m.has(id)) m.set(id, l);
    Object.defineProperty(P, '_labels', { value: m, enumerable: false });
  }
  const g = state.data?.genesets;
  return id => P._labels.get(id) || (g ? GS_ORDER.flatMap(k => g.collections[k]?.sets || []).find(s => s.id === id)?.label : null) || String(id).replace(/^(HALLMARK|REACTOME|WP|GOBP|PROGENY)_/, '').replace(/_/g, ' ').toLowerCase().replace(/^./, x => x.toUpperCase());
}
function themesCard(c, { limit = 0 } = {}) {
  const P = c.pathways || {}, all = P.themes || [], th = limit ? all.slice(0, limit) : all, bm = limit ? [] : (P.bestMatches || []).filter(r => r.query_padj < 0.05);
  const lab = signalingSetLabels(c), themeName = new Map(all.map(t => [t.theme_id, t.theme_label]));
  const themeSub = t => { const sg = t.shared_genes || [], same = (t.same_signal_as || []).map(id => themeName.get(id)).filter(Boolean);
    return [sg.length ? `shared leading-edge genes: ${sg.map(x => x[0]).join(', ')}` : '', t.top_set ? `most significant set: ${lab(t.top_set)}` : '', same.length ? `same signal as: ${same.join('; ')}` : ''].filter(Boolean).map(x => `<small>${esc(x)}</small>`).join(''); };
  const themeSets = t => (!limit && t.sets?.length ? `<details class="theme-sets"><summary>${plural(t.sets.length, 'gene set')} of this theme</summary><ul>${t.sets.map(([id, l, s]) => `<li>${esc(l)} <small>${esc(id)} · ${s === 1 ? 'significant' : s === 0 ? 'not significant' : 'not tested'}</small></li>`).join('')}</ul></details>` : '');
  const family = t => (t.gene_family ? ` <span class="badge muted" title="The sets of this theme have different names and only the ${esc(t.gene_family)} in common; read it as one signal of that gene family">one gene family</span>` : '');
  const rows = th.map(t => `<tr data-theme="${esc(t.theme_id || '')}"><td><b style="font-weight:600">${esc(t.theme_label)}</b>${family(t)}${themeSub(t) || `<small>${esc(t.top_set || '')}</small>`}${themeSets(t)}</td><td><span class="badge ${t.call === 'up' ? 'warn' : 'accent'}">${t.call === 'up' ? `Higher in ${esc(c.test)}` : `Lower in ${esc(c.test)}`}</span></td><td>${esc(String(t.collections_up || t.collections_down || '').split(',').filter(Boolean).map(x => GS_LABEL[x] || x).join(', '))}</td><td class="num">${num(t.n_sig_sets)} of ${num(t.n_tested)}</td></tr>`).join('');
  const matchNames = v => String(v || '').split(';').filter(Boolean).map(x => lab(x.replace(/^[A-Z]+:/, ''))).join('; ');
  const bmRows = bm.map(r => `<tr data-bm="${esc(r.query_set)}"><td>${esc(GS_LABEL[r.query_collection] || r.query_collection)}: ${esc(lab(r.query_set))}</td><td class="num">${sig(r.query_score)}<small>${r.query_collection === 'PROGENY' ? 't-value' : 'NES'}</small></td><td class="num" title="${esc(matchNames(r.matches_same_sign) || 'none')}">${num(r.n_matches_sig_same_sign)} of ${num(r.n_matches_tested)}</td><td class="num" title="${esc(matchNames(r.matches_opposite) || 'none')}">${num(r.n_matches_sig_opposite)}</td></tr>`).join('');
  return `<section class="card" id="themes-card"><div class="card-head"><div><div class="card-title">Themes consistent across databases</div><div class="card-sub">Themes of related gene sets that change in the same direction in more than one database${limit && all.length > th.length ? `; ${num(th.length)} of ${num(all.length)} shown` : ` (${num(all.length)})`}</div></div><span class="badge accent">${icon('database')} Cross-database</span></div>
    <div class="card-body">${rows ? `<div class="table-wrap" style="max-height:${limit ? 'none' : '360px'}"><table class="table"><thead><tr><th>Theme</th><th>Direction</th><th>Databases</th><th class="num">Significant sets</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="note">No theme changed consistently across databases.</p>'}
    ${bmRows ? `<div class="note" style="margin:14px 0 4px">Significant Hallmark and PROGENy sets and their best-matching sets in other databases</div><div class="table-wrap" style="max-height:300px"><table class="table"><thead><tr><th>Gene set</th><th class="num" title="Hallmark: normalized enrichment score; PROGENy: t-value. The two are on different scales">Score</th><th class="num">Matches, same direction</th><th class="num">Matches, opposite</th></tr></thead><tbody>${bmRows}</tbody></table></div>
    <p class="note" id="bm-note">Best-matching sets: for each significant Hallmark or PROGENy set, the three sets with the largest gene overlap in each of the other databases (up to 12 that were tested). The columns count the matched sets that are significant in the same and in the opposite direction; hover a count for their names (the first six). A matched set shares genes with the query set and need not describe the same biology, so an opposite match is not by itself a contradiction. Score: normalized enrichment score for Hallmark, t-value for PROGENy; the two scales are not comparable.</p>` : ''}
    <p class="note" id="theme-rule">${limit ? '' : 'A theme is listed when at least one of its sets is significant (adjusted p < 0.05) in each of at least two databases and no set is significant in the opposite direction; "significant sets" gives the significant sets among those tested. '}${P.themeSignals?.n && !limit ? `The ${num(all.length)} themes describe ${plural(P.themeSignals.n, 'distinct signal')}: ${esc(P.themeSignals.rule)} and are cross-referenced. Order: by number of significant sets; themes whose sets have only one gene family in common come last. ` : ''}${esc(P.themeCaveat || '')}</p></div>${limit ? `<div class="card-foot"><span></span><button class="link-btn" data-view="compare">All themes and pathway enrichment →</button></div>` : ''}</section>`;
}
function compositionCompare(c, { body = false } = {}) {
  const comp = c.composition;
  if (!comp) return '<section class="card"><div class="card-body"><div class="empty">Composition was not estimated for this comparison.</div></div></section>';
  const types = comp.table.map(r => r.cell_type), samples = Object.keys(comp.fractions);
  const grp = c.samples || {}, flagged = new Set(Object.values(comp.flaggedSamples || {}).flat());
  const col = { [c.test]: GROUP_COLOR[0], [c.reference]: GROUP_COLOR[1] };
  const cd = samplesCompDisplay(c), ctx = samplesText('compositionText'), ftx = samplesText('fitText');
  /* point titles use the same rounded values as the composition table */
  const tableValue = Object.fromEntries((state.data?.samples || []).map(x => [x.id, x.fractions || {}]));
  const hc = healthyComposition(state.data);
  const vmax = Math.max(...samples.flatMap(sm => types.map(t => comp.fractions[sm]?.[t] || 0)), ...(hc ? hc.donors.flatMap(x => types.map(t => x.f[t] || 0)) : []), .05), ymax = Math.min(1, Math.ceil(vmax * 10 + 1e-9) / 10);
  const L = 56, W = 640, T = 10, H = 240, cw = W / types.length, Y = v => T + H - v / ymax * H;
  /* three columns per cell type when the healthy reference cells are loaded: test group, reference group, healthy donors */
  const hk = hc ? .28 : .19, jw = hc ? .11 : .16, mw = hc ? .1 : .13;
  const off = g => (g === c.test ? -hk : hc ? 0 : hk) * cw;
  const patient = Object.fromEntries((state.data?.samples || []).map(x => [x.id, patientOf(x)])), pairAt = types.map(() => ({}));
  const dots = samples.map((sm, si) => types.map((t, ti) => {
    const v = comp.fractions[sm]?.[t]; if (!Number.isFinite(v)) return '';
    const g = grp[sm], x = L + cw * (ti + .5) + off(g) + ((((si + 1) * 7919) % 97) / 97 - .5) * cw * jw, k = col[g] || '#667085', out = flagged.has(sm);
    if (patient[sm] && (g === c.test || g === c.reference)) (pairAt[ti][patient[sm]] = pairAt[ti][patient[sm]] || []).push({ x, y: Y(v), g });
    return `<circle cx="${x.toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.2" fill="${out ? '#fff' : k}" fill-opacity="${out ? 1 : .75}" stroke="${k}" stroke-width="1.2"><title>${esc(sampleLabel(sm))} (${esc(g || '')}) · ${esc(typeLabel(t))}: ${pct(tableValue[sm]?.[t] ?? v)}${out ? ' · poor fit to the reference' : ''}</title></circle>`;
  }).join('')).join('');
  const med = comp.table.map((r, ti) => [[c.test, r.median_test_pct], [c.reference, r.median_reference_pct]].map(([g, v]) => { const x = L + cw * (ti + .5) + off(g); return Number.isFinite(v) ? `<line x1="${(x - cw * mw).toFixed(1)}" x2="${(x + cw * mw).toFixed(1)}" y1="${Y(v / 100).toFixed(1)}" y2="${Y(v / 100).toFixed(1)}" stroke="#0b1f33" stroke-width="2"/>` : ''; }).join('')).join('');
  const pairs = pairAt.map(o => Object.entries(o).filter(([, a]) => a.length === 2 && a[0].g !== a[1].g).map(([p, [a, b]]) => `<line class="pair-line" data-patient="${esc(p)}" x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#98a2b3" stroke-opacity=".6"><title>Patient ${esc(p)}</title></line>`).join('')).join('');
  const hDots = hc ? hc.donors.map((dn, di) => types.map((t, ti) => { const v = dn.f[t]; if (!Number.isFinite(v)) return ''; const x = L + cw * (ti + .5) + hk * cw + ((di + .5) / hc.donors.length - .5) * cw * jw; return `<circle class="healthy-dot" cx="${x.toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.2" fill="${HEALTHY_COLOR}" fill-opacity=".75" stroke="${HEALTHY_COLOR}" stroke-width="1.2"><title>${esc(hc.label)}, donor ${esc(dn.id)} · ${esc(typeLabel(t))}: ${pct(v)} of ${num(dn.n)} counted cells</title></circle>`; }).join('')).join('') : '';
  const hMed = hc ? types.map((t, ti) => { const x = L + cw * (ti + .5) + hk * cw, v = hc.median[t]; return Number.isFinite(v) ? `<line class="healthy-median" x1="${(x - cw * mw).toFixed(1)}" x2="${(x + cw * mw).toFixed(1)}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#0b1f33" stroke-width="2"/>` : ''; }).join('') : '';
  const axis = ticksFor(0, ymax * 100, 5).map(v => `<line x1="${L - 5}" x2="${L}" y1="${Y(v / 100).toFixed(1)}" y2="${Y(v / 100).toFixed(1)}" stroke="#98a2b3"/><text x="${L - 8}" y="${(Y(v / 100) + 4).toFixed(1)}" text-anchor="end">${v}</text>`).join('');
  const xl = types.map((t, i) => `<text x="${(L + cw * (i + .5)).toFixed(1)}" y="${T + H + 16}" text-anchor="middle">${esc(typeLabel(t).replace(' (gamma)', ''))}</text>`).join('');
  const svg = `<svg class="svgplot" viewBox="0 0 ${L + W + 8} ${T + H + 46}" role="img" aria-label="Estimated cell-type fractions by group"><g font-size="11.5" fill="#667085">${axis}<line x1="${L}" x2="${L}" y1="${T}" y2="${T + H}" stroke="#98a2b3"/><line x1="${L}" x2="${L + W}" y1="${T + H}" y2="${T + H}" stroke="#98a2b3"/>${xl}
    <text class="axis-title" transform="translate(14 ${T + H / 2}) rotate(-90)" text-anchor="middle" fill="#344054">Estimated fraction of cells (%)</text><text class="axis-title" x="${L + W / 2}" y="${T + H + 38}" text-anchor="middle" fill="#344054">Cell type (points: samples${hc ? ' or healthy donors' : ''}; bars: group medians)</text></g>${pairs}${dots}${hDots}${med}${hMed}</svg>`;
  const ct = { type: { v: r => typeLabel(r.cell_type) }, mt: { v: r => r.median_test_pct }, mr: { v: r => r.median_reference_pct }, mh: { v: r => (hc ? hc.median[r.cell_type] * 100 : null) }, diff: { v: r => r[cd.field] }, dir: { v: r => r[cd.dirField] }, padj: { v: r => r.padj } };
  const tRows = sortRows('comp', comp.table, ct, 'padj', 1), th = (k, l, o = {}) => sortTh('comp', k, l, { defKey: 'padj', defDir: 1, ...o });
  const rows = tRows.map(r => `<tr><td><span class="swatch" style="background:${typeColor(r.cell_type)};margin-right:6px"></span>${esc(typeLabel(r.cell_type))}</td><td class="num">${samplesFix(r.median_test_pct)}</td><td class="num">${samplesFix(r.median_reference_pct)}</td>${hc ? `<td class="num" data-healthy-median="${esc(r.cell_type)}">${samplesFix(hc.median[r.cell_type] * 100)}</td>` : ''}<td class="num">${samplesSigned(r[cd.field])}</td>${cd.dirField ? `<td class="num">${Number.isFinite(r[cd.dirField]) ? `${num(r[cd.dirField])} of ${num(r.n_pairs)}` : '—'}</td>` : ''}<td class="num">${fmtP(r.padj)}</td></tr>`).join('');
  const thr = comp.fit?.thresholds || {};
  const fitAll = Object.entries(comp.fit?.samples || {}).map(([sm, f]) => ({ sm, g: grp[sm] || '', ...f }));
  const fc = { sm: { v: r => sampleLabel(r.sm) }, g: { v: r => r.g }, r: { v: r => r.fit_r }, u: { v: r => r.unexplained }, o: { v: r => (r.outside_reference ? 'Poor' : 'Adequate') } };
  const fth = (k, l, o = {}) => sortTh('fit', k, l, { defKey: 'r', defDir: 1, ...o });
  const fitRows = sortRows('fit', fitAll, fc, 'r', 1).map(f => `<tr><td>${esc(sampleLabel(f.sm))}</td><td>${esc(f.g)}</td><td class="num">${samplesFix(f.fit_r, 3)}</td><td class="num">${Number.isFinite(f.unexplained) ? (f.unexplained * 100).toFixed(1) : '—'}</td><td>${f.outside_reference ? '<span class="badge warn">Poor</span>' : 'Adequate'}</td></tr>`).join('');
  const inner = `<div class="grid halves"><div>${svg}<div class="legend static"><span><span class="swatch" style="background:${col[c.test]}"></span>${esc(c.test)}</span><span><span class="swatch" style="background:${col[c.reference]}"></span>${esc(c.reference)}</span>${hc ? `<span id="comp-groups-healthy-key"><span class="swatch" style="background:${HEALTHY_COLOR}"></span>${esc(hc.label)} (${plural(hc.donors.length, 'donor')}, counted cells)</span>` : ''}<span><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" fill="#fff" stroke="#667085" stroke-width="1.2"/></svg>Sample with a poor fit to the reference</span>${pairs ? `<span id="comp-pair-key"><svg width="18" height="10" aria-hidden="true"><line x1="1" y1="5" x2="17" y2="5" stroke="#98a2b3" stroke-width="1.5"/></svg>Line: the ${esc(c.test)} and the ${esc(samplesLower(c.reference))} sample of one patient</span>` : ''}<span><svg width="18" height="10" aria-hidden="true"><line x1="1" y1="5" x2="17" y2="5" stroke="#0b1f33" stroke-width="2"/></svg>Group median</span></div></div>
    <div><div class="table-wrap" data-scroll-id="comp-table"><table class="table"><thead><tr>${th('type', 'Cell type')}${th('mt', `Median, ${esc(c.test)} (%)`, { num: true })}${th('mr', `Median, ${esc(c.reference)} (%)`, { num: true })}${hc ? th('mh', `Median, ${esc(samplesLower(hc.label))} (%)`, { num: true, title: `Median over the ${num(hc.donors.length)} donors of the share of the cell type among the donor's reference cells. Counted cells, not an estimate from bulk tissue` }) : ''}${th('diff', `${esc(cd.label)} (points)`, { num: true, title: cd.title })}${cd.dirField ? th('dir', esc(cd.dirLabel), { num: true, title: cd.dirTitle }) : ''}${th('padj', 'Adjusted p', { num: true, title: comp.test || '' })}</tr></thead><tbody>${rows}</tbody></table></div>
    <p class="note" id="comp-groups-note">${esc(cd.note)} ${esc(ctx.caveat || 'Tumor cells and cancer-associated fibroblasts have no reference type; their share is absorbed into the nearest types (mostly ductal and stellate).')}</p>${hc && hc.note ? `<p class="note" id="comp-groups-healthy-note"><b>${esc(hc.label)}.</b> ${esc(hc.note)}</p>` : ''}</div></div>
    ${fitRows ? `<details class="advanced"><summary>How well each sample fits the healthy reference</summary><p class="note" id="fit-definition">${esc(ftx.definition || 'Each sample is described as the best mixture of the reference cell types on their marker genes. Fit correlation: correlation, on a log scale, between the sample\u2019s expression of these genes and the mixture. Unassigned share: one minus the sum of the mixture weights, the part of the sample\u2019s reads that the mixture does not assign to a reference cell type (0 when the weights sum to 1 or more). The two numbers measure different things, so a low correlation can go with a small unassigned share.')}</p><p class="note" id="fit-rule">${esc(ftx.rule || `The fit is called poor when the fit correlation is below ${samplesFix(thr.fit_r_min, 3)} or the unassigned share is above ${Number.isFinite(thr.unexplained_max) ? (thr.unexplained_max * 100).toFixed(0) : '—'}%; both limits come from public bulk RNA-seq of islets and of pancreas tissue without tumor. A poor fit means that the reference cell types describe the sample badly; the label is not a measure of tumor content.`)}</p><div class="table-wrap" style="max-height:300px" data-scroll-id="fit-table"><table class="table"><thead><tr>${fth('sm', 'Sample')}${fth('g', 'Group')}${fth('r', 'Fit correlation', { num: true })}${fth('u', 'Unassigned share (%)', { num: true })}${fth('o', 'Fit')}</tr></thead><tbody>${fitRows}</tbody></table></div></details>` : ''}`;
  return body ? inner : `<section class="card"><div class="card-head"><div><div class="card-title">Composition by group</div><div class="card-sub">Estimated fraction of cells of each type in every sample (%), healthy pancreas reference types</div></div></div><div class="card-body">${inner}</div></section>`;
}
function exportDE() {
  const c = state.data.comparison; if (!c) return toast('This result has no comparison.');
  /* direction: up, down = adjusted p < 0.05 and at least 2-fold; below 2-fold = adjusted p < 0.05 and less than 2-fold; ns = adjusted p of 0.05 or more */
  const cls = r => lookupCls(r.direction, r.padj), dir = r => ({ up: 'up', down: 'down', sub: 'below 2-fold', ns: 'ns' })[cls(r)];
  const rows = [['gene', 'mean_normalized_count', 'log2_fold_change', 'log2_fold_change_shrunk', 'log2_fold_change_se', 'pvalue', 'padj', 'direction', 'class', 'shrinkage_changes_sign'], ...c.de.table.map(r => [r.gene, r.baseMean, r.log2FC, r.log2FCShrunk, r.lfcSE, r.pvalue, r.padj, dir(r), lookupClsLabel(c, cls(r)), r.signDiscordant])];
  download(tissue_exports_file('cellaris-comparison-genes', tissue_exports_part('de')), rows.map(r => r.map(csvCell).join(',')).join('\n'));
}
function exportEnrichment() {
  const c = state.data.comparison; if (!c) return toast('This result has no comparison.');
  const rows = [['database', 'database_version', 'gene_set', 'label', 'normalized_enrichment_score', 'set_size', 'pvalue', 'padj', 'theme', 'celltype_ranking_across_databases_islet_data', 'leading_edge_n', 'leading_edge_genes']];
  for (const [k, col] of Object.entries(c.pathways?.collections || {})) for (const r of col.sets || []) rows.push([GS_DB[k]?.name || k, GS_DB[k]?.version || '', r.id, r.label, r.nes, r.size, r.pvalue, r.padj, r.theme, CONSENSUS[r.consensus]?.[0] || '', r.leadingN ?? (r.leadingGenes || []).length, (r.leadingGenes || []).join(';')]);
  for (const r of c.pathways?.progeny || []) rows.push(['PROGENy', GS_DB.PROGENY.version, r.id, r.label, r.score, r.targets, r.pvalue, r.padj, '', '', '', '']);
  download(tissue_exports_file('cellaris-comparison-pathways', tissue_exports_part('enrich')), rows.map(r => r.map(csvCell).join(',')).join('\n'));
}

/* ---------- Spatial views: a pathway's score on a public PDAC tissue section ---------- */
function checkSpatial(b) {
  if (!b || !Array.isArray(b.sections) || !b.sections.length || !Array.isArray(b.chunks) || typeof b.sets !== 'object') throw new Error('Invalid spatial index.');
  for (const s of b.sections) if (!Array.isArray(s.x) || !Array.isArray(s.y) || s.x.length !== s.y.length) throw new Error('Invalid tissue section.');
  return b;
}
/* texts of the tissue-section panel: probe set, source line with denominators, how to read the picture, caveat */
const tissue_exports_probeNote = sec => (Number.isFinite(sec.genesMeasured) ? ` The section was measured with a probe set of ${num(sec.genesMeasured)} genes; genes without a probe are not measured${sec.ribosomalProteinGenesMeasured === 0 ? ', and the probe set contains no ribosomal protein genes' : ''}.` : '');
const tissue_exports_caveat = kind => `${esc(DEMO().spatialCaveat || 'This section comes from a different patient than the bulk samples analyzed here. It is one section from one tumor, shown as an example. Scores are relative within the section: compare areas of the section with each other, not with the cell-type or sample values elsewhere. Each area contains many cells of several types.')}${kind === 'metabolic' ? ' This is gene expression measured in the tissue, not the pathway activity estimated by the metabolic model.' : ''}`;
const tissue_exports_quoted = (labs, ks) => { const a = ks.map(k => `\u2018${esc(labs[k])}\u2019`); return a.length > 1 ? `${a.slice(0, -1).join(', ')} or ${a.at(-1)}` : a[0] || ''; };
function tissue_exports_source(d, S, sec, kind, id) {
  const used = S.genesUsed?.[sec.id]?.[id], total = S.genesTotal?.[sec.id]?.[id], of = Number.isFinite(total) ? ` of ${num(total)}` : '';
  const listed = kind === 'metabolic' ? S.genesListed?.[sec.id]?.[id] : null, p = kind === 'metabolic' ? d.pathways.find(x => x.id === id) : null;
  const most = Array.isArray(sec.spotsPerBin) && sec.spotsPerBin.length ? sec.spotsPerBin.reduce((a, b) => Math.max(a, b), 0) : 0;
  const area = sec.binWidthUm && sec.binHeightUm ? `${num(sec.nSpots)} areas of about ${(sec.binWidthUm / 1000).toFixed(2)} \u00d7 ${(sec.binHeightUm / 1000).toFixed(2)} mm${most ? ` (up to ${num(most)} capture spots each)` : ''}` : sec.binUm ? `${num(sec.nSpots)} areas of about ${sig(sec.binUm / 1000)} mm` : `${num(sec.nSpots)} spots`;
  /* metabolic: the count on the section uses all enzyme genes linked to the pathway's reactions; the panel above counts those present in the bulk data */
  const genes = !Number.isFinite(used) ? '' : kind === 'metabolic'
    ? ` · ${num(used)}${of} enzyme genes linked to this pathway\u2019s reactions measured on the section${listed && p && p.genes.length === listed[1] && (listed[0] !== used || listed[1] !== total) ? ` (${num(listed[0])} of the ${num(listed[1])} enzyme genes counted above, which are those present in the bulk data)` : ''}`
    : ` · ${num(used)}${of} genes of this set measured on the section`;
  return `<b>${esc(sec.label)}</b> · ${area}${genes}. Data: ${sec.url ? `<a href="${esc(sec.url)}" target="_blank" rel="noopener">${esc(String(sec.url).replace(/^https:\/\/doi\.org\//, 'doi:'))}</a>` : esc(sec.dataset || '')}${sec.license ? `, ${sec.licenseUrl ? `<a href="${esc(sec.licenseUrl)}" target="_blank" rel="noopener">${esc(sec.license.replace(/ \(.*\)$/, ''))}</a>` : esc(sec.license)}` : ''}.${sec.changes ? ` Changes: ${esc(sec.changes.charAt(0).toLowerCase() + sec.changes.slice(1))}` : ''} Full credit in About.`;
}
function tissue_exports_setTop(d, id, clearOnly = false) {
  for (const c of Object.values(d.genesets?.collections || {})) {
    const s = (c.sets || []).find(x => x.id === id); if (!s) continue;
    let best = -1; s.activity.forEach((v, i) => { if (Number.isFinite(v) && (best < 0 || v > s.activity[best])) best = i; });
    /* integration: a set without a clear highest cell type (rule of the Cell-type signaling tab) names none */
    if (clearOnly && best >= 0 && typeof signalingHighest === 'function' && !signalingHighest(d.genesets, s).clear) return null;
    return best < 0 ? null : d.genesets.cellTypes[best];
  }
  return null;
}
function tissue_exports_reading(d, S, sec, kind, id) {
  const sum = S.regionSummary?.[sec.id], labs = sec.regions?.labels || [], n = labs.length;
  const arg = a => a.indexOf(a.reduce((x, y) => Math.max(x, y), -Infinity)), pct = v => `${Math.round(v * 100)}%`;
  if (kind === 'metabolic') {
    let t = 'How to read the picture: it shows the expression of the pathway\u2019s enzyme genes relative to all transcripts in each area. Areas in which a few very abundant transcripts take most of the counts therefore look low for most pathways.';
    const m = sum?.metabolic, sh = sum?.topTranscriptShare;
    if (m && sh && n) {
      const k = arg(m.lowest), others = sh.byRegion.filter((_, i) => i !== k), acinar = (sec.regions.cellTypes?.[k] || []).includes('acinar');
      t += ` On this section the ${sh.genes === 10 ? 'ten' : num(sh.genes)} most abundant transcripts take ${pct(sh.byRegion[k])} of all counts in \u2018${esc(labs[k])}\u2019${acinar && sh.acinarTopGenes?.length > 2 ? ` (digestive-enzyme transcripts such as ${esc(sh.acinarTopGenes.slice(0, 2).join(', '))} and ${esc(sh.acinarTopGenes[2] || '')})` : ''}, against ${pct(Math.min(...others))} to ${pct(Math.max(...others))} in the other regions, and \u2018${esc(labs[k])}\u2019 is the lowest of the ${num(n)} regions for ${num(m.lowest[k])} of the ${num(m.scored)} pathways.`;
    }
    return t;
  }
  let t = `How to read the picture: the score measures how highly ${String(id).startsWith('PROGENY_') ? 'the pathway\u2019s response genes, weighted by their response weights, are' : 'the set\u2019s genes are'} expressed in each area compared with all other genes measured there. It has the same definition as the activity score of the estimated profiles, but each area contains several cell types.`;
  if (state.view === 'compare') t += ' It is a different quantity from the enrichment score above, which compares the two groups of bulk samples: the two numbers cannot be compared.';
  const s = sum?.sets;
  if (s && n) { const lo = arg(s.lowest), hi = arg(s.highest); t += ` The same regions are lowest or highest for many unrelated sets: \u2018${esc(labs[lo])}\u2019 is the lowest of the ${num(n)} regions for ${num(s.lowest[lo])} of the ${num(s.scored)} scored sets, and \u2018${esc(labs[hi])}\u2019 the highest for ${num(s.highest[hi])}.`; }
  const top = state.view === 'signaling' ? tissue_exports_setTop(d, id, true) : null, cm = top ? sum?.cellTypeMatch?.[top] : null;
  if (cm?.regions?.length) t += ` The brightest region is not always the tissue of the cell type named as highest above: of the ${num(cm.sets)} scored sets that are highest in ${esc(typeNoun(top))} cells, ${num(cm.highestInRegion)} score highest in ${tissue_exports_quoted(labs, cm.regions)}.`;
  return t;
}
/* metabolic pathways: when the tissue of the cell type with the highest estimated activity is the lowest region of the section, say that the two quantities differ */
function tissue_exports_contrast(sec, rec, kind, id) {
  const R = sec?.regions; if (kind !== 'metabolic' || !R?.cellTypes || !rec) return '';
  const top = state.data.pathways.find(x => x.id === id)?.top; if (!top) return '';
  const q = decodeBytes(rec.q), sum = new Array(R.labels.length).fill(0), cnt = new Array(R.labels.length).fill(0);
  for (let i = 0; i < q.length; i++) if (q[i] !== 255) { sum[R.spot[i]] += q[i]; cnt[R.spot[i]]++; }
  let lo = -1; for (let k = 0; k < sum.length; k++) if (cnt[k] && (lo < 0 || sum[k] / cnt[k] < sum[lo] / cnt[lo])) lo = k;
  if (lo < 0 || !(R.cellTypes[lo] || []).includes(top)) return '';
  return `For this pathway the two quantities disagree: the estimated activity is highest in ${typeNoun(top)} cells, but \u2018${R.labels[lo]}\u2019 has the lowest expression of the pathway\u2019s enzyme genes of the ${num(R.labels.length)} regions on this section. The activity is the model\u2019s estimate for a cell type, from the bulk samples; the picture is expression measured in this tissue, relative to all transcripts in each area.`;
}
/* kind: 'set' (signaling and functional gene sets, expression score of the set's genes) or 'metabolic' (KEGG pathways, expression of the enzyme genes) */
function spatialPanel(d, kind, id, label) {
  if (!d.spatialUrl && !d.spatial) return '';
  const what = kind === 'metabolic' ? 'mean expression of the pathway\u2019s enzyme genes' : 'expression score of this set\u2019s genes';
  const head = `<div class="note" style="margin:10px 0 6px"><b style="color:var(--ink-2)">On a tissue section</b> · ${what} across a public PDAC tissue section</div>`;
  const S = d.spatial, st = String(d.lazy.spatial || '');
  if (!S) {
    if (!st.startsWith('error')) ensureLazy('spatial', checkSpatial);
    return `<div class="detail-sub spatial">${head}<p class="note">${st.startsWith('error') ? `The spatial view could not be loaded (${esc(st.replace(/^error: /, ''))}).` : 'Loading the spatial view…'}</p></div>`;
  }
  const ref = (kind === 'metabolic' ? S.metabolic : S.sets)?.[id];
  const sec = S.sections.find(x => x.id === state.spatial.section) || S.sections[0];
  if (ref === undefined || ref === null) return `<div class="detail-sub spatial" data-spatial-missing>${head}<p class="note">No tissue view: ${kind === 'metabolic' ? 'none of this pathway\u2019s enzyme genes are' : 'fewer than 5 of this set\u2019s genes are'} measured on the section.${tissue_exports_probeNote(sec)}</p></div>`;
  /* the region view is kept for the pathway it was opened for and reset when another one is selected */
  if (state.spatial.regions && state.spatial.regionsFor && state.spatial.regionsFor !== `${kind}:${id}`) state.spatial.regions = false;
  const used = S.genesUsed?.[sec.id]?.[id], total = S.genesTotal?.[sec.id]?.[id], low = Number.isFinite(used) && Number.isFinite(total) && used < total / 2;
  const picker = S.sections.length > 1 ? `<div class="toggle-chips" role="group" aria-label="Tissue section" style="margin-bottom:8px">${S.sections.map(x => `<button class="${x.id === sec.id ? 'active' : ''}" data-spsection="${esc(x.id)}" aria-pressed="${x.id === sec.id}">${esc(x.label)}</button>`).join('')}</div>` : '';
  const regions = sec.regions?.labels?.length ? `<button type="button" class="link-btn" data-action="spregions" data-spkind="${kind}" data-spid="${esc(id)}">${state.spatial.regions ? 'Show the score' : 'Show the annotated regions'}</button>` : '';
  return `<div class="detail-sub spatial" id="spatial-${kind}">${head}${picker}
    <div class="spatial-frame" data-spatial-kind="${kind}" data-spatial-id="${esc(id)}" data-spatial-section="${esc(sec.id)}" data-spatial-label="${esc(label)}"><div class="empty">Loading the section…</div></div>
    <div class="spatial-actions"><button type="button" class="link-btn" data-action="spzoom" data-spkind="${kind}" data-spid="${esc(id)}" data-splabel="${esc(label)}">Enlarge</button>${regions}</div>
    ${low ? `<p class="note spatial-warn" data-spatial-coverage>Fewer than half of ${kind === 'metabolic' ? 'the enzyme genes of this pathway' : 'the genes of this set'} are measured on the section (${num(used)} of ${num(total)}). The picture rests on these ${plural(used, 'gene')} and may not represent the whole ${kind === 'metabolic' ? 'pathway' : 'set'}.${tissue_exports_probeNote(sec)}</p>` : ''}
    <p class="note" data-spatial-source>${tissue_exports_source(d, S, sec, kind, id)}</p>
    <p class="note" data-spatial-reading>${tissue_exports_reading(d, S, sec, kind, id)}</p>
    <p class="note" data-spatial-contrast hidden></p>
    <p class="note" data-spatial-caveat>${tissue_exports_caveat(kind)}</p></div>`;
}
function decodeBytes(q) { const s = atob(q), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
const VIRIDIS = ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'];
const VIRIDIS_LUT = Array.from({ length: 255 }, (_, k) => { const t = Math.min(.999, k / 254) * 4, i = Math.floor(t); return mix(VIRIDIS[i], VIRIDIS[i + 1], t - i); });
const REGION_COLORS = ['#b42318', '#f97066', '#ddcc77', '#0072b2', '#56b4e9', '#5f6b76', '#d55e00', '#882255', '#7a5af8', '#12805c', '#f4b8d4', '#101828'];
function spatialSvg(sec, rec, kind, label, W = 360) {
  const n = sec.x.length, q = rec ? decodeBytes(rec.q) : null, pad = 4, reg = state.spatial.regions && sec.regions?.labels?.length ? sec.regions : null;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) { const x = sec.x[i], y = sec.y[i]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  /* each area is drawn as a rectangle of the bin size (or a square of the mean spacing when no size is given) */
  const pitch = Math.sqrt(((x1 - x0) * (y1 - y0)) / Math.max(1, n)) || 1, bwU = sec.binWidthUm || sec.binUm || pitch, bhU = sec.binHeightUm || sec.binUm || pitch;
  const sx = (W - 2 * pad) / ((x1 - x0 + bwU) || 1), Hh = (y1 - y0 + bhU) * sx + 2 * pad, bw = (bwU * sx + .25).toFixed(2), bh = (bhU * sx + .25).toFixed(2);
  /* color limits: 2nd and 98th percentile of the section, so that a few extreme areas do not flatten the scale */
  let b2 = 0, b98 = 254, below = 0, above = 0, qmin = 0, qmax = 254;
  if (q && !reg) {
    const hist = new Array(256).fill(0); let m = 0;
    for (let i = 0; i < n; i++) if (q[i] !== 255) { hist[q[i]]++; m++; }
    let acc = 0, lo = null, hi = null;
    for (let b = 0; b < 255; b++) { acc += hist[b]; if (lo === null && acc >= m * .02) lo = b; if (hi === null && acc >= m * .98) hi = b; }
    if (lo !== null && hi !== null && hi > lo) { b2 = lo; b98 = hi; }
    /* areas beyond the color limits, and the range of the values */
    qmin = Math.max(0, hist.findIndex(h => h > 0)); qmax = 254; while (qmax > 0 && !hist[qmax]) qmax--;
    for (let b = 0; b < 255; b++) { if (b < b2) below += hist[b]; if (b > b98) above += hist[b]; }
  }
  const lut = v => VIRIDIS_LUT[Math.max(0, Math.min(254, Math.round((v - b2) / (b98 - b2) * 254)))];
  const parts = new Array(n);
  for (let i = 0; i < n; i++) {
    const v = q ? q[i] : 255, fill = reg ? REGION_COLORS[reg.spot[i] % REGION_COLORS.length] : v === 255 ? '#e4e7ec' : lut(v);
    parts[i] = `<rect x="${(pad + (sec.x[i] - x0) * sx).toFixed(1)}" y="${(pad + (sec.y[i] - y0) * sx).toFixed(1)}" width="${bw}" height="${bh}" fill="${fill}"/>`;
  }
  const val = b => rec.lo + b / 254 * (rec.hi - rec.lo);
  const bar = reg
    ? `<div class="legend static spatial-regions">${reg.labels.map((l, k) => `<span${reg.description?.[k] ? ` title="${esc(reg.description[k])}"` : ''}><span class="swatch" style="background:${REGION_COLORS[k % REGION_COLORS.length]}"></span>${esc(l)}${reg.count ? ` · ${num(reg.count[k])}` : ''}</span>`).join('')}</div>${reg.note ? `<p class="note spatial-region-note">${esc(reg.note)}</p>` : ''}`
    : `<div class="spatial-scale" role="img" aria-label="Color scale from ${sig(val(b2))}${below ? ' or less' : ''} to ${sig(val(b98))}${above ? ' or more' : ''}"><span>${below ? '\u2264 ' : ''}${sig(val(b2))}</span><i></i><span>${above ? '\u2265 ' : ''}${sig(val(b98))}</span><small>${kind === 'metabolic' ? 'Mean expression of the enzyme genes, log(1 + counts per 10,000)' : 'Score (relative units within the section)'} · color range: 2nd to 98th percentile of the section; areas beyond it have the end colors (values run from ${sig(val(qmin))} to ${sig(val(qmax))})</small></div>`;
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
      const contrast = el.closest('.spatial')?.querySelector('[data-spatial-contrast]');
      if (contrast) { const t = rec && sec ? tissue_exports_contrast(sec, rec, kind, id) : ''; contrast.textContent = t; contrast.hidden = !t; }
    } catch (e) { delete d.spatialChunks[ci]; if (el.isConnected) el.innerHTML = `<div class="empty">The section could not be loaded (${esc(e.message)}).</div>`; }
  }
}
function spatialZoom(kind, id, label) {
  const S = state.data.spatial; if (!S) return;
  const sec = S.sections.find(x => x.id === state.spatial.section) || S.sections[0];
  const what = state.spatial.regions && sec.regions?.labels?.length ? 'annotated regions (the study authors\u2019 spatial domains, grouped and renamed)' : kind === 'metabolic' ? 'mean expression of the pathway\u2019s enzyme genes' : 'expression score of the set\u2019s genes';
  modal(esc(label), `${esc(sec.label)} · ${what}`,
    `<div class="spatial-frame big" data-spatial-kind="${kind}" data-spatial-id="${esc(id)}" data-spatial-section="${esc(sec.id)}" data-spatial-label="${esc(label)}"><div class="empty">Loading the section…</div></div>
    <p class="note" data-spatial-source>${tissue_exports_source(state.data, S, sec, kind, id)}</p><p class="note" data-spatial-caveat>${tissue_exports_caveat(kind)}</p>`, '', true);
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
      <div class="metric"><small>Pathway variation within cell types</small><b>${p(mc.withinShareMedian)}</b><span class="of">median over ${mc.pathwaysCompared ? `the ${num(mc.pathwaysCompared)} pathways that have a map` : 'pathways'} (${p(mc.withinShareMin)}–${p(mc.withinShareMax)})</span></div></div>
      <div style="margin-top:14px"><div class="prose two-col"><p><b>${mc.overlap < 0.1 ? 'No: the two maps are organized differently.' : 'No: the two maps are related but organized differently.'}</b> On average ${p(mc.overlap)} of each profile's ${num(mc.k)} nearest neighbors are the same in both maps${mc.copiesExcluded ? ` (${p(mc.overlapRandom)} expected by chance; profiles that derive from the same reference cell are not counted as neighbors)` : ''}. Gene expression keeps the cell types largely apart${(mc.byType || []).length ? ` (${p(Math.min(...mc.byType.map(r => r.purityExpression)))} to ${p(Math.max(...mc.byType.map(r => r.purityExpression)))} of a profile's neighbors are of its own type, depending on the cell type)` : ''}, which makes the expression map the place to check cell-type assignments. The metabolic map groups cell types that share metabolic programs: the table shows which other types each cell type mixes with.</p>
        <p><b>Why the metabolic map is useful.</b> For most pathways, most of the variation between profiles lies within cell types (median ${p(mc.withinShareMedian)}). The metabolic map arranges this variation into gradients: neighbors in the metabolic map have more similar pathway activity than neighbors in the expression map (median correlation ${sig(mc.autocorrMetabolicMedian)} vs ${sig(mc.autocorrExpressionMedian)}). Profiles of one cell type that sit apart in the metabolic map differ in estimated metabolism.</p>
        <ul class="plain"><li><b>Check cell types</b> in the expression map (Samples, Expression).</li><li><b>Find shared metabolic programs</b>: cell types that overlap in the metabolic map.</li><li><b>Find metabolic heterogeneity</b>: color the metabolic map by metabolic activity, or select a pathway in <a href="#pathways" data-view="pathways">Metabolic pathways</a>.</li></ul>
        <p class="note">Neighborhoods are computed in the full spaces (expression: ${esc(mc.expressionSpace || '')}; metabolic: ${esc(mc.metabolicSpace || '')}), not on the 2-D maps.${mc.layoutNote ? ` ${esc(mc.layoutNote)}` : ''} The metabolic map comes from the same model as the activity values, so their agreement is partly expected by construction.</p></div>
      <div class="table-wrap" style="margin-top:12px"><table class="table compact"><thead><tr><th>Cell type</th><th class="num">Profiles</th><th class="num" title="Share of the 15 nearest neighbors of the same cell type">Same type, expression</th><th class="num">Same type, metabolic</th><th class="num" title="Share of nearest neighbors shared between the two maps">Shared neighbors</th><th>Mixes with, in the metabolic map (≥ 5% of neighbors)</th></tr></thead><tbody>${rows}</tbody></table></div></div></div></section>`;
}
/* Figure 1: the composition finding is written from the comparison data, so that it follows the test that was run */
function tissue_exports_compositionFinding(c, samples) {
  const comp = c?.composition, rows = (comp?.table || []).filter(r => Number.isFinite(r.padj) && Number.isFinite(r.median_test_pct) && Number.isFinite(r.median_reference_pct));
  if (!rows.length) return '';
  const pc = v => `${num(v, 1)}%`, pv = v => (v < 0.001 ? v.toExponential(1) : v < 0.1 ? v.toFixed(3) : v.toFixed(2));
  const list = a => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a.at(-1)}` : a[0] || '');
  const range = a => { const p = a.map(r => r.padj), lo = Math.min(...p), hi = Math.max(...p); return pv(lo) === pv(hi) ? pv(lo) : `${pv(lo)}\u2013${pv(hi)}`; };
  const item = (r, i) => `${typeNoun(r.cell_type)} (${i ? '' : 'median '}${pc(r.median_test_pct)} vs ${pc(r.median_reference_pct)})`;
  const ref = String(c.reference || '').replace(/^[A-Z][a-z]/, m => m.toLowerCase());
  /* patients in whom the test sample has the higher estimated fraction of a cell type */
  const pairs = type => { const by = {}; for (const s of samples || []) { const pt = s.meta?.Patient, g = c.samples?.[s.id], f = comp.fractions?.[s.id]?.[type]; if (pt && g && Number.isFinite(f)) (by[pt] ||= {})[g] = f; } const both = Object.values(by).filter(x => Number.isFinite(x[c.test]) && Number.isFinite(x[c.reference])); return { n: both.length, up: both.filter(x => x[c.test] > x[c.reference]).length }; };
  /* integration: with a paired test (composition.display from the Samples area) the direction is the sign of the median within-patient
     difference, and the difference and the number of patients are stated; otherwise the two group medians are compared */
  const dField = comp.display?.differenceField, paired = !!dField && rows.every(r => Number.isFinite(r[dField]) && Number.isFinite(r.n_pairs));
  const dir = r => (paired ? Math.sign(r[dField]) : Math.sign(r.median_test_pct - r.median_reference_pct));
  const lower = rows.filter(r => r.padj < 0.05 && dir(r) < 0), higher = rows.filter(r => r.padj < 0.05 && dir(r) > 0), rest = rows.filter(r => !(r.padj < 0.05)).sort((a, b) => a.padj - b.padj), out = [];
  const signed = v => (Number(v.toFixed(1)) === 0 ? '0.0' : `${v > 0 ? '+' : '\u2212'}${Math.abs(v).toFixed(1)}`);
  const within = (a, up) => (paired ? `median within-patient difference ${list(a.map(r => signed(r[dField])))} percentage ${a.length > 1 ? 'points' : 'point' + (Math.abs(a[0][dField]) === 1 ? '' : 's')}; ${up ? 'higher' : 'lower'} in ${list(a.map(r => num(up ? r.n_test_higher : r.n_test_lower)))} of ${num(a[0].n_pairs)} patients; ` : '');
  if (lower.length) out.push(`Lower in ${c.test} than in ${ref}${paired ? ' of the same patient' : ''}: ${list(lower.map(item))} cells (${within(lower, false)}adjusted p ${range(lower)}).`);
  if (higher.length) out.push(`Higher in ${c.test}: ${list(higher.map(item))} cells (${within(higher, true)}adjusted p ${range(higher)}).`);
  if (!lower.length && !higher.length) out.push(`No cell type differs between ${c.test} and ${ref} at adjusted p < 0.05.`);
  const st = rows.find(r => r.cell_type === 'stellate');
  if (st) {
    const pr = pairs('stellate'), dirUp = paired ? st[dField] > 0 : st.median_test_pct > st.median_reference_pct, inN = pr.n ? `; ${dirUp ? 'higher' : 'lower'} in ${num(dirUp ? pr.up : pr.n - pr.up)} of ${num(pr.n)} patients` : '';
    out.push(st.padj < 0.05 ? `Stellate cells include cancer-associated fibroblasts here${pr.n && !paired ? ` (${dirUp ? 'higher' : 'lower'} in ${num(dirUp ? pr.up : pr.n - pr.up)} of ${num(pr.n)} patients)` : ''}.`
      : `Stellate cells, which include cancer-associated fibroblasts here, have a ${dirUp ? 'higher' : 'lower'} median in ${c.test} (${pc(st.median_test_pct)} vs ${pc(st.median_reference_pct)}${inN}), but the difference is not significant after adjustment (adjusted p ${pv(st.padj)}).`);
  }
  const others = rest.filter(r => r.cell_type !== 'stellate');
  if (paired && others.length && (lower.length || higher.length)) { const nm = list(others.map(r => typeNoun(r.cell_type))); out.push(`${nm.charAt(0).toUpperCase()}${nm.slice(1)} values show no difference at adjusted p < 0.05 (adjusted p ${range(others)}).`); }
  if (comp.test) out.push(`Test: ${String(comp.test).replace(/\.$/, '')}.${/rank-sum|mann-whitney|unpaired/i.test(comp.test) && !/signed-rank/i.test(comp.test) ? ' This test does not use the pairing of the two samples of each patient.' : ''}`);
  return out.join(' ');
}
function viewFigures() {
  const d = state.data, own = d.figures.length ? d.figures : null, figs = own || DEMO().figures || [];
  const cmp = own ? d.comparison : (DEMO().result?.comparison || d.comparison), smp = own ? d.samples : (DEMO().samples || d.samples);
  const finding = f => (f.findingFrom === 'composition' && tissue_exports_compositionFinding(cmp, smp)) || f.finding;
  const mc = d.mapComparison || (!own ? DEMO().mapComparison : null);
  const note = !own ? `<div class="banner">${icon('info')}<div>These figures describe the PDAC demo. ${d.origin === 'demo' ? 'Its results are in the other views and in its results download.' : 'Your own results are in the other views and in the results download.'}</div></div>` : '';
  return `${pageHead('Figures', 'Figures and how to read them', 'Summary figures of the analysis, each with a guide to reading it, the main finding and its caveat. Select a figure to enlarge it; each is available as PNG and SVG.')}${note}
  ${mapComparisonCard(mc, !!own || d.origin === 'demo')}
  <div class="figure-list">${figs.map((f, i) => `<article class="card figure-card wide"><div class="card-body"><div class="fig-num">Figure ${i + 1}</div><div class="card-title" style="margin:2px 0 12px">${esc(f.title)}</div>
    <div class="figure-row"><div class="figure-img"><img src="${esc(f.png)}" alt="${esc(f.title)}" loading="lazy" data-figure="${i}"><div class="caption">${esc(f.caption)}</div><div class="downloads"><a href="${esc(f.png)}" download>PNG</a><a href="${esc(f.svg)}" download>SVG</a></div></div>
    <div class="figure-notes">${f.howTo ? `<div class="fnote"><h4>How to read it</h4><p>${esc(f.howTo)}</p></div>` : ''}${finding(f) ? `<div class="fnote finding"><h4>What it shows</h4><p>${esc(finding(f))}</p></div>` : ''}${f.caveat ? `<div class="fnote caveat"><h4>Caveat</h4><p>${esc(f.caveat)}</p></div>` : ''}</div></div></div></article>`).join('')}</div>`;
}

/* ---------- About ---------- */
function viewAbout() {
  const d = state.data, demo = DEMO(), lm = literatureMeta(), isDemo = d.origin === 'demo';
  const gn = generalNumbers(d), f = gn.f, n = gn.n, run = isDemo ? demo.run : null, depth = run ? SCHEDULES[run.depth] : null;
  const facts = [...(isDemo && demo.build?.label ? [['Build', `${esc(demo.build.label)}${demo.build.revisionText ? ` · ${esc(demo.build.revisionText)}` : ''}${demo.build.frozen ? ` · data frozen ${esc(demo.build.frozen)}` : ''}`]] : []),
    ...(run ? [['Analysis run', `${esc(run.date)} · ${esc(depth?.label || run.depth)} depth · random seed ${esc(run.seed)}`]] : []),
    ['Samples', num(d.counts.samples)], ['Estimated single-cell profiles', `${num(d.counts.cells)}${f.perSampleText ? ` · ${esc(f.perSampleText)}` : ''}`], ['Cell types', num(d.cellTypes.length)],
    ...(d.metabolic ? [['KEGG pathways scored', `${num(d.pathways.length)}${gn.overviewMaps ? ` · ${num(gn.pathwayMaps)} pathways and ${num(gn.overviewMaps)} KEGG overview maps` : ''}`], ['Metabolic reactions', num(d.counts.reactions)]] : [['Metabolic model', 'Not run']]),
    ...(gn.scored ? [['Gene sets scored', `${num(gn.scored)}${gn.listed && gn.listed !== gn.scored ? ` · ${num(gn.listed)} listed on Cell-type signaling` : ''}`]] : []),
    ...(d.comparison ? [...(gn.s.n_genes_tested ? [['Genes tested between the groups', num(gn.s.n_genes_tested)]] : []), ['Groups compared', esc(generalVs(d.comparison))]] : [])];
  const lsrc = lm?.sources || {};
  const refCells = n.referenceCells ? `: ${num(n.referenceCells)} cells from ${GENERAL_REFERENCE} (${num(n.referenceCellsT2D)} cells)` : `: ${GENERAL_REFERENCE}`;
  const perNote = f.perSampleRange ? `${num(run?.profilesPerSample || f.perSample)} per sample requested${isDemo ? ' in the demo' : ''}; the number per cell type is rounded to whole profiles, which gives ${f.perSampleRange}` : `${f.perSampleAbout || '300 per sample'}${isDemo ? ' in the demo' : ''}`;
  const genesNote = n.sharedGenes && d.counts.genes ? ` Profiles hold expression for the ${num(n.sharedGenes)} genes shared by the bulk counts and the reference; gene-set scores and the gene lookup use them. The metabolic model and the similarity table on the Samples tab use ${num(d.counts.genes)} selected genes${d.counts.metabolicGenes ? `, ${num(d.counts.metabolicGenes)} of them metabolic genes` : ''}.` : '';
  const depthNote = run && depth ? ` The demo was run at ${esc(depth.label)} depth (${num(depth.t1)} training rounds for the profiles and ${num(depth.t2)} for the metabolic model; Standard, recommended for final results, uses ${num(SCHEDULES.standard.t1)} and ${num(SCHEDULES.standard.t2)}) with random seed ${esc(run.seed)}.` : '';
  return `${pageHead('About', 'Cellaris AI Demo', 'Cell-type, metabolic and signaling insight from bulk RNA-seq of pancreatic ductal adenocarcinoma (PDAC) and pancreas.')}
  <div class="steps">
    <div class="step"><div class="n">INPUT</div><h4>Bulk RNA-seq counts</h4><p>Raw integer counts from human pancreas or pancreatic tumor tissue such as PDAC: genes (HGNC symbols) in rows, samples in columns, CSV or TSV, up to 100 samples.</p></div>
    <div class="step"><div class="n">OUTPUT</div><h4>Cell-type composition</h4><p>Estimated share of the nine reference cell types (alpha, beta, delta, PP (gamma), acinar, ductal, endothelial, stellate, immune) in every sample.</p></div>
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
  ${generalNumbersCard(d)}
  <section class="card section"><div class="card-head"><div><div class="card-title">Methods</div><div class="card-sub">How each result is computed</div></div></div>
    <div class="card-body"><div class="grid halves methods">
      <div><h4>Composition and estimated profiles</h4><p id="about-composition">Each bulk sample is described as a mixture of the nine cell types of the built-in human pancreas reference (Baron et al., Cell Systems 2016)${refCells}. The reference is not whole pancreas and contains no tumor tissue. Single-cell profiles are then estimated from each sample in proportion to its composition (${perNote}). The fit of a sample to the reference is called poor when the best mixture of the nine cell types reproduces its expression badly.${genesNote}${depthNote}${isDemo && demo.compositionText?.selection ? ` ${esc(demo.compositionText.selection)}` : ''}</p>
        <h4>Maps</h4><p>${esc(d.origin === 'demo' && DEMO().mapMethod ? DEMO().mapMethod : 'Expression map: UMAP (uniform manifold approximation and projection, a two-dimensional layout that places similar profiles close together) of the first 30 principal components of the 2,000 most variable genes, log(1 + counts per 10,000). Metabolic map: UMAP of the metabolic model\u2019s latent space. Both show the same profiles.')}</p>
        <h4>Metabolic pathways</h4><p>A graph-based model of the KEGG reaction network estimates the activity of ${num(d.counts.reactions || 1225)} metabolic reactions in every profile. A pathway's activity is the mean activity of its reactions, in relative units, averaged per cell type. Pathway maps are drawn from the KEGG reference pathways; each line is a reaction step of the model.</p></div>
      <div><h4>Signaling and functional pathways</h4><p>Gene sets from MSigDB v2026.2.Hs (Hallmark; Reactome release 97; WikiPathways 2026-10-10; GO Biological Process, GO release 2026-07-26) and PROGENy (14 pathways, up to 500 footprint genes each${n.progenyLibraryGenes ? `; ${num(n.progenyLibraryGenes[0])} to ${num(n.progenyLibraryGenes[1])} are in the gene-set library` : ''}) are scored in every estimated profile with a univariate linear model (t-value; decoupler method) on log(1 + counts per 10,000), then averaged per sample and cell type. Top genes are the member genes that contribute most to the score in each cell type.</p>
        <h4>Group comparison</h4><p id="about-comparison">Bulk counts: DESeq2 (PyDESeq2 0.5.4) with the patient as covariate, shrunken fold changes, Benjamini–Hochberg adjustment; fgsea 1.32 multilevel enrichment of the Wald statistics (15–500 genes per set); PROGENy activity by a decoupler 2.2.0 multivariate linear model; estimated composition by group: ${esc(d.comparison?.composition?.test || 'two-sided rank-sum test per cell type, adjusted across cell types')}.</p>
        <h4>Literature support</h4><p id="about-lit-steps">${esc(lm?.name || 'Human pancreas literature')} index ${esc(lm?.version || '')}: ${num(lm?.papers)} ${esc(scopeInfo().noun)} that mention at least one of the ${num(lm?.genes)} enzyme genes of the reaction steps${litScope() === 'cancer' && lm?.papersAllPancreas ? ` (of ${num(lm.papersAllPancreas)} human pancreas papers that do)` : ''}; genes are recognized by PubTator3${lsrc.genePapers ? ` (${esc(lsrc.genePapers)})` : ''}. The papers are matched to the enzymes of each reaction step; curated enzyme evidence from ${esc(lsrc.curated || 'UniProtKB/Swiss-Prot')}.</p>${DEMO().litGenesNote && d.origin === 'demo' ? `<p id="about-lit-genes">${esc(DEMO().litGenesNote)}</p>` : ''}${d.origin === 'demo' ? (DEMO().extraMethods || []).map(m => `<h4>${esc(m.title)}</h4><p data-extra-method="${esc(m.key || '')}">${esc(m.text)}</p>`).join('') : ''}</div>
    </div></div></section>
  ${isDemo && demo.build?.corrections?.length ? `<section class="card section" id="about-corrections"><div class="card-head"><div><div class="card-title">Corrections</div><div class="card-sub">${esc(demo.build.label)}, ${esc(demo.build.revisionText || '')}</div></div></div><div class="card-body prose"><p>This build was ${esc(demo.build.revisionText || 'corrected')} after a review of every tab. What a returning visitor will notice: ${demo.build.corrections.map(esc).join(' ')}</p>${demo.build.updates?.length ? `<p id="build-updates"><b>Display update of ${esc(demo.build.updatedText || demo.build.updated || '')}.</b> ${demo.build.updates.map(esc).join(' ')}</p>` : ''}</div></section>` : ''}
  <section class="card section"><div class="card-head"><div><div class="card-title">Reading the results</div></div></div><div class="card-body prose"><ul>${(demo.limitations || []).map(l => `<li>${esc(l)}</li>`).join('')}</ul></div></section>
  <section class="card section"><div class="card-head"><div><div class="card-title">Data credits</div><div class="card-sub">Public datasets used in this demo</div></div></div>
  <div class="card-body table-wrap"><table class="table"><thead><tr><th>Dataset</th><th>Use</th><th>Accession</th></tr></thead><tbody>${(demo.sources || []).map(s => `<tr><td><b style="font-weight:600">${esc(s.name)}</b><small>${esc(s.citation)}${(s.dois || []).map(x => ` <a href="https://doi.org/${esc(x)}" target="_blank" rel="noopener">doi:${esc(x)}</a>`).join(';')}</small></td><td>${esc(s.role)}</td><td>${(s.links || [{ label: s.accession, url: s.url }]).map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join(', ')}</td></tr>`).join('')}</tbody></table>
  <p class="note">Download: <a href="${publicFile(demo.download || 'downloads/cellaris-demo-pdac-results.zip')}" download>PDAC demo results (CSV tables and figures)</a></p></div></section>
  <section class="card section"><div class="card-head"><div><div class="card-title">Gene-set resources</div><div class="card-sub">Definitions behind the signaling and functional pathways and the pathway enrichment of comparisons</div></div></div>
  <div class="card-body table-wrap"><table class="table"><thead><tr><th>Resource</th><th>Version</th><th>License</th><th>Citation</th></tr></thead><tbody>${GENESET_CREDITS.map(([n, v, l, c, dois]) => `<tr><td><b style="font-weight:600">${esc(n)}</b></td><td>${esc(v)}</td><td>${esc(l)}</td><td>${esc(c)}${[].concat(dois || []).map(x => ` <a href="https://doi.org/${esc(x)}" target="_blank" rel="noopener">doi:${esc(x)}</a>`).join(';')}</td></tr>`).join('')}</tbody></table>
  <p class="note">MSigDB gene sets: © Broad Institute, Inc., Massachusetts Institute of Technology and Regents of the University of California, used under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. PROGENy under the <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener">Apache License 2.0</a>. Changes: gene symbols were matched to the genes of the built-in reference; sets were filtered by size (Hallmark 5–1,000 genes; Reactome, WikiPathways and GO Biological Process 10–500 genes); PROGENy was limited to at most the 500 top-weighted genes per pathway. Results downloads list the licenses and attributions and include the Apache License 2.0 in full. No endorsement by the source projects is implied.</p></div></section>
  <section class="card section" id="about-software"><div class="card-head"><div><div class="card-title">Methods and software cited</div><div class="card-sub">Published methods named in the Methods section</div></div></div>
  <div class="card-body table-wrap"><table class="table"><thead><tr><th>Method or software</th><th>Version</th><th>Use</th><th>Citation</th></tr></thead><tbody>${GENERAL_SOFTWARE.map(([name, v, use, cite, link]) => `<tr><td><b style="font-weight:600">${esc(name)}</b></td><td>${esc(v)}</td><td>${esc(use)}</td><td>${esc(cite)} <a href="${esc(link.startsWith('10.') ? `https://doi.org/${link}` : link)}" target="_blank" rel="noopener">${esc(link.startsWith('10.') ? `doi:${link}` : link.replace('https://arxiv.org/abs/', 'arXiv:'))}</a></td></tr>`).join('')}</tbody></table></div></section>
  <section class="card section"><div class="card-head"><div><div class="card-title">Data handling</div></div></div>
    <div class="card-body prose"><p>The website checks the file format in your browser and sends the count matrix only to the Cellaris compute workspace you connect. The website stores no uploaded data; it remembers the address of your workspace in this browser. Download your results before the workspace's retention period ends.</p></div></section>`;
}
/* Published methods named in About > Methods (README.md lists the same rows). */
const GENERAL_SOFTWARE = [
  ['DESeq2 (method)', '—', 'Model and test of the bulk comparison', 'Love et al., Genome Biology 2014', '10.1186/s13059-014-0550-8'],
  ['PyDESeq2', '0.5.4', 'Software that runs the bulk comparison', 'Muzellec et al., Bioinformatics 2023', '10.1093/bioinformatics/btad547'],
  ['fgsea', '1.32 (Bioconductor 3.20)', 'Pathway enrichment of the bulk comparison', 'Korotkevich et al., bioRxiv', '10.1101/060012'],
  ['UMAP', '—', 'Layout of the expression map and the metabolic map', 'McInnes, Healy and Melville 2018', 'https://arxiv.org/abs/1802.03426'],
];
const GENESET_CREDITS = [
  ['Molecular Signatures Database (MSigDB)', 'v2026.2.Hs', 'CC BY 4.0', 'Liberzon et al., Bioinformatics 2011', '10.1093/bioinformatics/btr260'],
  ['MSigDB Hallmark gene sets', 'v2026.2.Hs', 'CC BY 4.0', 'Liberzon et al., Cell Systems 2015', '10.1016/j.cels.2015.12.004'],
  ['Reactome pathways (MSigDB C2:CP:Reactome)', 'Reactome release 97', 'CC0 1.0 (Reactome); CC BY 4.0 (MSigDB)', 'Milacic et al., Nucleic Acids Research 2024', '10.1093/nar/gkad1025'],
  ['WikiPathways (MSigDB C2:CP:WikiPathways)', 'Release 2026-10-10', 'CC0 1.0 (WikiPathways); CC BY 4.0 (MSigDB)', 'Agrawal et al., Nucleic Acids Research 2024', '10.1093/nar/gkad960'],
  ['Gene Ontology, Biological Process (MSigDB C5:GO:BP)', 'GO release 2026-07-26', 'CC BY 4.0', 'Ashburner et al., Nature Genetics 2000; The Gene Ontology Consortium, Genetics 2023. GO data archive (concept DOI; no version DOI is listed for the 2026-07-26 release):', ['10.1038/75556', '10.1093/genetics/iyad031', '10.5281/zenodo.1205166']],
  ['PROGENy pathway-responsive genes', 'model_human_full, up to 500 genes per pathway', 'Apache-2.0', 'Schubert et al., Nature Communications 2018', '10.1038/s41467-017-02391-6'],
  ['decoupler (scoring method)', '2.2.0', 'Software; not redistributed', 'Badia-i-Mompel et al., Bioinformatics Advances 2022', '10.1093/bioadv/vbac016'],
  ['Cell-type ranking labels across databases, computed from public human islet single-cell RNA-seq data', 'Gene-set library 1.0.0', 'ArrayExpress and GEO public data; GSE85241 cell-type labels CC BY 4.0', 'Segerstolpe et al., Cell Metabolism 2016 (E-MTAB-5061); Muraro et al., Cell Systems 2016 (GSE85241; cell-type labels from Abdelaal et al. 2019); Lawlor et al., Genome Research 2017 (GSE86469):', ['10.1016/j.cmet.2016.08.020', '10.1016/j.cels.2016.09.002', '10.5281/zenodo.3357167', '10.1101/gr.212720.116']],
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
  return `<div class="ref-card">${icon('database')}<div><b>Human pancreas reference</b><small>9 cell types from islet preparations of four donors, one with type 2 diabetes · applied automatically · tumor cells are attributed to the nearest types</small></div></div>`;
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
        <label class="field">Random seed<input class="input" id="random-seed" type="number" min="0" max="2147483647" value="8"><small>Same seed and data give the same composition and profiles; the metabolic model varies slightly between runs</small></label>
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
/* Pancreas markers looked for in an uploaded matrix, and gene names that a spreadsheet has turned into dates (1-Mar, Sep-2). */
const GENERAL_MARKERS = ['INS', 'GCG', 'SST', 'PPY', 'PRSS1', 'KRT19', 'PECAM1', 'COL1A1'];
const GENERAL_DATE_NAME = /^(\d{1,2}-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-\d{1,2})$/i;
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
  const markers = GENERAL_MARKERS.filter(g => genes.has(g)), dateLike = [...genes].filter(g => GENERAL_DATE_NAME.test(g));
  return { genes: genes.size, ensembl, dateLike, samples: header.slice(1), markers, medianDepth: sums.slice().sort((a, b) => a - b)[sums.length >> 1] };
}
async function handleBulk(file) {
  if (!file) return;
  const err = $('#analysis-error'), ok = $('#bulk-summary'); err.classList.add('hidden'); ok.classList.add('hidden');
  try {
    state.bulkInfo = await validateBulk(file); state.bulk = file; state.groups = {};
    const z = $('#bulk-zone'); z.classList.add('loaded'); $('b', z).textContent = file.name;
    $('small', z).textContent = `${num(state.bulkInfo.genes)} genes · ${state.bulkInfo.samples.length} samples · median library ${num(state.bulkInfo.medianDepth)} counts`;
    ok.textContent = `Format check passed. Pancreatic markers found: ${state.bulkInfo.markers.join(', ') || `none of ${GENERAL_MARKERS.join(', ')} (check gene symbols)`}.${state.bulkInfo.ensembl ? ` ${num(state.bulkInfo.ensembl)} rows with Ensembl gene IDs will be ignored; only rows with HGNC gene symbols are analyzed.` : ''}${state.bulkInfo.dateLike.length ? ` ${plural(state.bulkInfo.dateLike.length, 'gene name looks', 'gene names look')} like a date (for example ${state.bulkInfo.dateLike[0]}): a spreadsheet has probably changed gene symbols such as MARCH1 or SEPT2. Restore the symbols before you run the analysis.` : ''}`;
    ok.classList.toggle('warn', state.bulkInfo.ensembl > 0 || state.bulkInfo.dateLike.length > 0); ok.classList.remove('hidden'); renderGroupAssign(); updateEstimate();
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
  if (!['localhost', '127.0.0.1'].includes(location.hostname)) return '';   /* public site: no development address */
  return location.port ? location.origin : '';   /* no default on the public site */
}
async function connectWorker() {
  const status = $('#connection-status'), button = $('#test-worker');
  button.disabled = true; status.className = 'alert ok'; status.textContent = 'Connecting…';
  try {
    let u; try { u = new URL($('#worker-url').value.trim()); } catch (e) { throw new Error('Enter a valid workspace URL, for example https://workspace.example.com.'); }
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
      <button class="btn btn-secondary" data-action="exportgenesets" ${d.genesets || d.genesetsUrl ? '' : 'disabled'}>${icon('download')} Signaling and functional pathway activity, all ${d.genesets ? `${num(Object.values(d.genesets.collections).reduce((a, k) => a + k.sets.length, 0))} ` : ''}gene sets (CSV)</button>
      <button class="btn btn-secondary" data-action="exportgenes" ${Object.keys(d.geneExpression).length ? '' : 'disabled'}>${icon('download')} Marker genes (CSV)</button>
      <button class="btn btn-secondary" data-action="exportde" ${d.comparison ? '' : 'disabled'}>${icon('download')} Comparison: differential expression${tissue_exports_count(tissue_exports_part('de'))} (CSV)</button>
      <button class="btn btn-secondary" data-action="exportenrich" ${d.comparison ? '' : 'disabled'}>${icon('download')} Comparison: pathway enrichment${tissue_exports_count(tissue_exports_part('enrich'))} (CSV)</button>
      ${d.origin === 'demo' ? `<a class="btn btn-secondary" href="${publicFile(d.download || 'downloads/cellaris-demo-pdac-results.zip')}" download>${icon('download')} PDAC demo results (ZIP)</a>` : ''}
      <button class="btn btn-secondary" data-action="downloadjob" ${canJob ? '' : 'disabled'}>${icon('download')} Full analysis results (ZIP)</button>
    </div>${tissue_exports_part('de').partial || tissue_exports_part('enrich').partial ? '<p class="note" data-export-partial>Tables marked \u201cx of y\u201d hold the rows listed on the site: for differential expression the genes with the smallest adjusted p, for pathway enrichment the sets with the smallest p in each database. The file name carries the same two numbers. The complete tables are in the results download (ZIP).</p>' : ''}${canJob ? '' : '<p class="note">Full results are available for analyses run in this session.</p>'}`);
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
  const info = d.origin === 'demo' ? (DEMO().pathwayInfo || {}) : {};
  /* enzyme_genes: the genes the metabolic model attaches to the pathway's reactions (the list of the detail card), not KEGG's human gene list */
  const rows = [['pathway_id', 'pathway', 'category', 'kegg_class', 'reactions', 'mean_activity_all_profiles', 'highest_activity_in', ...d.cellTypes.map(t => `activity_${csvType(t.name)}`), 'enzyme_genes_n', 'enzyme_genes'],
    ...d.pathways.map(p => [p.id, p.name, p.category, info[p.id]?.keggClass || '', p.reactionCount, p.score, csvType(p.top), ...p.activity, (p.genes || []).length, (p.genes || []).join(';')])];
  download('cellaris-pathway-activity.csv', rows.map(r => r.map(csvCell).join(',')).join('\n'));
}
function exportComposition() {
  const d = state.data, types = d.cellTypes.map(t => t.name);
  const metaKeys = [...new Set(d.samples.flatMap(s => Object.keys(s.meta)))];
  /* fractions of 1 (the tables show percent); three decimals, so a row sums to 1 within rounding */
  const rows = [['sample', ...metaKeys, ...types.map(t => `fraction_${csvType(t)}`), 'estimated_profiles'], ...d.samples.map(s => [s.id, ...metaKeys.map(k => s.meta[k]), ...types.map(t => s.fractions[t]), s.profiles])];
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
  const el = e.target.closest('[data-view],[data-action],[data-pathway],[data-type],[data-color],[data-gene],[data-figure],[data-src],[data-gscol],[data-gs],[data-gstype],[data-littype],[data-cmpcol],[data-cmpgene],[data-cmpset],[data-cmpprogeny],[data-sort-table],[data-sample-pick],[data-space],[data-mapgroup],[data-heat-all],[data-heat-scale],[data-litfilter],[data-litrow],[data-ovgene],[data-ovset],[data-gsjump],[data-lookup],[data-compview],[data-healthyview],[data-focustype],[data-spsection],.modal-close,.menu-btn,.overlay');
  if (!el) return;
  if (el.classList.contains('overlay')) { if (e.target === el) closeModal(); return; }
  if (el.classList.contains('modal-close')) { closeModal(); return; }
  if (el.classList.contains('menu-btn')) { generalMenuState($('#sidebar').classList.toggle('open')); return; }
  const ds = el.dataset;
  if (ds.view) { e.preventDefault(); $('#modal-root').innerHTML = ''; setView(ds.view); return; }
  if (ds.sortTable) { const th = el.closest('th'); toggleSort(ds.sortTable, ds.sortKey, th?.classList.contains('asc') ? 1 : th?.classList.contains('desc') ? -1 : 0); if (ds.sortTable === 'lit') rerenderLiterature(); else rerender(); return; }
  if (ds.pathway) { state.pathway = ds.pathway; state.lit.conn = null; if (state.view === 'pathways') rerender(); else setView('pathways'); return; }
  if (ds.samplePick) { state.selSample = ds.samplePick; rerender(); return; }
  if (ds.space) { state.mapSpace = ds.space; if (ds.space === 'metabolic' && state.group === HEALTHY) state.group = 'all'; rerender(); return; }
  if (ds.ovgene) { state.cmp.gene = ds.ovgene; state.cmp.geneSearch = ''; setView('genes'); return; }
  if (ds.ovset) { if (ds.ovcol) state.cmp.collection = ds.ovcol; state.cmp.set = ds.ovset; state.cmp.setSearch = ''; setView('compare'); return; }
  if (ds.gsjump) { if (ds.gscolj) state.gs.on.add(ds.gscolj); state.gs.set = ds.gsjump; state.gs.search = ''; setView('signaling'); return; }
  if (ds.lookup) { state.lookup.gene = ds.lookup; state.lookup.q = ds.lookup; state.lookup.all = false; rerender(); return; }
  if (ds.compview) { state.compView = ds.compview; rerender(); return; }
  if (ds.healthyview) { state.healthyView = ds.healthyview; rerender(); return; }
  if (ds.focustype) { const all = state.data.cellTypes.map(t => t.name), only = all.filter(t => !state.hidden.has(t)); state.hidden = only.length === 1 && only[0] === ds.focustype ? new Set() : new Set(all.filter(t => t !== ds.focustype)); rerender(); const mc = $('#map-card'); if (mc && mc.scrollIntoView) mc.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
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
  if (ds.cmpprogeny) { state.cmp.progeny = state.cmp.progeny === ds.cmpprogeny ? null : ds.cmpprogeny; rerender(); return; }
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
    case 'spregions': state.spatial.regions = !state.spatial.regions; state.spatial.regionsFor = ds.spkind ? `${ds.spkind}:${ds.spid}` : null; rerender(); break;
    case 'downloadjob': downloadJob('results'); break;
    case 'hidejob': closeModal(); break;
    case 'resumejob': if (state.job && state.worker.ready) { state.job.pollingError = null; state.polling = true; jobModal(); pollJob(); } break;
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'sample-select') { state.sample = e.target.value; drawEmbedding(); samplesUpdateMapCount(); }
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
    const id = e.target.id, pos = e.target.selectionStart; live(id === 'lookup-input' ? e.target.value : generalFilterText(id, e.target.value)); rerender();
    const input = $(`#${id}`); if (input) { input.focus(); input.setSelectionRange(pos, pos); }
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('.overlay')) closeModal();
  if (e.key === 'Enter' && e.target.matches?.('tr.clickable')) e.target.click();
  /* Enter keeps the gene on screen; it takes the first suggestion only while nothing else is shown (no panel, no choice to make, no message) */
  if (e.key === 'Enter' && e.target.id === 'lookup-input') { const b = !$('#lookup-panel') && !$('#lookup-ambiguous') && !$('#lookup-none') && $('#lookup-matches button'); if (b) b.click(); }
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
  setView(generalViewOfHash(location.hash) || 'overview');
  window.addEventListener('hashchange', generalFollowAddress); window.addEventListener('popstate', generalFollowAddress);
}
init();
