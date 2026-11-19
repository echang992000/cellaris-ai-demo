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

November 2026 build. The data are frozen for this build: 24 CPTAC-3 bulk samples, the healthy pancreas
reference of nine cell types and the analysis run of 2026-11-09.

- **Overview**: a summary of the analysis. Gene lookup by symbol, common name or former symbol for the
  20,221 genes tested in the bulk comparison: result of the bulk comparison, estimated expression by
  cell type, the gene sets and metabolic pathways that contain the gene, the cell types that express it
  in public single-cell data from pancreatic tumors, and its literature support. Below it the genes
  that differ most between PDAC and adjacent pancreas, the pathways that differ most, the composition
  by group, the themes found in more than one gene-set database, and links to every other tab
- **Samples**: the map of the estimated single-cell profiles, by gene expression (shown first) or by
  metabolic activity, with a filter for all samples, PDAC, adjacent pancreas or the healthy reference
  cells, next to the composition by group with its test; the composition of each sample; each sample's
  patient, stage, grade, sex and age (sortable) and its fit to the healthy pancreas reference. Each
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
  scoring method, the top genes in each cell type and an indicator of agreement across databases. For a
  chosen gene set and cell type: the member genes that contribute most to the score in that cell type
  with their expression relative to the other cell types, and the signaling pathway activity (PROGENy)
  of that cell type
- **Metabolic pathways**: activity of 83 human KEGG metabolic pathways by cell type: a heatmap grouped
  by category that outlines the pathway and cell type under the pointer and keeps the selected ones
  outlined, a description of each pathway, and interactive pathway maps
- **Tissue section views** (in the panels of Bulk signaling, Cell-type signaling and Metabolic
  pathways): the selected gene set or pathway drawn on one public tissue section of a human PDAC, with
  the annotated tissue regions. The section comes from a different patient than the 24 bulk samples and
  is shown as an example. For metabolic pathways the view shows the expression of the enzyme genes, not
  the activity estimated by the metabolic model
- Literature support for every reaction step on a pathway map: human pancreatic cancer papers on its
  enzymes, papers in the most specific cell type, curated enzyme evidence, recent paper titles and
  candidate hypotheses (predicted, not yet reported)
- Literature support for genes, gene sets and cell types, with the same definitions as for the reaction
  steps and a short guide to reading the counts: for the selected gene (gene lookup and Gene
  expression), the number of human pancreatic cancer papers, the papers that also concern each cell
  type against the number expected, and recent paper titles; for the selected gene set (Cell-type
  signaling), the same counts on all member genes together and on the genes that drive the score in
  the chosen cell type; for each cell type (Gene expression), the genes discussed with it more often
  than expected
- Figures with reading guides, and downloadable result tables

## Methods named on the site

Signaling and functional pathways: univariate linear model scores (decoupler method; Badia-i-Mompel
et al., Bioinformatics Advances 2022) of the gene sets listed below on the estimated profiles.
Group comparison: PyDESeq2 0.5.4 (patient + group), fgsea multilevel enrichment of the Wald statistics,
PROGENy activity with decoupler 2.2.0, and a rank-sum test of the estimated composition.
Gene lookup: names and former symbols from the HGNC gene nomenclature; a name used for more than one gene
is offered as a choice. Cell types in tumors: mean expression (counts per 10,000) by annotated cell type
in three public single-cell datasets of pancreatic tumors of other patients, averaged over the datasets
with at least 50 cells of the type; available for 15,304 of the tested genes.
Tissue section views: capture spots merged 2 x 2 into 3,470 areas of about 0.2 mm; gene sets scored in
each area with the same definition as for the estimated profiles (3,995 of the 3,997 gene sets; the two
others have fewer than 5 member genes measured on the section); metabolic pathways shown as the mean
expression of their enzyme genes.
Healthy pancreas: reference cells placed on the expression map with the map's fitted steps; GTEx and
CPTAC counts normalized together (median of ratios, log2). The two projects differ in tissue collection,
sequencing library and software, so the all-gene comparison mainly separates the data sources; the
marker-gene view uses 176 marker genes of acinar, ductal, islet and stromal cells.

## Data credits

| Use | Source |
| --- | --- |
| PDAC demo dataset | Data generated by the National Cancer Institute Clinical Proteomic Tumor Analysis Consortium (CPTAC); CPTAC-3 open-access gene counts from the NCI Genomic Data Commons, data release 46.0 (Heath et al., Nature Genetics 2021, doi:10.1038/s41588-021-00791-5); Cao et al., Cell 2021 (doi:10.1016/j.cell.2021.08.023) |
| Cell-type definitions | Baron et al., Cell Systems 2016; GEO GSE84133 |
| Metabolic pathway definitions | KEGG, Kanehisa Laboratories |
| Literature | PubMed (NLM), PubTator3 gene annotations (NCBI), UniProtKB/Swiss-Prot |
| Gene names (gene lookup) | HUGO Gene Nomenclature Committee (HGNC), genenames.org; complete gene set, records last modified 2026-10-23 |
| Cell types in tumors | Hwang et al., Nature Genetics 2022 (GEO GSE202051); Werba et al., Nature Communications 2023 (GEO GSE205013); Chen et al., Journal of Translational Medicine 2023 (GEO GSE212966) |
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
| PROGENy pathway-responsive genes | model_human_full, 500 genes per pathway | Apache-2.0 | Schubert et al., Nature Communications 2018 (doi:10.1038/s41467-017-02391-6) |
| decoupler (scoring method) | 2.2.0 | software, not redistributed | Badia-i-Mompel et al., Bioinformatics Advances 2022 (doi:10.1093/bioadv/vbac016) |

MSigDB gene sets: © Broad Institute, Inc., Massachusetts Institute of Technology and Regents of the
University of California, used under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
PROGENy under the Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0). Changes: gene
symbols were matched to the genes of the built-in reference; sets were filtered by size (Hallmark
5–1,000 genes; Reactome, WikiPathways and GO Biological Process 10–500 genes); PROGENy was limited to
the 500 top-weighted genes per pathway. Results downloads include the license texts. No endorsement by
the source projects is implied.

For research use only. Not for diagnostic use.

This repository contains the static website (`dist/`), deployed with GitHub Pages.
