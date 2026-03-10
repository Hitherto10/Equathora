# Contributing to Equathora

Welcome to the Equathora codebase. This guide covers everything you need to know to contribute effectively.

---

## Table of Contents

- [Branching Strategy](#branching-strategy)
- [Getting Started](#getting-started)
- [Workflow: Feature or Fix](#workflow-feature-or-fix)
- [Workflow: Hotfix (Production Emergency)](#workflow-hotfix-production-emergency)
- [Commit Message Format](#commit-message-format)
- [Pull Request Rules](#pull-request-rules)
- [PR Checklist](#pr-checklist)
- [Environment Setup](#environment-setup)
- [Code Standards](#code-standards)

---

## Branching Strategy

```
main            ← production — owner-only. Never push here directly.
├── feature/short-description
├── fix/short-description
└── chore/short-description
```

| Branch | Purpose | Who merges |
|---|---|---|
| `main` | Live production | Owner only |
| `feature/*` | New features | Owner merges via PR |
| `fix/*` | Bug fixes | Owner merges via PR |
| `chore/*` | Dependency updates, refactors, tooling | Owner merges via PR |

**Rule: You never push to `main` directly. Always open a PR and wait for the owner to merge it.**

---

## Getting Started

### 1. Fork & clone (external contributors) or clone directly (team members)

```bash
git clone https://github.com/your-org/equathora.git
cd equathora
```

### 2. Set up your remotes (external contributors only)

```bash
git remote add upstream https://github.com/your-org/equathora.git
```

### 3. Always branch off `main`

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

---

## Workflow: Feature or Fix

```
1. Branch off main
   git checkout main && git pull origin main
   git checkout -b feature/problem-search-filter

2. Write your code (follow standards below)

3. Commit with clear messages
   git add .
   git commit -m "feat: add search filter to problem list"

4. Push to origin
   git push origin feature/problem-search-filter

5. Open a PR on GitHub
   - Base branch: main
   - Fill in the PR template
   - Request review from the owner

6. Address review feedback via new commits (do not force-push on open PRs)

7. Owner reviews and merges into main
```

---

## Commit Message Format

```
type: short description in present tense (max 72 chars)
```

| Type | When to use |
|---|---|
| `feat` | New feature or user-visible functionality |
| `fix` | Bug fix |
| `refactor` | Code restructure with no behavior change |
| `style` | Formatting, spacing, class names only |
| `perf` | Performance improvement |
| `docs` | Documentation only |
| `chore` | Tooling, dependencies, config changes |
| `test` | Adding or updating tests |

**Examples:**
```
feat: add problem difficulty filter to Discover page
fix: correct streak not resetting after midnight
refactor: extract ProblemCard header into sub-component
chore: update axios to 1.13.5
```

- One logical change per commit.
- Do not mix a feature and a refactor in the same commit.
- Do not commit commented-out code.

---

## Pull Request Rules

### Targeting

- **All PRs must target `main`.** The owner reviews and merges.

### Title format

Follow the same format as commit messages:
```
feat: add streak freeze item to the store
fix: mobile menu not closing on route change
```

### Size

- Keep PRs focused — one feature or one fix per PR.
- PRs with 1000+ changed lines will be asked to be split unless it's unavoidable (e.g., a large page migration).

### Reviews

- At least one approval is required before merging.
- The owner (`@halil`) reviews and merges all PRs into `main`.
- Do not merge your own PR.

### No force-pushing on open PRs

Once a PR is open, do not `git push --force`. Add new commits to address feedback instead. This preserves review history.

---

## PR Checklist

Fill this in when opening a PR (the PR template will include it automatically):

- [ ] Branch is based on `main` (up to date with `origin/main`)
- [ ] No `.env`, `appsettings.json`, `appsettings.Development.json`, or `appsettings.Production.json` files committed
- [ ] No API keys, tokens, or secrets in the diff
- [ ] All new UI uses Tailwind CSS utility classes (no new `.css` files)
- [ ] All imports use the `@/` alias (`@/components/`, `@/lib/`, etc.)
- [ ] No new libraries added without prior approval
- [ ] No `console.log` calls left in production code
- [ ] Math content uses MathLive-compatible LaTeX (`$...$` / `$$...$$`)
- [ ] Tested locally in both desktop and mobile viewport

---

## Environment Setup

### Frontend

```bash
# Install dependencies
npm install

# Copy the example environment file
cp .env.example .env.local
# Fill in your values from the project's shared secrets doc

# Start dev server
npm run dev
```

### Backend (.NET)

```bash
cd backend/EquathoraBackend

# Copy example config
cp appsettings.json.example appsettings.json
cp appsettings.json.example appsettings.Development.json
# Fill in your database connection string and JWT settings

# Run the backend
dotnet run
```

> Never commit `appsettings.json`, `appsettings.Development.json`, or `appsettings.Production.json` with real values. The `.example` files are intentionally committed as templates.

---

## Code Standards

A full spec is in [`claude/ENGINEERING_STANDARDS.md`](claude/ENGINEERING_STANDARDS.md). Key rules:

- **Frontend:** React 19, Tailwind CSS 4, Vite 7. No class components.
- **Routing:** `react-router-dom` v7. Lazy-load all route-level pages with `React.lazy()`.
- **Imports:** Use `@/` alias for all `src/` imports. Group: React → third-party → local.
- **Backend:** Minimal API endpoints in `Endpoints/`. DTOs for all request/response payloads.
- **Math:** All math rendered via MathJax. All math input via MathLive. LaTeX wrapped in `$` or `$$`.
- **No new frameworks or libraries** without explicit approval from the owner.

---

## Questions?

Open a GitHub Discussion or reach out to the maintainer directly. Don't open an issue for questions.
