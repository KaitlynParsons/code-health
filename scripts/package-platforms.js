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
const { readdirSync, rmSync, existsSync } = require('fs');
const path = require('path');

// Scopes that ship platform-specific optional binaries
const binaryScopes = ['@esbuild', '@fallow-cli', '@oxlint'];

const root = path.join(__dirname, '..');

// Host platform — binaries needed for the vscode:prepublish build step
const hostOs = process.platform;           // 'darwin' | 'linux' | 'win32'
const hostCpu = process.arch === 'arm64' ? 'arm64' : 'x64';

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

// Run type-check and lint once before the per-platform loop
console.log('\n=== Pre-flight checks ===');
run('pnpm run check-types && pnpm run lint');

for (const target of targets) {
  const platform = platforms[target];
  if (!platforms[target]) {
    console.error(`Unknown target: ${target}. Valid targets: ${Object.keys(platforms).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n=== Building ${target} ===`);
  run('pnpm install');

  // Remove cross-product binaries — keep only the exact target platform
  for (const scope of binaryScopes) {
    const scopeDir = path.join(root, 'node_modules', scope);
    if (!existsSync(scopeDir)) {
      continue;
    }
    for (const pkg of readdirSync(scopeDir)) {
      const isTarget = pkg.includes(platform.os) && pkg.includes(platform.cpu);
      const isHost = pkg.includes(hostOs) && pkg.includes(hostCpu);
      if (!isTarget && !isHost) {
        rmSync(path.join(scopeDir, pkg), { recursive: true, force: true });
      }
    }
  }

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
