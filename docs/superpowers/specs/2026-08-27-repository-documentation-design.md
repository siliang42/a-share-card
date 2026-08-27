# Repository Documentation Design

## Goal

Add a bilingual repository entry point and a GitHub Wiki for Gushi without introducing any paid service. Make the repository public and complete its GitHub metadata so visitors can understand the project from the repository page.

## Audience

The documentation serves two groups:

- People who want to run Gushi locally and use the mobile learning workflow.
- Developers who need to understand, test, maintain, or extend the React Native, Next.js, FastAPI, worker, and SQLite components.

Chinese appears first and English second. Commands, identifiers, URLs, and product-specific technical terms remain unchanged between languages.

## Documentation Structure

### Root README

`README.md` is the concise repository landing page. It contains:

1. Product name and one-paragraph purpose in both languages.
2. Core capabilities: five A-share markets, market and sector decks, spaced repetition, live quote fallback, offline progress, favorites, CSV maintenance, and local administration.
3. A compact architecture overview and links to detailed wiki pages.
4. Prerequisites and a verified Docker quick start.
5. React Native iOS and Android development entry points.
6. Test and release-verification commands.
7. Data-source, privacy, and investment-risk boundaries.

The README links to existing operational documentation rather than copying every maintenance procedure.

### Wiki Source and Publication

The reviewed source for the wiki lives under `docs/wiki/` in the main repository. The same pages are published to the repository's native GitHub Wiki, which is available at no cost after the repository becomes public. Each page contains Chinese first and English second.

- `Home.md`: navigation, project scope, and reading paths for users and developers.
- `Getting-Started.md`: prerequisites, Docker startup, first synchronization, and local URLs.
- `Architecture.md`: component ownership, request and synchronization flows, storage boundaries, and local-first behavior.
- `Data-and-Sync.md`: supported markets, taxonomies, public sources, normalization, publication, CSV exchange, and quote fallback.
- `Mobile-App.md`: iOS-first React Native setup, Android portability, pairing, offline datasets, favorites, study modes, and progress persistence.
- `Operations.md`: schedules, backup and restore, security, logs, failure recovery, and data preservation.
- `Testing-and-Troubleshooting.md`: focused tests, complete verification, iOS prerequisites, known limits, and common failures.

Existing `docs/operations.md` remains the canonical detailed runbook. Wiki pages summarize and link to it where appropriate to avoid conflicting instructions.

## GitHub Repository Metadata

The GitHub About panel is updated without enabling paid features:

- Description: a compact bilingual summary of Gushi as a local-first A-share stock memory-card application.
- Website: `https://github.com/siliang42/a-share-card/wiki`.
- Topics: `a-share`, `chinese-stock-market`, `flashcards`, `spaced-repetition`, `react-native`, `expo`, `fastapi`, `nextjs`, `sqlite`, and `local-first`.

The repository becomes public and its native GitHub Wiki is enabled. GitHub Pages is not enabled.

## Accuracy Rules

- Describe only behavior supported by the committed implementation.
- State that the initial local database is empty until synchronization is run.
- Identify Eastmoney as the primary stock/profile/concept/quote source, Tencent as quote fallback, and Shenwan as the industry taxonomy source.
- Do not describe public quotes as exchange-grade or guaranteed real-time data.
- Keep SQLite as the authoritative server-side store and CSV as an exchange format.
- Keep mobile favorites and study progress on the device and distinguish them from Mac backups.
- Never include pairing-token values, credentials, local IP addresses, or generated data files.
- Scan the complete Git history for credentials, tokens, private keys, local databases, and pairing files before changing repository visibility.

## Free-Only Constraint

Documentation and repository setup must not require GitHub Pages, paid hosting, a custom domain, a paid market-data interface, or a third-party subscription. The public repository and its native Wiki use GitHub Free. All application workflows continue to use local Docker services and public data sources.

## Verification

Before publishing:

1. Check every relative Markdown link and heading anchor.
2. Confirm every documented command exists in the repository and matches current ports and paths.
3. Scan the working tree and complete Git history for placeholders, credentials, local data, unsupported claims, and contradictory synchronization instructions.
4. Run the existing focused tests required by any code-adjacent documentation change; documentation-only changes require Markdown and link validation plus a clean Git status.
5. Push `main`, publish the same pages to the GitHub Wiki repository, and verify both remote commits.
6. Change the repository to public only after the history scan passes, then verify visibility, Wiki access, description, website, topics, and default branch.

## Out of Scope

- Hosted production deployment.
- App Store or Google Play publishing instructions.
- Public GitHub Pages documentation.
- Paid data providers or analytics.
- Redesigning the application or changing synchronization behavior.
