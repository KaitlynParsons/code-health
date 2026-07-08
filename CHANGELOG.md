# Change Log

All notable changes to the "codehealth.js" extension will be documented in this file.

## [0.2.3](https://github.com/KaitlynParsons/code-health/compare/CodeHealthJS-v0.2.2...CodeHealthJS-v0.2.3) (2026-07-08)


### Bug Fixes

* bundle platform-specific binaries as direct optional dependencies ([4167a03](https://github.com/KaitlynParsons/code-health/commit/4167a03283f3e3627e63590bceb46f58bf9e4e59))

## [0.2.2](https://github.com/KaitlynParsons/code-health/compare/CodeHealthJS-v0.2.1...CodeHealthJS-v0.2.2) (2026-07-08)


### Bug Fixes

* bundle platform-specific binaries for esbuild, fallow, and oxlint ([5e6b8fc](https://github.com/KaitlynParsons/code-health/commit/5e6b8fc55f3fe8e48e34c2939db4ef96bf505bc6))

## [0.2.1](https://github.com/KaitlynParsons/code-health/compare/CodeHealthJS-v0.2.0...CodeHealthJS-v0.2.1) (2026-07-08)


### Bug Fixes

* resolve esbuild binary not found error ([dccd4cd](https://github.com/KaitlynParsons/code-health/commit/dccd4cd09864b66fedd2bd6beba45312377b3c02))

## [0.2.0](https://github.com/KaitlynParsons/code-health/compare/CodeHealthJS-v0.1.0...CodeHealthJS-v0.2.0) (2026-07-08)


### Features

* add codehealth.entry setting to scope fallow dead code analysis ([84b5fb5](https://github.com/KaitlynParsons/code-health/commit/84b5fb51b63935fb855309d4a95174b8b5feb263))

## 0.1.0 (2026-07-06)

Initial release of Code Health.

### Features
* Health bar showing overall codebase health score
* Drill-down view of smells grouped by type and file

### Detected Code Smells
* **Dead code** — unused exports and unresolved imports
* **Duplicate code** — identical or near-identical blocks duplicated across files
* **Long parameter lists** — functions exceeding the maximum parameter count
* **Barrel files** — index files that only re-export from other modules
