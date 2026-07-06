#!/usr/bin/env node
// Builds a platform-specific .vsix for each target (or the ones passed as args).
// For each target, pnpm installs only that platform's optional binaries, then
// vsce packages with --target. Run from the project root.
//
// Usage:
//   node scripts/package-platforms.js                  # all targets
//   node scripts/package-platforms.js darwin-arm64     # one target
const { execSync } = require('child_process');
const fs = require('fs');
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

const targets = process.argv.slice(2).length
  ? process.argv.slice(2)
  : Object.keys(platforms);

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

for (const target of targets) {
  const plat = platforms[target];
  if (!plat) {
    console.error(`Unknown target: ${target}. Valid targets: ${Object.keys(platforms).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n=== Building ${target} ===`);

  // Install only this platform's optional binaries
  run(
    `pnpm install ` +
    `--config.supportedArchitectures.os='["${plat.os}","current"]' ` +
    `--config.supportedArchitectures.cpu='["${plat.cpu}","current"]'`
  );

  // Build (check-types, lint, esbuild, flatten-for-vsce)
  run('pnpm run package');

  // Package for this specific target
  run(`vsce package --target ${target}`);

  console.log(`✓ code-health-0.1.0-${target}.vsix`);
}

// Restore dev setup (reinstall current platform's binaries)
console.log('\n=== Restoring dev environment ===');
run('pnpm install');
