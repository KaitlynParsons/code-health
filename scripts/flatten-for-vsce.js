#!/usr/bin/env node
// pnpm uses a virtual store with symlinks that vsce (yazl) cannot zip.
// This script copies all bundledDependencies and their transitive production
// deps into flat real directories at the root node_modules level so that
// vsce can zip them. Run before `vsce package`.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const nodeModules = path.join(root, 'node_modules');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

/**
 * Ensures `pkgName` exists as a real (non-symlink) directory in root
 * node_modules, then recurses into its production deps.
 *
 * @param {string} pkgName
 * @param {string} contextDir - the node_modules/ dir where pnpm put this
 *                              package's deps (i.e. the package's sibling dir)
 * @param {Set<string>} visited
 */
function ensureFlat(pkgName, contextDir, visited) {
  if (visited.has(pkgName)) { return; }
  visited.add(pkgName);

  // Resolve the real location of this package
  const inContext = path.join(contextDir, pkgName);
  const inRoot = path.join(nodeModules, pkgName);

  let sourcePath;
  if (fs.existsSync(inContext)) {
    sourcePath = fs.realpathSync(inContext);
  } else if (fs.existsSync(inRoot)) {
    sourcePath = fs.realpathSync(inRoot);
  } else {
    console.warn(`  Warning: could not find ${pkgName}`);
    return;
  }

  // Replace symlink (or missing) with a real copy at root node_modules
  const destStat = fs.existsSync(inRoot) ? fs.lstatSync(inRoot) : null;
  if (!destStat || destStat.isSymbolicLink()) {
    if (destStat) { fs.rmSync(inRoot, { recursive: true, force: true }); }
    fs.cpSync(sourcePath, inRoot, { recursive: true, dereference: true });
    console.log(`  Flattened: ${pkgName}`);
  }

  // Recurse into production + optional deps using pnpm's isolation context
  // (siblings of the package in the .pnpm/.../node_modules/ dir)
  const pkgJson = JSON.parse(fs.readFileSync(path.join(sourcePath, 'package.json'), 'utf8'));
  const deps = [
    ...Object.keys(pkgJson.dependencies || {}),
    ...Object.keys(pkgJson.optionalDependencies || {}),
  ];
  const pnpmContext = path.dirname(sourcePath); // .pnpm/pkg@v/node_modules/

  for (const dep of deps) {
    ensureFlat(dep, pnpmContext, visited);
  }
}

console.log('Flattening bundled dependencies for vsce...');
const visited = new Set();
for (const bundledPkg of (pkg.bundledDependencies || [])) {
  ensureFlat(bundledPkg, nodeModules, visited);
}
console.log('Done.');
