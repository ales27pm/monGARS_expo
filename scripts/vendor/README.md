# Vendored build artifacts for Jest

This directory contains the CommonJS build outputs required by `yargs` and its
dependencies. The published npm tarballs include these files, but they are
missing from the prebuilt `node_modules` snapshot that ships with this repo.

The `scripts/ensure-yargs-build.js` helper copies the vendored assets into
`node_modules` during `postinstall` so that the Jest CLI can resolve its `yargs`
dependency tree without requiring the packages to be rebuilt at install time.

Each subdirectory mirrors the package name and version to make upgrades
straightforward and includes the upstream license file for compliance.
