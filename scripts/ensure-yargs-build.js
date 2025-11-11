#!/usr/bin/env node
/* eslint-env node */
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const packages = [
  {
    name: "yargs",
    version: "17.7.2",
    copies: [
      {
        source: ["build"],
        target: ["build"],
      },
    ],
  },
  {
    name: "y18n",
    version: "5.0.8",
    copies: [
      {
        source: ["build"],
        target: ["build"],
      },
    ],
  },
  {
    name: "yargs-parser",
    version: "21.1.1",
    copies: [
      {
        source: ["build"],
        target: ["build"],
      },
    ],
  },
  {
    name: "cliui",
    version: "8.0.1",
    copies: [
      {
        source: ["build"],
        target: ["build"],
      },
    ],
  },
];

function log(message) {
  console.log(`[ensure-yargs-build] ${message}`);
}

function getVendorBase(pkg) {
  return path.join(__dirname, "vendor", `${pkg.name}-${pkg.version}`, "package");
}

function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function filesAreEqual(a, b) {
  try {
    return fs.readFileSync(a, "utf8") === fs.readFileSync(b, "utf8");
  } catch (error) {
    return false;
  }
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    ensureDirectoryExists(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  ensureDirectoryExists(path.dirname(dest));
  if (fs.existsSync(dest) && filesAreEqual(src, dest)) {
    return;
  }
  fs.copyFileSync(src, dest);
}

function ensurePackage(pkg) {
  const packageRoot = path.join(projectRoot, "node_modules", pkg.name);
  if (!fs.existsSync(packageRoot)) {
    log(`${pkg.name} package not installed; skipping`);
    return;
  }

  const vendorBase = getVendorBase(pkg);
  if (!fs.existsSync(vendorBase)) {
    log(`vendor bundle missing for ${pkg.name}@${pkg.version}`);
    return;
  }

  for (const { source, target } of pkg.copies) {
    const vendorPath = path.join(vendorBase, ...source);
    const packagePath = path.join(packageRoot, ...target);

    if (!fs.existsSync(vendorPath)) {
      log(`vendor path missing: ${vendorPath}`);
      continue;
    }

    log(`ensuring ${pkg.name}/${target.join("/")}`);
    copyRecursive(vendorPath, packagePath);
  }
}

try {
  for (const pkg of packages) {
    ensurePackage(pkg);
  }
} catch (error) {
  console.error("[ensure-yargs-build] Failed to hydrate yargs dependencies", error);
  process.exitCode = 1;
}
