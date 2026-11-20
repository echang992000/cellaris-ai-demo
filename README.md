# Cellaris AI Demo

Interactive demonstration of Cellaris cell-type, metabolic and pathway profiling for pancreatic ductal
adenocarcinoma (PDAC).

**Live site:** https://echang992000.github.io/cellaris-ai-demo/

Cellaris estimates cell-type composition, single-cell expression profiles, metabolic activity and
signaling pathway activity of individual cell types from bulk RNA-seq of human pancreas or pancreatic
tumor tissue, and compares groups of samples. The site presents one completed analysis of public data:
12 pancreatic ductal adenocarcinomas and 12 adjacent pancreas samples from the same patients (CPTAC-3).
Cell-type results summarize all 24 samples; tumor and adjacent samples are compared on the bulk data.
Analyses of your own data run in a Cellaris workspace; contact Cellaris for a workspace URL and access token.

## What the demo shows

November 2026 build, corrected 20 November 2026 (the corrections are listed in About). The data are frozen for this build (2026-11-19): 24 CPTAC-3 bulk samples, the built-in
reference of nine cell types and the analysis run of 2026-11-09 (Quick depth, random seed 8).
<!-- data: demo-data.js build.label, build.revisionText, build.frozen, run.date, run.depth, run.seed -->

The built-in reference (Baron et al., Cell Systems 2016) consists of 8,538 cells from islet preparations of
four organ donors, one of whom had type 2 diabetes (1,301 cells). It is not whole pancreas and contains no tumor
tissue; the site calls it the healthy reference.
<!-- data: demo-data.js siteNumbers.referenceCells, siteNumbers.referenceDonors, siteNumbers.referenceCellsT2D -->

The metabolic map and its neighbor statistics come from a repeat run of the same analysis on 2026-11-16 (same
data, settings and random seed). Composition, estimated profiles and expression were identical in the repeat
run. The metabolic model is not exactly repeatable: pathway activity per profile correlates 0.97 between the
two runs and 79 of 83 pathways keep the same highest cell type. Pathway activity values on the site come from
the run of 2026-11-09.
<!-- data: demo-data.js run.repeat.date, run.repeat.activityCorrelation, run.repeat.sameTopCellType, run.repeat.pathways -->

- **Overview**: a summary of the analysis. Gene lookup by symbol, common name or former symbol for the
  20,221 genes tested in the bulk comparison: result of the bulk comparison, estimated expression by
  cell type, the gene sets and metabolic pathways that contain the gene, the cell types that express it
  in public single-cell data from pancreatic tumors, and its literature support. Below it the genes
  that differ most between PDAC and adjacent pancreas, the pathways that differ most, the composition
  by group, the themes found in more than one gene-set database, and links to every other tab
- **Samples**: the map of the estimated single-cell profiles, by gene expression (shown first) or by
  metabolic activity, with a filter for all samples, PDAC, adjacent pancreas or the healthy reference
  cells, next to the composition by group with its test; the composition of each sample; each sample's
  patient, stage, grade, sex and age (sortable) and its fit to the reference (adequate or poor). Each
  layout is fitted to one averaged profile per distinct reference cell, so profiles that derive from
  the same reference cell do not form separate islands
- **Healthy pancreas for orientation** (Samples): 2,000 of the 8,538 healthy reference cells on the
  expression map; a description, per cell type, of how close the estimated profiles are to these cells
  (the profiles are generated from the same cells, so part of the similarity is built in; no test is
  run); and the 24 bulk samples next to healthy pancreas samples of GTEx on marker genes, with a
  view on all genes that states that it mainly separates the two data sources
- **Gene expression**: marker gene expression by cell type with bulk expression by group, and the
  differential expression between PDAC and adjacent pancreas with a volcano plot (every tested gene
  shows its mean normalized count and per-sample expression when selected)
- **Bulk signaling** (PDAC vs adjacent pancreas on the bulk data): pathway enrichment, signaling
  pathway activity (PROGENy) and the themes found in more than one gene-set database
- **Cell-type signaling**: activity of MSigDB Hallmark, PROGENy, Reactome, WikiPathways and GO Biological
  Process gene sets in each cell type and sample, with the database and version of every set, the
  scoring method, the top genes in each cell type and the agreement of the cell-type ranking across databases
  (public islet data). A highest cell type is named only when it is clear. For a
  chosen gene set and cell type: the member genes that contribute most to the score in that cell type
  with their expression relative to the other cell types, and the signaling pathway activity (PROGENy)
  of that cell type
- **Metabolic pathways**: activity of 75 KEGG pathways and 8 KEGG overview maps by cell type (the overview
  maps repeat reactions of the other pathways and have no map): a heatmap grouped by KEGG category that outlines the pathway and cell
  type under the pointer and keeps the selected ones outlined, a description of each pathway, and
  interactive pathway maps
- **Tissue section views** (in the panels of Bulk signaling, Cell-type signaling and Metabolic
  pathways): the selected gene set or pathway drawn on one public tissue section of a human PDAC, with
  the annotated tissue regions. The section comes from a different patient than the 24 bulk samples and
  is shown as an example. For metabolic pathways the view shows the expression of the enzyme genes, not
  the activity estimated by the metabolic model
- Literature support for every reaction step on a pathway map: human pancreatic tumor papers that mention its
  enzymes, papers that also mention the most specific cell type, curated enzyme evidence, recent paper titles and
  candidate hypotheses (predicted; no report found in PubMed)
- Literature support for genes, gene sets and cell types, with the same definitions as for the reaction
  steps and a short guide to reading the counts: for the selected gene (gene lookup and Gene
  expression), the number of human pancreatic tumor papers that mention it, the papers that also mention each cell
  type against the number expected, and recent paper titles; for the selected gene set (Cell-type
  signaling), the same counts on all member genes together and on the genes that drive the score in
  the chosen cell type; for each cell type (Gene expression), the genes discussed with it more often
  than expected. Literature counts are mentions and co-mentions; they show how much a gene has been studied,
  not that a paper is about the gene. Pancreatic tumor papers are PDAC and all other tumors of the pancreas
- Figures with reading guides, and downloadable result tables
- **About**: methods, a table of every count used on the site with its definition, how to read the
  results, data credits and data handling

## Numbers used on the site

Each count has one definition. The About tab shows the same table, computed from the data files.
<!-- data: every value below is recomputed by tests/audit_fixes/general.cjs from the files named in the last column -->

| Number | Value | What it counts | Data field |
| --- | --- | --- | --- |
| Estimated single-cell profiles | 7,198 | All 24 samples. 300 are requested per sample; the number per cell type is rounded to whole profiles, so a sample has 298 to 302 | demo-data.js `samples[].profiles` |
| Gene sets scored | 7,053 | Gene sets of the five databases scored in the estimated profiles | `siteNumbers.geneSetsScored` (pdac-genesets.json `scorableSets`) |
| Gene sets listed | 3,740 | The scored sets as listed on Cell-type signaling: the 4,720 GO Biological Process terms are grouped into 1,407 themes | `siteNumbers.geneSetsListed` (`shownSets`) |
| Gene sets tested between the groups | 5,357 | Sets with 15 to 500 genes among the tested genes, in 4 databases | `result.comparison.pathways.collections[].tested` |
| Gene sets in the gene lookup | 3,997 | The 3,740 listed sets and 257 GO Biological Process sets that appear only in the bulk comparison | `siteNumbers.geneSetsLookup` (pdac-gene-lookup.json `sets`) |
| Gene sets on the tissue section | 3,995 | Sets of the gene lookup with at least 5 member genes measured on the section | `siteNumbers.geneSetsSection` (pdac-spatial.json `sets`) |
| Genes tested | 20,221 | Genes that passed the expression filter of the bulk comparison | `result.comparison.de.summary.n_genes_tested` |
| Genes with adjusted p < 0.05 | 4,560 | 2,224 higher and 2,336 lower in PDAC, at any fold change | `summary.n_sig`, `n_sig_up`, `n_sig_down` |
| Genes with a call | 1,420 | Adjusted p < 0.05 and a shrunken change of at least 2-fold: 716 higher and 704 lower in PDAC | `summary.n_display_up`, `n_display_down` |
| Genes in the estimated profiles | 19,949 | Genes shared by the bulk counts and the reference; the metabolic model uses 3,168 selected genes | `siteNumbers.sharedGenes`, `result.counts.genes` |
| Papers for reaction steps | 8,933 | Human pancreatic tumor papers that mention at least one of the 1,294 enzyme genes (24,611 human pancreas papers do) | `literatureMeta.papers`, `genes`, `papersAllPancreas` |
| Papers for genes, gene sets and cell types | 35,035 | Human pancreatic tumor papers that mention any human gene (13,742 genes; 108,451 human pancreas papers do) | `siteNumbers.litGenePapers`, `litGenes`, `litGenePapersAllPancreas` |
| Reference cells | 8,538 | Cells of the built-in reference; 2,000 are drawn on the map | `siteNumbers.referenceCells`, `referenceCellsShown` |
| Healthy pancreas samples (GTEx) | 362 | GTEx pancreas samples; 60 are drawn, averages use all | `siteNumbers.gtexSamples`, `gtexShown` |
| Tissue-section areas | 3,470 | Capture spots of one tissue section merged 2 x 2, 0.20 x 0.17 mm each | `siteNumbers.sectionAreas`, `sectionAreaSizeMm` |
| KEGG pathways scored | 83 | 75 pathways with a map and 8 KEGG overview maps | `result.pathways` |

## Methods named on the site

Signaling and functional pathways: univariate linear model scores (decoupler method; Badia-i-Mompel
et al., Bioinformatics Advances 2022) of the gene sets listed below on the estimated profiles.
Group comparison: PyDESeq2 0.5.4 (patient + group), fgsea 1.32 multilevel enrichment of the Wald statistics,
PROGENy activity with decoupler 2.2.0, and a paired test of the estimated composition by group:
two-sided Wilcoxon signed-rank test on the 12 within-patient differences (PDAC minus adjacent pancreas of the same patient) per cell type; Benjamini–Hochberg across the nine types.
<!-- data: the line above is demo-data.js result.comparison.composition.test -->
Gene lookup: names and former symbols from the HGNC gene nomenclature; a name used for more than one gene
is offered as a choice. Cell types in tumors: mean expression (counts per 10,000) by annotated cell type
in three public single-cell datasets of pancreatic tumors of other patients, averaged over the datasets
with at least 50 cells of the type; available for 15,304 of the tested genes.
<!-- data: demo-data.js siteNumbers.tumorGenes -->
Tissue section views: capture spots merged 2 x 2 into 3,470 areas of 0.20 x 0.17 mm; gene sets scored in
each area with the same definition as for the estimated profiles (3,995 of the 3,997 gene sets of the gene
lookup; the two others have fewer than 5 member genes measured on the section); metabolic pathways shown as
the mean expression of their enzyme genes.
Regions are the study authors' annotation of the tissue, grouped and renamed: four fibroblast domains are shown as Fibrous stroma and three acinar domains as Acinar tissue. The metabolic view shows expression relative to all transcripts in each area: in acinar tissue the ten most abundant transcripts take 59% of all counts (5% to 26% in the other regions), so acinar tissue is the lowest region for 77 of the 83 pathways.
<!-- data: the sentence above is the end of demo-data.js extraMethods (spatial) -->
Healthy pancreas: reference cells placed on the expression map with the map's fitted steps; GTEx and
CPTAC counts normalized together (median of ratios, log2). The two projects differ in tissue collection,
sequencing library and software, so the all-gene comparison mainly separates the data sources; the
marker-gene view uses 176 marker genes of acinar, ductal, islet and stromal cells.

| Method or software | Version | Use | Citation |
| --- | --- | --- | --- |
| DESeq2 (method) | — | Model and test of the bulk comparison | Love et al., Genome Biology 2014 (doi:10.1186/s13059-014-0550-8) |
| PyDESeq2 | 0.5.4 | Software that runs the bulk comparison | Muzellec et al., Bioinformatics 2023 (doi:10.1093/bioinformatics/btad547) |
| fgsea | 1.32 (Bioconductor 3.20) | Pathway enrichment of the bulk comparison | Korotkevich et al., bioRxiv (doi:10.1101/060012) |
| UMAP | — | Layout of the expression map and the metabolic map | McInnes, Healy and Melville 2018 (https://arxiv.org/abs/1802.03426) |

## Data credits

| Use | Source |
| --- | --- |
| PDAC demo dataset | Data generated by the National Cancer Institute Clinical Proteomic Tumor Analysis Consortium (CPTAC); CPTAC-3 open-access gene counts from the NCI Genomic Data Commons, data release 46.0 (Heath et al., Nature Genetics 2021, doi:10.1038/s41588-021-00791-5); Cao et al., Cell 2021 (doi:10.1016/j.cell.2021.08.023) |
| Cell-type definitions (built-in reference) | Baron et al., Cell Systems 2016 (doi:10.1016/j.cels.2016.08.011); GEO GSE84133 |
| Metabolic pathway definitions | KEGG pathway database; Kanehisa et al., Nucleic Acids Research 2025 (doi:10.1093/nar/gkae909) |
| Literature | PubMed (National Library of Medicine); PubTator3 gene annotations (gene2pubtator3 file of 2026-11-17), Wei et al., Nucleic Acids Research 2024 (doi:10.1093/nar/gkae235); UniProtKB/Swiss-Prot release 2026_03, The UniProt Consortium, Nucleic Acids Research 2025 (doi:10.1093/nar/gkae1010), CC BY 4.0 |
| Gene names (gene lookup) | HUGO Gene Nomenclature Committee (HGNC), genenames.org; complete gene set, records last modified 2026-10-23 |
| Cell types in tumors | Hwang et al., Nature Genetics 2022 (doi:10.1038/s41588-022-01134-8; GEO GSE202051); Werba et al., Nature Communications 2023 (doi:10.1038/s41467-023-36296-4; GEO GSE205013); Chen et al., Journal of Translational Medicine 2023 (doi:10.1186/s12967-023-04051-4; GEO GSE212966) |
| Tissue section | Elhossiny AM, Kadiyala P, Okoye JO, et al. Asynchronous evolution of epithelium and stroma differentiates precursor lesions from pancreatic cancer. Cancer Discovery 2026 (doi:10.1158/2159-8290.CD-25-2001). Data: Elhossiny AM, Pasca di Magliano M. Visium Spatial Transcriptomics Samples, Zenodo 2026 (doi:10.5281/zenodo.19304282); region annotations: Processed Data Objects, Zenodo 2026 (doi:10.5281/zenodo.19305449). Data records under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes: capture spots merged 2 x 2 (counts summed) and scored by Cellaris; region labels are the authors' spatial domains, grouped and renamed. No endorsement by the authors is implied |
| Healthy pancreas bulk RNA-seq | GTEx Analysis V11, pancreas, 362 samples (open-access gene read counts). The data used for the analyses described here were obtained from the GTEx Portal on 2026-11-19. The Genotype-Tissue Expression (GTEx) Project was supported by the Common Fund of the Office of the Director of the National Institutes of Health, and by NCI, NHGRI, NHLBI, NIDA, NIMH, and NINDS |

### Gene-set resources

| Resource | Version | License | Citation |
| --- | --- | --- | --- |
| Molecular Signatures Database (MSigDB) | v2026.2.Hs | CC BY 4.0 | Liberzon et al., Bioinformatics 2011 (doi:10.1093/bioinformatics/btr260) |
| MSigDB Hallmark gene sets | v2026.2.Hs | CC BY 4.0 | Liberzon et al., Cell Systems 2015 (doi:10.1016/j.cels.2015.12.004) |
| Reactome (MSigDB C2:CP:Reactome) | Reactome release 97 | CC0 1.0 (Reactome); CC BY 4.0 (MSigDB) | Milacic et al., Nucleic Acids Research 2024 (doi:10.1093/nar/gkad1025) |
| WikiPathways (MSigDB C2:CP:WikiPathways) | release 2026-10-10 | CC0 1.0 (WikiPathways); CC BY 4.0 (MSigDB) | Agrawal et al., Nucleic Acids Research 2024 (doi:10.1093/nar/gkad960) |
| Gene Ontology, Biological Process (MSigDB C5:GO:BP) | GO release 2026-07-26 | CC BY 4.0 | Ashburner et al., Nature Genetics 2000 (doi:10.1038/75556); The Gene Ontology Consortium, Genetics 2023 (doi:10.1093/genetics/iyad031); GO data archive, concept DOI 10.5281/zenodo.1205166 (no version DOI is listed for the 2026-07-26 release) |
| PROGENy pathway-responsive genes | model_human_full, up to 500 genes per pathway (334 to 499 in the gene-set library) | Apache-2.0 | Schubert et al., Nature Communications 2018 (doi:10.1038/s41467-017-02391-6) |
| decoupler (scoring method) | 2.2.0 | software, not redistributed | Badia-i-Mompel et al., Bioinformatics Advances 2022 (doi:10.1093/bioadv/vbac016) |
| Cell-type ranking labels across databases, computed from public human islet single-cell RNA-seq data | Gene-set library 1.0.0 | ArrayExpress and GEO public data; GSE85241 cell-type labels CC BY 4.0 | Segerstolpe et al., Cell Metabolism 2016 (E-MTAB-5061; doi:10.1016/j.cmet.2016.08.020); Muraro et al., Cell Systems 2016 (GSE85241; doi:10.1016/j.cels.2016.09.002; cell-type labels from Abdelaal et al. 2019, doi:10.5281/zenodo.3357167); Lawlor et al., Genome Research 2017 (GSE86469; doi:10.1101/gr.212720.116) |

MSigDB gene sets: © Broad Institute, Inc., Massachusetts Institute of Technology and Regents of the
University of California, used under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
PROGENy under the Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0). Changes: gene
symbols were matched to the genes of the built-in reference; sets were filtered by size (Hallmark
5–1,000 genes; Reactome, WikiPathways and GO Biological Process 10–500 genes); PROGENy was limited to
at most the 500 top-weighted genes per pathway. Results downloads list the licenses and attributions and include
the Apache License 2.0 in full. No endorsement by the source projects is implied.

For research use only. Not for diagnostic use.

This repository contains the static website (`dist/`), deployed with GitHub Pages.
