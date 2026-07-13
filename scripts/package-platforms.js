#!/usr/bin/env node
// Builds a platform-specific .vsix for each target (or the ones passed as args).
// For each target, writes a temporary .vscodeignore that includes only that
// platform's optional binaries, then vsce packages with --target. Run from the
// project root.
//
// Usage:
//   node scripts/package-platforms.js                          # all targets
//   node scripts/package-platforms.js darwin-arm64             # one target
//   node scripts/package-platforms.js --publish                # all targets + publish
//   node scripts/package-platforms.js darwin-arm64 --publish   # one target + publish
const { execSync } = require('child_process');
const { readFileSync, writeFileSync } = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// vsce target → exact optional binary packages to include in the VSIX
const platforms = {
  'darwin-arm64': { packages: ['@esbuild/darwin-arm64',  '@fallow-cli/darwin-arm64',      '@oxlint/binding-darwin-arm64'     ] },
  'darwin-x64':   { packages: ['@esbuild/darwin-x64',    '@fallow-cli/darwin-x64',        '@oxlint/binding-darwin-x64'       ] },
  'linux-x64':    { packages: ['@esbuild/linux-x64',     '@fallow-cli/linux-x64-gnu',     '@oxlint/binding-linux-x64-gnu'    ] },
  'linux-arm64':  { packages: ['@esbuild/linux-arm64',   '@fallow-cli/linux-arm64-gnu',   '@oxlint/binding-linux-arm64-gnu'  ] },
  'win32-x64':    { packages: ['@esbuild/win32-x64',     '@fallow-cli/win32-x64-msvc',    '@oxlint/binding-win32-x64-msvc'   ] },
  'win32-arm64':  { packages: ['@esbuild/win32-arm64',   '@fallow-cli/win32-arm64-msvc',  '@oxlint/binding-win32-arm64-msvc' ] },
};

const args = process.argv.slice(2);
const publish = args.includes('--publish');
const targets = args.filter(a => a !== '--publish').length
  ? args.filter(a => a !== '--publish')
  : Object.keys(platforms);

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });

const { version } = require('../package.json');

const vscodeignorePath = path.join(root, '.vscodeignore');
const originalIgnore = readFileSync(vscodeignorePath, 'utf8');

// Run pre-flight checks and install once before the per-platform loop
console.log('\n=== Pre-flight checks ===');
run('pnpm install && pnpm run check-types && pnpm run lint');

const vsixFiles = [];

try {
  for (const target of targets) {
    if (!platforms[target]) {
      console.error(`Unknown target: ${target}. Valid targets: ${Object.keys(platforms).join(', ')}`);
      process.exit(1);
    }

    console.log(`\n=== Building ${target} ===`);

    // Write a target-specific .vscodeignore that includes only this platform's binaries
    const targetIncludes = platforms[target].packages
      .map(pkg => `!node_modules/${pkg}/**`)
      .join('\n');
    writeFileSync(vscodeignorePath, `${originalIgnore.trimEnd()}\n${targetIncludes}\n`);

    const vsix = path.join(root, `code-health-${version}-${target}.vsix`);
    run(`vsce package --target ${target} --out ${vsix}`);

    console.log(`✓ ${vsix}`);
    vsixFiles.push(vsix);
  }
} finally {
  // Restore .vscodeignore regardless of success or failure
  writeFileSync(vscodeignorePath, originalIgnore);
}

if (publish) {
  console.log('\n=== Publishing to Marketplace ===');
  const packagePaths = vsixFiles.map(f => `--packagePath ${f}`).join(' ');
  run(`vsce publish --azure-credential ${packagePaths}`);
  console.log(`✓ Published ${vsixFiles.length} platform package(s)`);
}
