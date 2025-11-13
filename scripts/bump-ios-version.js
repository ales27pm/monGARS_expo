#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ALLOWED_RELEASE_TYPES = new Set(["major", "minor", "patch"]);

function parseArgs(argv) {
  const args = { releaseType: "patch" };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if ((arg === "--type" || arg === "-t") && i + 1 < argv.length) {
      const value = argv[i + 1].toLowerCase();
      if (!ALLOWED_RELEASE_TYPES.has(value)) {
        throw new Error(
          `Invalid release type "${value}". Expected one of: ${Array.from(ALLOWED_RELEASE_TYPES).join(", ")}`,
        );
      }
      args.releaseType = value;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function bumpVersion(version, releaseType) {
  const parts = version.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Unsupported version format: ${version}`);
  }
  const [major, minor, patch] = parts;
  switch (releaseType) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function updatePbxproj(filePath, { marketingVersion, buildNumber }) {
  const contents = fs.readFileSync(filePath, "utf8");
  const updated = contents
    .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${marketingVersion};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`);

  if (contents === updated) {
    throw new Error("Unable to update Xcode project file: no version fields were replaced.");
  }

  fs.writeFileSync(filePath, updated);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Usage: node scripts/bump-ios-version.js [--type <major|minor|patch>]\n`);
    return;
  }

  const appJsonPath = path.resolve(__dirname, "..", "app.json");
  const pbxprojPath = path.resolve(__dirname, "..", "ios", "MonGARS.xcodeproj", "project.pbxproj");

  const appJson = readJson(appJsonPath);
  const expoConfig = appJson.expo;

  if (!expoConfig || !expoConfig.version || !expoConfig.ios || !expoConfig.ios.buildNumber) {
    throw new Error("app.json is missing expo.version or expo.ios.buildNumber.");
  }

  const nextMarketingVersion = bumpVersion(expoConfig.version, args.releaseType);
  const currentBuild = Number.parseInt(expoConfig.ios.buildNumber, 10);
  if (Number.isNaN(currentBuild)) {
    throw new Error(`Invalid iOS build number: ${expoConfig.ios.buildNumber}`);
  }
  const nextBuild = currentBuild + 1;

  expoConfig.version = nextMarketingVersion;
  expoConfig.ios.buildNumber = String(nextBuild);

  writeJson(appJsonPath, appJson);
  updatePbxproj(pbxprojPath, {
    marketingVersion: nextMarketingVersion,
    buildNumber: nextBuild,
  });

  console.log(`Updated iOS marketing version to ${nextMarketingVersion} and build number to ${nextBuild}.`);
}

main();
