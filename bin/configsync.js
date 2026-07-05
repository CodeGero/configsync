#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');

const program = new Command();

program
  .name('configsync')
  .description('Sync configuration files between projects — compare, audit, and sync .env, package.json, tsconfig.json, and more')
  .version('1.0.0');

// ─── Helpers ────────────────────────────────────────────────────────────────

const KNOWN_CONFIGS = [
  '.env', '.env.example', '.env.local', '.env.development', '.env.production',
  'package.json', 'tsconfig.json', 'jsconfig.json',
  '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yaml', '.eslintrc.yml',
  '.prettierrc', '.prettierrc.js', '.prettierrc.json', '.prettierrc.yaml',
  '.editorconfig', '.browserslistrc', '.nvmrc', '.node-version',
  'docker-compose.yml', 'docker-compose.yaml', 'Dockerfile',
  '.gitignore', '.dockerignore',
  'vite.config.js', 'vite.config.ts', 'webpack.config.js', 'next.config.js', 'next.config.mjs',
  'tailwind.config.js', 'tailwind.config.ts',
];

function findConfigFiles(dir) {
  const found = [];
  if (!fs.existsSync(dir)) return found;

  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (KNOWN_CONFIGS.includes(entry) && fs.statSync(fullPath).isFile()) {
      found.push(entry);
    }
    // Check for .env.* patterns
    if (entry.startsWith('.env') && fs.statSync(fullPath).isFile() && !found.includes(entry)) {
      found.push(entry);
    }
  }
  return found.sort();
}

function loadJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
  catch { return null; }
}

function loadEnv(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      vars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
  return vars;
}

function deepDiff(a, b, prefix = '') {
  const issues = [];
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const key of keys) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (!(key in (a || {}))) {
      issues.push({ key: fullKey, type: 'missing_in_source', value: JSON.stringify(b[key]) });
    } else if (!(key in (b || {}))) {
      issues.push({ key: fullKey, type: 'missing_in_target', value: JSON.stringify(a[key]) });
    } else if (typeof a[key] !== typeof b[key]) {
      issues.push({ key: fullKey, type: 'type_mismatch', source: typeof a[key], target: typeof b[key] });
    } else if (typeof a[key] === 'object' && a[key] !== null && !Array.isArray(a[key])) {
      issues.push(...deepDiff(a[key], b[key], fullKey));
    } else if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      issues.push({ key: fullKey, type: 'value_diff', source: JSON.stringify(a[key]), target: JSON.stringify(b[key]) });
    }
  }
  return issues;
}

// ─── compare ────────────────────────────────────────────────────────────────

program
  .command('compare <dir1> <dir2>')
  .description('Compare config files between two project directories')
  .option('--json', 'Output as JSON', false)
  .action((dir1, dir2, opts) => {
    const configs1 = findConfigFiles(dir1);
    const configs2 = findConfigFiles(dir2);
    const allConfigs = [...new Set([...configs1, ...configs2])].sort();

    if (allConfigs.length === 0) {
      console.log('No recognized config files found in either directory.');
      return;
    }

    console.log(`\n🔍 Comparing configs: ${dir1}  ↔  ${dir2}\n`);

    const results = [];

    for (const cfg of allConfigs) {
      const in1 = configs1.includes(cfg);
      const in2 = configs2.includes(cfg);
      const icon = in1 && in2 ? '✅' : '⚠️';
      console.log(`  ${icon} ${cfg}  —  ${in1 ? 'exists' : 'missing'}  |  ${in2 ? 'exists' : 'missing'}`);
      results.push({ file: cfg, inDir1: in1, inDir2: in2 });
    }

    // Deep compare JSON files that exist in both
    console.log(`\n📝 Deep comparison of shared files:\n`);
    let diffCount = 0;

    for (const cfg of allConfigs) {
      if (!configs1.includes(cfg) || !configs2.includes(cfg)) continue;
      const ext = path.extname(cfg);

      if (ext === '.json') {
        const a = loadJSON(path.join(dir1, cfg));
        const b = loadJSON(path.join(dir2, cfg));
        if (!a || !b) continue;
        const diffs = deepDiff(a, b);
        if (diffs.length > 0) {
          console.log(`  🔸 ${cfg} — ${diffs.length} difference(s):`);
          diffs.forEach((d) => {
            console.log(`     • ${d.key}: ${d.type.replace(/_/g, ' ')}`);
            if (d.source && d.target) console.log(`       ${d.source}  →  ${d.target}`);
          });
          diffCount += diffs.length;
        }
      } else if (cfg.startsWith('.env')) {
        const aVars = loadEnv(path.join(dir1, cfg));
        const bVars = loadEnv(path.join(dir2, cfg));
        const envKeys = new Set([...Object.keys(aVars), ...Object.keys(bVars)]);
        let envDiffs = [];
        for (const key of envKeys) {
          if (!(key in aVars)) envDiffs.push(`+ ${key} (only in target)`);
          else if (!(key in bVars)) envDiffs.push(`- ${key} (only in source)`);
          else if (aVars[key] !== bVars[key]) envDiffs.push(`~ ${key}: different values`);
        }
        if (envDiffs.length > 0) {
          console.log(`  🔸 ${cfg} — ${envDiffs.length} difference(s):`);
          envDiffs.forEach((d) => console.log(`     ${d}`));
          diffCount += envDiffs.length;
        }
      }
    }

    if (diffCount === 0) {
      console.log('  ✨ All shared configs are identical.\n');
    }

    console.log(`\n📊 Summary: ${allConfigs.length} config file(s) checked, ${diffCount} difference(s) found.\n`);

    if (opts.json) {
      console.log(JSON.stringify(results, null, 2));
    }
  });

// ─── audit ──────────────────────────────────────────────────────────────────

program
  .command('audit <dir>')
  .description('Audit a single project directory for config best practices')
  .action((dir) => {
    const configs = findConfigFiles(dir);

    console.log(`\n🔎 Config Audit: ${dir}\n`);

    const checks = [
      { file: '.env', required: false, rec: 'Store environment variables (do NOT commit secrets)' },
      { file: '.env.example', required: false, rec: 'Template for required env vars (safe to commit)' },
      { file: '.gitignore', required: true, rec: 'Essential — prevents committing secrets and build artifacts' },
      { file: 'package.json', required: false, rec: 'Node.js project manifest' },
      { file: '.editorconfig', required: false, rec: 'Consistent editor settings across the team' },
      { file: '.prettierrc', required: false, rec: 'Code formatting rules' },
    ];

    let score = 0;
    let total = checks.length;

    for (const check of checks) {
      const exists = configs.includes(check.file);
      const icon = exists ? '✅' : check.required ? '❌' : '⚠️';
      const status = exists ? 'found' : (check.required ? 'MISSING (required)' : 'missing (recommended)');
      console.log(`  ${icon} ${check.file.padEnd(20)} ${status}`);
      if (check.rec && !exists) {
        console.log(`      💡 ${check.rec}`);
      }
      if (exists || !check.required) score++;
    }

    // Check for secrets in .env
    if (configs.includes('.env')) {
      const envVars = loadEnv(path.join(dir, '.env'));
      const sensitivePatterns = [/password/i, /secret/i, /token/i, /key/i, /api_key/i, /credential/i];
      let exposed = 0;
      for (const key of Object.keys(envVars)) {
        if (sensitivePatterns.some((re) => re.test(key))) {
          const val = envVars[key];
          if (val && val.length > 5 && !val.startsWith('$') && !val.includes('{{')) {
            exposed++;
          }
        }
      }
      if (exposed > 0) {
        console.log(`\n  🔐 WARNING: .env contains ${exposed} potential secret(s). Ensure .env is in .gitignore!`);
      }
    }

    // Check for .env committed risk
    if (configs.includes('.env') && configs.includes('.gitignore')) {
      const gitignore = fs.readFileSync(path.join(dir, '.gitignore'), 'utf-8');
      if (!gitignore.includes('.env')) {
        console.log(`  🔐 WARNING: .env is present but NOT listed in .gitignore — risk of committing secrets!`);
      }
    }

    console.log(`\n  📊 Audit Score: ${score}/${total}\n`);

    // List all found configs
    console.log(`  📁 All config files found (${configs.length}):`);
    configs.forEach((c) => console.log(`     • ${c}`));
    console.log('');
  });

// ─── sync ───────────────────────────────────────────────────────────────────

program
  .command('sync <source> <target>')
  .description('Sync config files from source directory to target directory')
  .option('--dry-run', 'Preview changes without applying them', false)
  .option('-f, --files <list>', 'Comma-separated list of files to sync (default: all recognized configs)')
  .option('--overwrite', 'Overwrite existing files in target', false)
  .action((source, target, opts) => {
    const filesToSync = opts.files
      ? opts.files.split(',').map((f) => f.trim())
      : null;

    const sourceConfigs = findConfigFiles(source);
    const targetConfigs = findConfigFiles(target);
    const toSync = filesToSync
      ? sourceConfigs.filter((c) => filesToSync.includes(c))
      : sourceConfigs;

    if (toSync.length === 0) {
      console.log('No config files found to sync.');
      return;
    }

    console.log(`\n🔄 Sync: ${source}  →  ${target}`);
    console.log(opts.dryRun ? '  (DRY RUN — no changes applied)\n' : '\n');

    let synced = 0;
    let skipped = 0;

    for (const cfg of toSync) {
      const srcPath = path.join(source, cfg);
      const tgtPath = path.join(target, cfg);
      const exists = targetConfigs.includes(cfg);

      if (exists && !opts.overwrite) {
        console.log(`  ⏭️  ${cfg} — skipped (already exists in target, use --overwrite to replace)`);
        skipped++;
        continue;
      }

      if (opts.dryRun) {
        console.log(`  📋 ${cfg} — would ${exists ? 'overwrite' : 'create'}`);
        synced++;
      } else {
        fs.mkdirSync(path.dirname(tgtPath), { recursive: true });
        fs.copyFileSync(srcPath, tgtPath);
        console.log(`  ✅ ${cfg} — ${exists ? 'overwritten' : 'created'}`);
        synced++;
      }
    }

    console.log(`\n📊 Summary: ${synced} synced, ${skipped} skipped.\n`);
  });

program.parse(process.argv);
