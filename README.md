# 🔄 Kryptorious ConfigSync

**Sync configuration files between projects** — compare, audit, and sync `.env`, `package.json`, `tsconfig.json`, and more across multiple projects. Catch inconsistencies before they cause bugs.

[![npm version](https://img.shields.io/npm/v/kryptorious-configsync)](https://www.npmjs.com/package/kryptorious-configsync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Quick Start

```bash
npm install -g kryptorious-configsync
```

## 📋 Commands

### `configsync compare <dir1> <dir2>`

Compare config files between two project directories and highlight differences.

```bash
# Compare all config files between two projects
configsync compare ./project-a ./project-b

# Output as JSON for scripting
configsync compare ./project-a ./project-b --json
```

Example output:
```
🔍 Comparing configs: ./project-a  ↔  ./project-b

  ✅ .editorconfig  —  exists  |  exists
  ⚠️ .env.example   —  missing  |  exists
  ✅ .gitignore      —  exists  |  exists
  ✅ package.json    —  exists  |  exists

📝 Deep comparison of shared files:

  🔸 package.json — 3 difference(s):
     • dependencies.react: value_diff
       "17.0.2"  →  "18.2.0"
     • devDependencies.typescript: value_diff
       "4.9.5"  →  "5.3.3"
     • scripts.lint: missing_in_target

  🔸 .env.example — 2 difference(s):
     - DATABASE_URL (only in source)
     + REDIS_URL (only in target)

📊 Summary: 8 config file(s) checked, 5 difference(s) found.
```

### `configsync audit <dir>`

Audit a single project for config best practices and security issues.

```bash
# Audit a project directory
configsync audit ./my-project
```

Checks performed:
- ✅ Required config files present (`.gitignore`, etc.)
- 🔐 Secrets exposed in `.env` files
- 📋 `.env` properly listed in `.gitignore`
- 📊 Overall config completeness score
- 📁 Inventory of all recognized config files

### `configsync sync <source> <target>`

Sync config files from a template/source project to another project.

```bash
# Preview what would be synced
configsync sync ./template ./new-project --dry-run

# Sync specific files only
configsync sync ./template ./new-project --files ".editorconfig,.prettierrc,.gitignore"

# Overwrite existing files in target
configsync sync ./template ./new-project --overwrite
```

## 🎯 Recognized Config Files

ConfigSync automatically detects and compares these config files:

| Category | Files |
|----------|-------|
| **Env** | `.env`, `.env.example`, `.env.local`, `.env.development`, `.env.production` |
| **Node/JS** | `package.json`, `tsconfig.json`, `jsconfig.json` |
| **Linting** | `.eslintrc*`, `.prettierrc*` |
| **Editor** | `.editorconfig`, `.browserslistrc`, `.nvmrc`, `.node-version` |
| **Docker** | `docker-compose.yml`, `Dockerfile`, `.dockerignore` |
| **VCS** | `.gitignore` |
| **Bundlers** | `vite.config.*`, `webpack.config.*`, `next.config.*`, `tailwind.config.*` |

## ⭐ Premium Features

Unlock the full power of ConfigSync with our **$9 lifetime license**:

- 🔧 **Custom rule templates** — define team-wide config standards in `.configsyncrc.json`
- 📊 **Team config dashboards** — monitor config drift across all team repos
- 🔄 **Auto-sync on PR** — integrate with CI/CD to catch config mismatches automatically
- 🔐 **Secret scanning** — detect exposed API keys and tokens in config files
- 📧 **Priority support** — get help directly from the Kryptorious team

👉 **[Get Premium — $9 Lifetime](https://kryptorious.gumroad.com/l/jbvet)**

---

## 🔗 Links

- **Premium License**: [kryptorious.gumroad.com/l/jbvet](https://kryptorious.gumroad.com/l/jbvet)
- **GitHub**: [github.com/CodeGero/kryptorious-configsync](https://github.com/CodeGero/kryptorious-configsync)
- **npm**: [npmjs.com/package/kryptorious-configsync](https://www.npmjs.com/package/kryptorious-configsync)

## 📜 License

MIT © [Kryptorious](https://github.com/CodeGero)
