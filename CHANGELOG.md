# Change Log

All notable changes to the "codehealth.js" extension will be documented in this file.

## [0.2.0](https://github.com/KaitlynParsons/code-health/compare/CodeHealthJS-v0.1.0...CodeHealthJS-v0.2.0) (2026-07-08)


### Features

* add codehealth.entry setting to scope fallow dead code analysis ([84b5fb5](https://github.com/KaitlynParsons/code-health/commit/84b5fb51b63935fb855309d4a95174b8b5feb263))

## 0.1.0 (2026-07-06)

Initial release of Code Health.

### Features
- Health bar showing overall codebase health score
- Drill-down view of smells grouped by type and file

### Detected Code Smells
- **Dead code** — unused exports and unresolved imports
- **Duplicate code** — identical or near-identical blocks duplicated across files
- **Long parameter lists** — functions exceeding the maximum parameter count
- **Barrel files** — index files that only re-export from other modules
