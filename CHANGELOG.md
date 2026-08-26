# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/).

## [1.0.1] - 2026-08-26

### Fixed

- Corrected the GitHub Pages production asset base so the deployed simulator loads its JavaScript, styles, fonts, and favicon from the repository path.

### Added

- Added an automated release workflow with tested source and production-site archives.
- Added a deployment check that prevents an incorrect Pages asset prefix from shipping again.

## [1.0.0] - 2026-08-26

### Added

- Deterministic simulations for fixed, exponential, full-jitter, and decorrelated retries.
- Configurable client load, retry budget, outage length, delays, and recovery capacity.
- Retry-pressure chart, per-client attempt map, outcome metrics, and comparison table.
- Shareable scenario URLs, versioned browser persistence, presets, and CSV export.
- Responsive, accessible interface with automated unit and interaction tests.

[1.0.0]: https://github.com/kyan9400/retry-lab/releases/tag/v1.0.0
[1.0.1]: https://github.com/kyan9400/retry-lab/compare/v1.0.0...v1.0.1
