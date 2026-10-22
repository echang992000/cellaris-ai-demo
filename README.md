# Cellaris AI Demo

Interactive demonstration of Cellaris single-cell metabolic profiling for human pancreas.

**Live site:** https://echang992000.github.io/cellaris-ai-demo/

Cellaris estimates cell-type composition and the metabolic activity of individual cell types from
bulk RNA-seq of human pancreas or islet tissue. The demo presents a completed analysis of a public
cohort of 89 human islet donors. Analyses of your own data run in a Cellaris workspace; contact
Cellaris for a workspace URL and access token.

## What the demo shows

- Estimated cell-type composition of each donor
- A metabolic map of the estimated single-cell profiles
- Activity of 101 KEGG metabolic pathways by cell type, with interactive pathway maps
- Marker gene expression by cell type
- Downloadable result tables

## Data credits

| Use | Source |
| --- | --- |
| Demo dataset | Fadista et al., PNAS 2014; GEO GSE50244 |
| Cell-type definitions | Baron et al., Cell Systems 2016; GEO GSE84133 |
| Pathway definitions | KEGG, Kanehisa Laboratories |

For research use only. Not for diagnostic use.

This repository contains the static website (`dist/`), deployed with GitHub Pages.
