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

  const nowSeconds = Math.floor(Date.now() / 1000);
  const previous = Number.parseInt(appJson.expo.ios.buildNumber ?? "0", 10);
  const minimumFromEnv = Number.parseInt(process.env.IOS_BUILD_NUMBER_MIN ?? "0", 10);

  if (Number.isFinite(previous)) {
    log(`Previous expo.ios.buildNumber detected in app.json: ${previous}`);
  } else {
    log("No numeric expo.ios.buildNumber detected in app.json; treating as 0.");
  }

  if (Number.isFinite(minimumFromEnv) && minimumFromEnv > 0) {
    log(`Respecting IOS_BUILD_NUMBER_MIN environment override: ${minimumFromEnv}`);
  }

  const baseline = Math.max(
    Number.isFinite(previous) ? previous + 1 : 0,
    Number.isFinite(minimumFromEnv) ? minimumFromEnv : 0,
  );
  const nextBuildNumber = Math.max(nowSeconds, baseline);
  const nextBuildNumberString = String(nextBuildNumber);

  appJson.expo.ios.buildNumber = nextBuildNumberString;
  fs.writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);
  log(`Updated expo.ios.buildNumber to ${nextBuildNumberString}.`);

  const pbxProjectPath = path.join(projectRoot, "ios", "MonGARS.xcodeproj", "project.pbxproj");
  if (fs.existsSync(pbxProjectPath)) {
    const pbxRaw = fs.readFileSync(pbxProjectPath, "utf8");
    const currentVersionRegex = /CURRENT_PROJECT_VERSION = (\d+);/g;
    if (!currentVersionRegex.test(pbxRaw)) {
      log("No CURRENT_PROJECT_VERSION entries found in project.pbxproj; skipping update.");
    } else {
      const updatedPbx = pbxRaw.replace(
        /CURRENT_PROJECT_VERSION = (\d+);/g,
        `CURRENT_PROJECT_VERSION = ${nextBuildNumberString};`,
      );
      fs.writeFileSync(pbxProjectPath, updatedPbx);
      log(`Updated CURRENT_PROJECT_VERSION entries in project.pbxproj to ${nextBuildNumberString}.`);
    }
  } else {
    log("Xcode project not found; skipping native project version update.");
  }

  process.exit(0);
} catch (error) {
  fail("Failed to update the iOS build number automatically.", error);
}
