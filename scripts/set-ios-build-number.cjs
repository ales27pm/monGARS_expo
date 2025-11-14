#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function log(message) {
  console.log(`[versioning] ${message}`);
}

function fail(message, error) {
  console.error(`[versioning] ERROR: ${message}`);
  if (error) {
    console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  }
  process.exit(1);
}

try {
  const easBuildFlag = String(process.env.EAS_BUILD ?? "").toLowerCase();
  const isEasBuild = easBuildFlag === "true" || easBuildFlag === "1" || process.env.CI === "true";

  if (!isEasBuild && !process.env.FORCE_IOS_BUILD_NUMBER_UPDATE) {
    log("Not running inside an EAS/CI environment. Skipping automatic iOS build number update.");
    process.exit(0);
  }

  if (process.env.EAS_BUILD_PLATFORM && process.env.EAS_BUILD_PLATFORM !== "ios") {
    log(`Build platform is "${process.env.EAS_BUILD_PLATFORM}". Skipping iOS build number update.`);
    process.exit(0);
  }

  const projectRoot = path.resolve(__dirname, "..");
  const appJsonPath = path.join(projectRoot, "app.json");

  if (!fs.existsSync(appJsonPath)) {
    fail(`app.json not found at ${appJsonPath}`);
  }

  const appJsonRaw = fs.readFileSync(appJsonPath, "utf8");
  const appJson = JSON.parse(appJsonRaw);

  if (!appJson.expo) {
    fail("Missing expo configuration in app.json.");
  }

  if (!appJson.expo.ios) {
    appJson.expo.ios = {};
  }

  const previous = Number.parseInt(appJson.expo.ios.buildNumber ?? "0", 10);
  const minimumFromEnv = Number.parseInt(process.env.IOS_BUILD_NUMBER_MIN ?? "0", 10);
  const forcedValue = Number.parseInt(process.env.IOS_BUILD_NUMBER_FORCE ?? "0", 10);

  const pbxProjectPath = path.join(projectRoot, "ios", "MonGARS.xcodeproj", "project.pbxproj");
  let pbxRaw = null;
  const pbxVersions = [];

  if (fs.existsSync(pbxProjectPath)) {
    pbxRaw = fs.readFileSync(pbxProjectPath, "utf8");
    const currentVersionRegex = /CURRENT_PROJECT_VERSION = (\d+);/g;
    let match;
    while ((match = currentVersionRegex.exec(pbxRaw))) {
      const value = Number.parseInt(match[1], 10);
      if (Number.isFinite(value)) {
        pbxVersions.push(value);
      }
    }
    if (pbxVersions.length === 0) {
      log("No CURRENT_PROJECT_VERSION entries found in project.pbxproj; skipping native project version update.");
    }
  } else {
    log("Xcode project not found; skipping native project version update.");
  }

  if (Number.isFinite(previous)) {
    log(`Previous expo.ios.buildNumber detected in app.json: ${previous}`);
  } else {
    log("No numeric expo.ios.buildNumber detected in app.json; treating as 0.");
  }

  if (Number.isFinite(minimumFromEnv) && minimumFromEnv > 0) {
    log(`Respecting IOS_BUILD_NUMBER_MIN environment override: ${minimumFromEnv}`);
  }

  const hasForcedValue = Number.isFinite(forcedValue) && forcedValue > 0;
  if (hasForcedValue) {
    log(`IOS_BUILD_NUMBER_FORCE detected; build number will be set to ${forcedValue}.`);
  }

  const numericCandidates = [];
  if (Number.isFinite(previous) && previous > 0) {
    numericCandidates.push(previous);
  }
  for (const value of pbxVersions) {
    if (value > 0) {
      numericCandidates.push(value);
    }
  }

  const highestExisting = numericCandidates.length > 0 ? Math.max(...numericCandidates) : 0;

  let nextBuildNumber;
  if (hasForcedValue) {
    nextBuildNumber = forcedValue;
    if (highestExisting > 0 && forcedValue < highestExisting) {
      log(
        `Warning: forced build number ${forcedValue} is lower than the current maximum ${highestExisting}. ` +
          "Ensure this aligns with App Store Connect history before proceeding.",
      );
    }
  } else {
    let baseline = highestExisting > 0 ? highestExisting + 1 : 1;
    if (Number.isFinite(minimumFromEnv) && minimumFromEnv > baseline) {
      baseline = minimumFromEnv;
    }
    nextBuildNumber = baseline;
  }

  const nextBuildNumberString = String(nextBuildNumber);

  appJson.expo.ios.buildNumber = nextBuildNumberString;
  fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);
  log(`Updated expo.ios.buildNumber to ${nextBuildNumberString}.`);

  if (pbxRaw !== null && pbxVersions.length > 0) {
    const updatedPbx = pbxRaw.replace(
      /CURRENT_PROJECT_VERSION = (\d+);/g,
      `CURRENT_PROJECT_VERSION = ${nextBuildNumberString};`,
    );
    fs.writeFileSync(pbxProjectPath, updatedPbx);
    log(`Updated CURRENT_PROJECT_VERSION entries in project.pbxproj to ${nextBuildNumberString}.`);
  }

  process.exit(0);
} catch (error) {
  fail("Failed to update the iOS build number automatically.", error);
}
