# Cellaris AI Demo

Interactive demonstration of Cellaris single-cell metabolic and pathway profiling for human pancreas.

**Live site:** https://echang992000.github.io/cellaris-ai-demo/

Cellaris estimates cell-type composition, single-cell expression profiles, metabolic activity and
signaling pathway activity of individual cell types from bulk RNA-seq of human pancreas or islet
tissue, and compares groups of samples. The site presents two completed analyses of public data:
a cohort of 89 human islet donors and a comparison of pancreatic neuroendocrine tumors with adjacent
pancreas. Analyses of your own data run in a Cellaris workspace; contact Cellaris for a workspace URL
and access token.

## What the demo shows

- Estimated cell-type composition of each donor
- A metabolic map of the estimated single-cell profiles
- Activity of 83 human KEGG metabolic pathways by cell type, with interactive pathway maps
- Literature support for every reaction on a pathway map: human pancreas papers on its enzymes,
  papers in the cell type with the highest predicted activity, curated enzyme evidence, assessed
  abstracts and candidate hypotheses (predicted, not yet reported)
- Signaling and functional pathways: activity of Hallmark, PROGENy, Reactome, WikiPathways and
  GO Biological Process gene sets in each cell type and, where available, each sample, with an
  indicator of agreement across gene-set databases
- Group comparison: differential expression with a volcano plot, pathway enrichment, signaling
  pathway activity and composition by group, with a notice when samples lie outside the healthy
  pancreas reference
- Marker gene expression by cell type
- Downloadable result tables

## Data credits

| Use | Source |
| --- | --- |
| Islet demo dataset | Fadista et al., PNAS 2014; GEO GSE50244 |
| Comparison demo dataset | Niedra et al., PLOS One 2025 (doi:10.1371/journal.pone.0325672; CC BY 4.0); GEO GSE281039 |
| Cell-type definitions | Baron et al., Cell Systems 2016; GEO GSE84133 |
| Metabolic pathway definitions | KEGG, Kanehisa Laboratories |
| Literature | PubMed (NLM), PubTator3 gene annotations (NCBI), UniProtKB/Swiss-Prot |

### Gene-set resources

| Resource | Version | License | Citation |
| --- | --- | --- | --- |
| Molecular Signatures Database (MSigDB) | v2026.2.Hs | CC BY 4.0 | Liberzon et al., Bioinformatics 2011 (doi:10.1093/bioinformatics/btr260) |
| MSigDB Hallmark gene sets | v2026.2.Hs | CC BY 4.0 | Liberzon et al., Cell Systems 2015 (doi:10.1016/j.cels.2015.12.004) |
| Reactome (MSigDB C2:CP:Reactome) | Reactome release 97 | CC0 1.0 (Reactome); CC BY 4.0 (MSigDB) | Milacic et al., Nucleic Acids Research 2024 (doi:10.1093/nar/gkad1025) |
| WikiPathways (MSigDB C2:CP:WikiPathways) | release 2026-10-10 | CC0 1.0 (WikiPathways); CC BY 4.0 (MSigDB) | Agrawal et al., Nucleic Acids Research 2024 (doi:10.1093/nar/gkad960) |
| Gene Ontology, Biological Process (MSigDB C5:GO:BP) | GO release 2026-07-26 | CC BY 4.0 | Ashburner et al., Nature Genetics 2000 (doi:10.1038/75556); The Gene Ontology Consortium, Genetics 2023 (doi:10.1093/genetics/iyad031); GO data archive, concept DOI 10.5281/zenodo.1205166 (no version DOI is listed for the 2026-07-26 release) |
| PROGENy pathway-responsive genes | model_human_full, 500 genes per pathway | Apache-2.0 | Schubert et al., Nature Communications 2018 (doi:10.1038/s41467-017-02391-6) |

MSigDB gene sets: © Broad Institute, Inc., Massachusetts Institute of Technology and Regents of the
University of California, used under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).
PROGENy under the Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0). Changes: gene
symbols were matched to the genes of the built-in reference; sets were filtered by size (Hallmark
5–1,000 genes; Reactome, WikiPathways and GO Biological Process 10–500 genes); PROGENy was limited to
the 500 top-weighted genes per pathway. Results downloads include the license texts. No endorsement by
the source projects is implied.

For research use only. Not for diagnostic use.

This repository contains the static website (`dist/`), deployed with GitHub Pages.
