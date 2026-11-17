# Cypress Framework

[![CI](https://github.com/kiranpaljuss/cypress-framework/actions/workflows/ci.yml/badge.svg)](https://github.com/kiranpaljuss/cypress-framework/actions/workflows/ci.yml)
![Cypress](https://img.shields.io/badge/Cypress-16-17202C?logo=cypress)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Cucumber](https://img.shields.io/badge/Cucumber-BDD-23D96C?logo=cucumber&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A BDD test automation framework built with **Cypress**, **Cucumber** and **TypeScript**. It covers both **UI** and **REST API** testing against two public demo applications:

| Application | Type | Coverage |
| --- | --- | --- |
| [SauceDemo](https://www.saucedemo.com) | Web UI | Login, cart, inventory sorting, checkout validation |
| [Automation Exercise API](https://automationexercise.com/api_list) | REST API | Account create, update, read, login verification, delete |

📊 **[Latest test report](https://kiranpaljuss.github.io/cypress-framework/)**: published from CI on every push to `main`.

---

## Highlights

- **Behaviour-driven specs:** Gherkin feature files written in business language, with Scenario Outlines and data tables for data-driven coverage.
- **Page Object Model:** one class per page plus shared components, using stable `data-test` selectors.
- **Fast, isolated UI tests:** login is cached with `cy.session()`, so scenarios that aren't testing login skip the UI login flow while each test still starts from a clean state.
- **Scenario-safe API state:** responses and payloads are stored in Cypress aliases instead of module-level variables. A tagged `After` hook deletes every account the tests create, so the shared demo API is left clean even when a scenario fails.
- **Parallel execution:** a custom TypeScript runner distributes feature files across a configurable pool of Cypress workers and merges the results into a single report.
- **Rich reporting:** an HTML Cucumber report with failure screenshots embedded against the failing step.
- **Quality gates:** strict TypeScript, ESLint (typescript-eslint, Cypress and JSON rules), gherkin-lint, and a Husky pre-commit hook running lint-staged.
- **Migrated from JavaScript to strict TypeScript:** the framework was originally built in JavaScript, then [converted](https://github.com/kiranpaljuss/cypress-framework/commit/6772bc7) to strict mode with typed custom commands and API models.
- **CI/CD:** GitHub Actions runs static checks, then the suite. It uploads artifacts, publishes the report to GitHub Pages, and runs weekly to catch drift in the applications under test. Dependabot keeps dependencies current.

## Tech stack

| Area | Tools |
| --- | --- |
| Test runner | Cypress 16 |
| BDD | `@badeball/cypress-cucumber-preprocessor`, esbuild |
| Language | TypeScript (strict) on Node.js 24 |
| Reporting | `cucumber-html-reporter` |
| Code quality | ESLint 10 (flat config), typescript-eslint, `@stylistic`, gherkin-lint, Husky, lint-staged |
| CI | GitHub Actions, GitHub Pages, Dependabot |

## Project structure

```text
.
├── .github/
│   ├── workflows/ci.yml            # Lint → test → publish report
│   └── dependabot.yml
├── cypress/
│   ├── e2e/
│   │   ├── features/               # Gherkin feature files (*.feature)
│   │   └── step_definitions/       # Step definitions grouped by domain
│   ├── fixtures/                   # Static test data
│   ├── pages/                      # Page objects
│   │   └── components/             # Shared UI components (e.g. header)
│   └── support/
│       ├── commands.ts             # Typed custom commands (cy.loginAs, …)
│       └── e2e.ts
├── scripts/
│   ├── exportHTMLReport.ts         # Builds the HTML report and embeds screenshots
│   ├── loadEnv.ts                  # Env loading shared by Cypress and scripts
│   └── runFeaturesInParallel.ts    # Feature-level parallel runner
├── cypress.config.ts
├── .env.template                   # Default (public) configuration values
└── package.json
```

## Getting started

**Prerequisites:** Node.js 24 (see `.nvmrc`), Yarn 1.x and Google Chrome.

```bash
nvm use
yarn install
cp .env.template .env   # optional: override any defaults locally
```

## Running tests

| Command | Description |
| --- | --- |
| `yarn cy:open` | Open the interactive Cypress runner |
| `yarn test` | Run the full suite headlessly in Chrome and generate the HTML report |
| `yarn test:parallel` | Run feature files in parallel (`FEATURE_PARALLEL_WORKERS`, default `3`) |
| `yarn test:smoke` | Run only `@smoke` scenarios |
| `yarn test:ui` / `yarn test:api` | Run only UI or API scenarios |

You can run any [tag expression](https://cucumber.io/docs/cucumber/api/#tag-expressions) by setting `TAGS`:

```bash
TAGS="@checkout and not @ignore" yarn test
```

### Tags

| Tag | Meaning |
| --- | --- |
| `@ui` / `@api` | Test layer |
| `@login`, `@cart`, `@checkout` | Functional area |
| `@smoke` | Critical-path subset for fast feedback |
| `@ignore` | Excluded from every run |

## Reports

After each run:

- **HTML report:** `report/HTML/cucumber_report.html`
- **Cucumber JSON:** `report/JSON/`

Failure screenshots are attached to the failing step in the HTML report. In CI, the report is uploaded as a build artifact and published to [GitHub Pages](https://kiranpaljuss.github.io/cypress-framework/).

## Configuration

Values are resolved in this order, highest priority first:

1. Process environment (e.g. CI secrets)
2. `.env`: local overrides (git-ignored)
3. `.env.template`: committed defaults

The SauceDemo credentials in `.env.template` are the public demo credentials published on the SauceDemo login page.

## Code quality

```bash
yarn lint        # ESLint + gherkin-lint
yarn lint:fix    # Auto-fix ESLint issues
yarn typecheck   # TypeScript, strict mode
```

A pre-commit hook runs these checks against staged files.

## License

[MIT](LICENSE) © Kiranpal Juss
