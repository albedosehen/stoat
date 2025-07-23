# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2]] - 2025-07-22

### Fixed

- All reported errors from `deno doc --lint mod.ts` have been resolved.

## [1.0.1] - 2025-07-22

### Added

- `no-slow-types` rule to `deno.json` to prevent slow type errors.
- `stoat` to Deno ecosystem via [jsr](https://jsr.io/@albedosehen/stoat).

### Fixed

- `LOG_LEVEL_CONFIG` export in `src/types/log.ts` to ensure proper type definitions.
- `ENV_VAR_MAPPING` export in `src/types/environment.ts` to ensure proper type definitions.
- Remaining slow-type errors found.

## [1.0.0] - 2025-07-22

### Added

- Unified loggers for `stoat` package, providing a consistent logging interface.
- Split schema into multiple files for better organization and maintainability.
- Updated examples to reflect features of `stoat` as of version `1.0.0`.
- Stoat is now ready for use in production environments with a stable API.

---

## [0.1.0] - 2025-07-21

### Update

- Removed nodejs libraries from `stoat` package to reduce size and complexity.
- Refactored project structure to improve maintainability and improve clarity.
- Removed left-over code from previous iterations.
- Updated exports for proper module resolution.

---

## [0.0.1] - 2025-07-20

### 🐹 Initial Release
