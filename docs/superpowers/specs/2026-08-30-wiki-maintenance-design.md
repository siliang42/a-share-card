# Wiki Maintenance Design

## Goal

Refresh the public Gushi Wiki so a new user can operate the Web admin and a maintainer can distinguish implemented, verified, and not-yet-run behavior without reading the source code.

## Audience

- Users who need to start the local stack, synchronize data, pair the mobile app, and maintain CSV supplements.
- Maintainers who need a concise release-status and verification boundary.

Chinese appears before English on every new page. No paid service, hosted deployment, market-data subscription, or application behavior change is introduced.

## Scope

1. Add `docs/wiki/Web-Admin.md` with the five admin navigation areas, sync order, stock and sector maintenance, CSV preview/apply, dataset publication, and pairing workflow.
2. Add `docs/wiki/Project-Status.md` with the verified implementation surface, the local runtime observation from 2026-08-30, known boundaries, and reproducible verification commands.
3. Add `docs/wiki/_Sidebar.md` and update every page's compact navigation so the two new pages are discoverable from the native Wiki.
4. Add the two pages to the root README documentation index.

## Accuracy and Safety Rules

- Distinguish deterministic fixture verification from a live public full-market synchronization.
- State that the checked local runtime has an empty stock catalog until an explicit synchronization succeeds; do not print pairing tokens, local addresses, or runtime files.
- Preserve Eastmoney as the primary public source, Shenwan as the industry taxonomy source, and Tencent as the quote fallback.
- Keep the Mac SQLite database authoritative for reference data and the phone authoritative for favorites, study history, and checkpoints.
- Keep the Wiki source under `docs/wiki/` and publish byte-identical Markdown files to `a-share-card.wiki.git`.

## Verification

- Resolve all relative Markdown links from the repository source.
- Check bilingual headings, navigation, whitespace, and forbidden placeholders.
- Re-run focused documentation-adjacent tests and the existing release verification as practical, without triggering live synchronization.
- Scan tracked history and generated files for credentials or local data before publishing.
- Compare local Wiki source files with a fresh remote Wiki clone and verify the public Wiki URL.

## Out of Scope

- New application features or API changes.
- Running the real five-market synchronization.
- Screenshots, App Store or Google Play publication, GitHub Pages, paid hosting, and paid data sources.
