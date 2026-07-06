#!/usr/bin/env node
// Removes devDependencies from bundled tools' installed package.json files.
// vsce uses `npm list --production` which incorrectly flags devDeps of bundled
// packages as missing, causing packaging to fail.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');

// Find all package.json files under node_modules that have devDependencies,
// then strip them. This covers both hoisted and pnpm-isolated locations.
const files = execSync('find node_modules -name "package.json" -not -path "*/node_modules/*/node_modules/*"', {
  cwd: root,
  encoding: 'utf8',
}).trim().split('\n');

let count = 0;
for (const rel of files) {
  const pkgPath = path.join(root, rel);
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    continue;
  }
  if (!pkg.devDependencies) { continue; }
  delete pkg.devDependencies;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  count++;
}
console.log(`Stripped devDependencies from ${count} packages`);
