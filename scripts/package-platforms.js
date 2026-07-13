#!/usr/bin/env node
// Builds a platform-specific .vsix for each target (or the ones passed as args).
// For each target, pnpm installs only that platform's optional binaries, then
// vsce packages with --target. Run from the project root.
//
// Usage:
//   node scripts/package-platforms.js                          # all targets
//   node scripts/package-platforms.js darwin-arm64             # one target
//   node scripts/package-platforms.js --publish                # all targets + publish
//   node scripts/package-platforms.js darwin-arm64 --publish   # one target + publish
const { execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

// vsce target → pnpm supportedArchitectures values + optional binary packages
const platforms = {
  'darwin-arm64': { os: 'darwin',  cpu: 'arm64'  },
  'darwin-x64':   { os: 'darwin',  cpu: 'x64'    },
  'linux-x64':    { os: 'linux',   cpu: 'x64'    },
  'linux-arm64':  { os: 'linux',   cpu: 'arm64'  },
  'win32-x64':    { os: 'win32',   cpu: 'x64'    },
  'win32-arm64':  { os: 'win32',   cpu: 'arm64'  },
};

const args = process.argv.slice(2);
const publish = args.includes('--publish');
const targets = args.filter(a => a !== '--publish').length
  ? args.filter(a => a !== '--publish')
  : Object.keys(platforms);

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

const { version } = require('../package.json');
const vsixFiles = [];

// Run type-check, lint, and install once before the per-platform loop
console.log('\n=== Pre-flight checks ===');
run('pnpm run check-types && pnpm run lint && pnpm install');

for (const target of targets) {
  const platform = platforms[target];
  if (!platforms[target]) {
    console.error(`Unknown target: ${target}. Valid targets: ${Object.keys(platforms).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n=== Building ${target} ===`);

  // Package for this specific target
  const vsix = path.join(root, `code-health-${version}-${target}.vsix`);
  run(`vsce package --target ${target} --out ${vsix}`);

  console.log(`✓ ${vsix}`);
  vsixFiles.push(vsix);
}

if (publish) {
  console.log('\n=== Publishing to Marketplace ===');
  const packagePaths = vsixFiles.map(f => `--packagePath ${f}`).join(' ');
  run(`vsce publish --azure-credential ${packagePaths}`);
  console.log(`✓ Published ${vsixFiles.length} platform package(s)`);
}
