# Wiki Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the bilingual public Wiki with Web-admin instructions, an explicit implementation-status page, and complete navigation while preserving the free-only local-first boundary.

**Architecture:** `docs/wiki/` remains the reviewed source of truth. New pages mirror the existing Chinese-first/English-second format; `_Sidebar.md` and compact page nav provide native Wiki discovery. The root README links to the new source pages, and the same Markdown is copied byte-for-byte to `a-share-card.wiki.git`.

**Tech Stack:** Markdown, Git, GitHub CLI, GitHub Wiki.

## Global Constraints

- Chinese content appears before matching English content.
- No paid hosting, paid data source, GitHub Pages, custom domain, subscription, or application code change.
- Do not run live full-market synchronization.
- Never publish pairing tokens, credentials, local IP addresses, SQLite files, generated datasets, or runtime snapshots.
- Distinguish deterministic fixture verification from the live data state.
- `docs/operations.md` remains the detailed operations runbook.

---

### Task 1: Write the New Wiki Pages

**Files:**
- Create: `docs/wiki/Web-Admin.md`
- Create: `docs/wiki/Project-Status.md`

**Interfaces:**
- Consumes: admin routes/components, `docs/operations.md`, existing Wiki terminology, and the 2026-08-30 read-only runtime observation.
- Produces: user-operable admin instructions and an honest status boundary.

- [ ] **Step 1: Document the Web admin workflow**

Include the five navigation entries (`数据总览`, `股票维护`, `板块目录`, `导入导出`, `连接设置`), explicit sync order, stock filters and quote cadence, taxonomy switch, CSV preview/apply rules, publish step, and LAN pairing.

- [ ] **Step 2: Document implementation status**

Record the implemented surfaces, last deterministic verification counts/date, current local runtime observation (`stocks=0`, `sectors=155`, no published dataset), boundaries, and exact commands for rechecking. Explain that empty runtime data is expected until an explicit public synchronization succeeds.

- [ ] **Step 3: Mirror both pages in English**

Translate prose while preserving commands, route names, identifiers, URLs, ports, and source taxonomy values.

### Task 2: Complete Navigation and README Index

**Files:**
- Create: `docs/wiki/_Sidebar.md`
- Modify: `docs/wiki/Home.md`
- Modify: `docs/wiki/Getting-Started.md`
- Modify: `docs/wiki/Architecture.md`
- Modify: `docs/wiki/Data-and-Sync.md`
- Modify: `docs/wiki/Mobile-App.md`
- Modify: `docs/wiki/Operations.md`
- Modify: `docs/wiki/Testing-and-Troubleshooting.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: page names from Task 1.
- Produces: discoverable navigation from both the repository and native Wiki.

- [ ] **Step 1: Add bilingual Wiki sidebar**

Link Home, Getting Started, Web Admin, Mobile App, Data and Sync, Architecture, Operations, Testing and Troubleshooting, and Project Status.

- [ ] **Step 2: Extend compact navigation on all pages**

Add `Web-Admin.md` and `Project-Status.md` to each page's existing top navigation without changing existing link targets.

- [ ] **Step 3: Extend README documentation lists**

Add the Web admin and Project status source links in both language sections.

### Task 3: Validate and Publish

**Files:**
- Verify: `README.md`, `docs/wiki/*.md`, `docs/superpowers/specs/2026-08-30-wiki-maintenance-design.md`, `docs/superpowers/plans/2026-08-30-wiki-maintenance.md`
- External repository: `https://github.com/siliang42/a-share-card.wiki.git`

**Interfaces:**
- Consumes: completed source pages.
- Produces: pushed main commit, byte-identical native Wiki, and public URL verification.

- [ ] **Step 1: Validate links and claims**

Run a relative-link checker, `git diff --check`, bilingual-heading checks, placeholder scans, tracked-history secret/data filename scans, and the existing documentation-safe verification commands. Do not execute `sync-all`.

- [ ] **Step 2: Commit and push main**

Commit the source and plan as `docs: refresh project wiki guidance`, push `main`, and require local/remote hash parity.

- [ ] **Step 3: Publish native Wiki**

Copy only `docs/wiki/*.md` into a temporary Wiki checkout, commit and push `master`, then fresh-clone it and compare every checksum with the source.

- [ ] **Step 4: Verify public state**

Check that the repository remains public with Wiki enabled and fetch `https://github.com/siliang42/a-share-card/wiki` successfully. Report the exact commits and any tests skipped for environment reasons.
