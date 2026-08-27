# Bilingual Repository Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish an accurate bilingual README and GitHub Wiki, make the repository public on GitHub Free, and complete its About metadata without exposing local data or credentials.

**Architecture:** `README.md` is the concise landing page, while `docs/wiki/*.md` is the reviewed source for detailed documentation. The same wiki files are pushed to the native `a-share-card.wiki.git` repository after a full-history safety scan and repository visibility change.

**Tech Stack:** Markdown, Mermaid, Git, GitHub CLI, GitHub Wiki

## Global Constraints

- Chinese content appears before the matching English content.
- The repository uses GitHub Free and must not enable GitHub Pages, paid hosting, a custom domain, paid market data, or a third-party subscription.
- The repository becomes public only after the complete Git history passes the credential and local-data scan.
- Never print or commit pairing-token values, credentials, `.env` files, SQLite files, generated datasets, or local IP addresses.
- `docs/operations.md` remains the canonical detailed runbook; new pages link to it rather than contradicting it.
- Describe public quotes as learning data, not exchange-grade or guaranteed real-time data.

---

### Task 1: Bilingual Repository README

**Files:**
- Create: `README.md`
- Reference: `docs/operations.md`
- Reference: `infra/docker-compose.yml`
- Reference: `apps/mobile/app.json`

**Interfaces:**
- Consumes: current Docker ports, package commands, supported boards, mobile bundle identifiers, and verification commands.
- Produces: the repository landing page and navigation links used by GitHub About visitors.

- [ ] **Step 1: Create the Chinese README section**

Add exact sections for product scope, core capabilities, architecture, prerequisites, Docker quick start, first synchronization, mobile development, verification, documentation navigation, data sources, privacy, and investment disclaimer. Use `股识` as the product name and state that the first local database remains empty until synchronization runs.

- [ ] **Step 2: Create the matching English README section**

Mirror the Chinese facts without translating commands, identifiers, ports, file paths, or URLs. Link both language sections to `docs/wiki/Home.md` and `docs/operations.md`.

- [ ] **Step 3: Validate README anchors and repository facts**

Run:

```bash
test -f README.md
rg -n '^## (中文|English|核心功能|Core Features|快速开始|Quick Start|文档|Documentation)' README.md
rg -n 'localhost:3000|localhost:8000|sync-all|verify-all.sh|docs/wiki/Home.md|docs/operations.md' README.md
git diff --check -- README.md
```

Expected: every command exits `0`; no whitespace errors.

- [ ] **Step 4: Commit the README**

```bash
git add README.md
git commit -m "docs: add bilingual project readme"
```

### Task 2: Version-Controlled Wiki Source

**Files:**
- Create: `docs/wiki/Home.md`
- Create: `docs/wiki/Getting-Started.md`
- Create: `docs/wiki/Architecture.md`
- Create: `docs/wiki/Data-and-Sync.md`
- Create: `docs/wiki/Mobile-App.md`
- Create: `docs/wiki/Operations.md`
- Create: `docs/wiki/Testing-and-Troubleshooting.md`
- Reference: `docs/operations.md`

**Interfaces:**
- Consumes: README terminology and the existing runbook.
- Produces: seven bilingual pages that can be copied unchanged into the native GitHub Wiki repository.

- [ ] **Step 1: Write the Wiki home and getting-started pages**

`Home.md` provides user and developer reading paths plus links to all six detail pages. `Getting-Started.md` documents Docker Desktop, Node.js 22+, Python/uv for non-Docker development, local startup, service URLs, the empty initial database, first synchronization, and shutdown.

- [ ] **Step 2: Write architecture and data pages**

`Architecture.md` defines ownership for React Native, Next.js, FastAPI, worker, SQLite, dataset publication, and device-local learning state. `Data-and-Sync.md` documents the five boards, Shenwan and Eastmoney concept taxonomies, Eastmoney primary sources, Tencent quote fallback, raw snapshots, manual overrides, CSV exchange, and atomic dataset publication.

- [ ] **Step 3: Write mobile, operations, and testing pages**

`Mobile-App.md` covers iOS-first Expo setup, Android portability, LAN pairing, offline synchronization, favorites, list/card study, FSRS scheduling, undo, and resume checkpoints. `Operations.md` summarizes schedules, backups, token handling, logs, failure recovery, and links to `../operations.md`. `Testing-and-Troubleshooting.md` covers focused tests, `verify-all.sh`, deterministic seed behavior, Android export, iOS/Maestro prerequisites, Docker registry failures, and public-source limitations.

- [ ] **Step 4: Validate page set and internal links**

Run:

```bash
test "$(find docs/wiki -maxdepth 1 -name '*.md' | wc -l | tr -d ' ')" = "7"
for page in Home Getting-Started Architecture Data-and-Sync Mobile-App Operations Testing-and-Troubleshooting; do test -s "docs/wiki/${page}.md"; done
rg -n 'Getting-Started.md|Architecture.md|Data-and-Sync.md|Mobile-App.md|Operations.md|Testing-and-Troubleshooting.md' docs/wiki/Home.md
rg -n '^## (中文|English)' docs/wiki/*.md
git diff --check -- docs/wiki
```

Expected: every command exits `0`; the home page links to all detail pages.

- [ ] **Step 5: Commit the Wiki source**

```bash
git add docs/wiki
git commit -m "docs: add bilingual project wiki"
```

### Task 3: Documentation and Public-Safety Verification

**Files:**
- Verify: `README.md`
- Verify: `docs/wiki/*.md`
- Verify: complete Git history

**Interfaces:**
- Consumes: all documentation commits and every commit reachable from `--all`.
- Produces: evidence that publication will not expose credentials or ignored local data.

- [ ] **Step 1: Check Markdown link targets with a read-only Node script**

Run a Node process that reads `README.md` and `docs/wiki/*.md`, extracts relative Markdown links, strips heading fragments, resolves each target from the source file, and exits nonzero when a target does not exist. Ignore `http://`, `https://`, and pure `#anchor` links.

Expected: output `All relative Markdown links resolve.`

- [ ] **Step 2: Scan tracked filenames across complete history**

Run:

```bash
git log --all --name-only --format= | sort -u | rg -i '(^|/)(\.env([^/]*|$)|pairing-token|[^/]*\.(db|sqlite|sqlite3|pem|p12|pfx|key))$' && exit 1 || true
```

Expected: no matching tracked filename.

- [ ] **Step 3: Scan complete history for high-confidence secret patterns without printing values**

For each commit from `git rev-list --all`, use `git grep -I -l -E` to search for GitHub tokens, AWS access keys, private-key headers, and assignments named `api_key`, `secret`, `password`, or `token` with long literal values. Print only commit IDs and paths, never matching lines.

Expected: no high-confidence credential match. Review and classify any filename-only result before continuing.

- [ ] **Step 4: Check ignored runtime data and documentation claims**

Run:

```bash
git status --short --branch
git check-ignore data/gushi.db data/pairing-token output/playwright || exit 1
rg -n 'TBD|TODO|FIXME|guaranteed real-time|exchange-grade' README.md docs/wiki && exit 1 || true
```

Expected: the branch is clean or contains only the implementation-plan commit; all runtime paths are ignored; no placeholder or prohibited claim appears.

### Task 4: Commit and Push Documentation

**Files:**
- Modify: `docs/superpowers/plans/2026-08-27-repository-documentation.md` only if checkbox status is recorded.

**Interfaces:**
- Consumes: verified README and Wiki source commits.
- Produces: a remote `origin/main` commit containing the complete documentation source.

- [ ] **Step 1: Run final documentation checks**

Run:

```bash
git diff --check
git status --short --branch
git log -4 --oneline
```

Expected: no unstaged changes and documentation commits visible at `HEAD`.

- [ ] **Step 2: Push main**

```bash
git push origin main
```

Expected: `main -> main` or `Everything up-to-date`.

- [ ] **Step 3: Verify remote parity**

Compare `git rev-parse HEAD` with `git ls-remote origin refs/heads/main` and require identical hashes.

### Task 5: Public GitHub Repository and About Metadata

**Files:**
- External state: `siliang42/a-share-card` repository settings

**Interfaces:**
- Consumes: successful history scan and pushed documentation.
- Produces: a public GitHub Free repository with Wiki enabled and complete About metadata.

- [ ] **Step 1: Change visibility and enable Wiki**

Run:

```bash
gh repo edit siliang42/a-share-card \
  --visibility public \
  --accept-visibility-change-consequences \
  --enable-wiki
```

Expected: exit `0`.

- [ ] **Step 2: Set description, website, and topics**

Set the description to `股识 / Gushi - Local-first A-share stock memory cards with spaced repetition, live quotes, React Native, FastAPI and Next.js.` Set the homepage to `https://github.com/siliang42/a-share-card/wiki`. Add exactly these topics: `a-share`, `chinese-stock-market`, `flashcards`, `spaced-repetition`, `react-native`, `expo`, `fastapi`, `nextjs`, `sqlite`, `local-first`.

- [ ] **Step 3: Verify repository settings**

Use `gh repo view` to require `PUBLIC`, `hasWikiEnabled: true`, default branch `main`, the expected homepage, and the expected topic set.

### Task 6: Native GitHub Wiki Publication

**Files:**
- Source: `docs/wiki/*.md`
- External repository: `https://github.com/siliang42/a-share-card.wiki.git`

**Interfaces:**
- Consumes: the seven reviewed Wiki source pages and enabled public Wiki.
- Produces: a native Wiki with the same seven page files and a reachable Home page.

- [ ] **Step 1: Create an isolated temporary Wiki checkout**

Use `mktemp -d`, initialize Git on branch `master`, add the Wiki remote, and copy only `docs/wiki/*.md` into the temporary root. Do not copy repository data, credentials, or generated files.

- [ ] **Step 2: Commit and push the Wiki pages**

Commit as `docs: publish bilingual project wiki` and push `master` to `https://github.com/siliang42/a-share-card.wiki.git`. If GitHub requires an initial page before Git access, create only the Home page through the GitHub Wiki interface, then retry the same Git push.

- [ ] **Step 3: Verify Wiki parity and public access**

Clone the Wiki repository into a second temporary directory, require exactly the seven expected Markdown filenames, and compare each file checksum with `docs/wiki/`. Fetch `https://github.com/siliang42/a-share-card/wiki` and require an HTTP success response.

### Task 7: Reader-Focused Final Review

**Files:**
- Review: `README.md`
- Review: `docs/wiki/*.md`

**Interfaces:**
- Consumes: published repository and Wiki.
- Produces: final evidence that new users and maintainers can find the core answers.

- [ ] **Step 1: Answer reader discovery questions from documentation only**

Verify that the documentation directly answers: what Gushi does, which A-share markets it supports, whether quotes are guaranteed real-time, how to start services, how to run the first sync, how an iPhone pairs, where learning progress lives, how Android is supported, how to back up data, and how to run full verification.

- [ ] **Step 2: Check for contradictions and hidden prerequisites**

Compare README, Wiki, `docs/operations.md`, Compose configuration, and app configuration for ports, paths, schedules, package requirements, pairing-token handling, and iOS prerequisites. Correct documentation, not implementation, if a mismatch exists.

- [ ] **Step 3: Verify final Git and GitHub state**

Require a clean local branch tracking `origin/main`, matching local and remote hashes, a public repository, enabled Wiki, expected About metadata, seven Wiki pages, and healthy local services unchanged by documentation publication.
