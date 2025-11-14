#!/usr/bin/env node
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";

const execFile = promisify(execFileCb);

const env = process.env;

function logSection(title) {
  console.log("\n==========================================");
  console.log(title);
  console.log("==========================================");
}

function getFirstValue(names) {
  for (const name of names) {
    const value = env[name];
    if (value && value.trim().length > 0) {
      return { name, value: value.trim() };
    }
  }
  return null;
}

async function runEasCommand(args, options = {}) {
  const mergedEnv = { ...process.env, ...options.env };
  try {
    return await execFile("eas", args, { ...options, env: mergedEnv });
  } catch (error) {
    if (error.code === "ENOENT") {
      return await execFile("npx", ["--yes", "eas-cli@latest", ...args], {
        ...options,
        env: mergedEnv,
      });
    }
    throw error;
  }
}

function normalizePem(input) {
  if (!input) {
    return input;
  }
  const withNewlines = input.replace(/\r/g, "").replace(/\\n/g, "\n");
  if (withNewlines.includes("-----BEGIN")) {
    return withNewlines;
  }
  return `-----BEGIN PRIVATE KEY-----\n${withNewlines}\n-----END PRIVATE KEY-----`;
}

function createAscJwt({ keyId, issuerId, privateKey }) {
  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 15 * 60,
    aud: "appstoreconnect-v1",
  };
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signingInput = `${encode(header)}.${encode(payload)}`;
  const signer = crypto.createSign("SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${signingInput}.${signature}`;
}

async function validateExpoToken() {
  logSection("Checking Expo (EAS) authentication");
  const tokenInfo = getFirstValue(["EXPO_TOKEN"]);
  if (!tokenInfo) {
    console.error("❌ EXPO_TOKEN is missing.");
    return false;
  }

  try {
    const { stdout } = await runEasCommand(["whoami", "--json"], {
      env: { EXPO_TOKEN: tokenInfo.value },
    });
    const info = JSON.parse(stdout);
    console.log(`✅ Authenticated as ${info?.user?.username ?? "unknown user"}`);
    if (info?.user?.ownerSlug) {
      console.log(`   Owner: ${info.user.ownerSlug}`);
    }
    return true;
  } catch (error) {
    console.error("❌ Failed to verify EXPO_TOKEN with `eas whoami`.");
    if (error?.stdout) {
      console.error(error.stdout);
    }
    if (error?.stderr) {
      console.error(error.stderr);
    }
    return false;
  }
}

async function validateAscApiKey() {
  logSection("Checking App Store Connect API key credentials");
  const keyIdInfo = getFirstValue(["EXPO_ASC_KEY_ID", "APPSTORE_API_KEY_ID"]);
  const issuerIdInfo = getFirstValue(["EXPO_ASC_ISSUER_ID", "APPSTORE_API_ISSUER_ID"]);
  const privateKeyInfo = getFirstValue(["EXPO_ASC_KEY_P8", "APPSTORE_API_PRIVATE_KEY"]);

  if (!keyIdInfo && !issuerIdInfo && !privateKeyInfo) {
    console.log("ℹ️  No App Store Connect API key secrets provided.");
    return { ok: false, jwt: null, provided: false };
  }

  if (!keyIdInfo || !issuerIdInfo || !privateKeyInfo) {
    console.error("❌ Incomplete App Store Connect API key credentials. Provide Key ID, Issuer ID, and private key.");
    return { ok: false, jwt: null, provided: true };
  }

  try {
    const privateKey = normalizePem(privateKeyInfo.value);
    const jwt = createAscJwt({
      keyId: keyIdInfo.value,
      issuerId: issuerIdInfo.value,
      privateKey,
    });

    const response = await fetch("https://api.appstoreconnect.apple.com/v1/apps?limit=1", {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`❌ App Store Connect API request failed with status ${response.status}.`);
      if (body) {
        console.error(body);
      }
      return { ok: false, jwt: null, provided: true };
    }

    console.log("✅ App Store Connect API key is valid.");
    return { ok: true, jwt, provided: true };
  } catch (error) {
    console.error("❌ Failed to authenticate with App Store Connect API key.");
    console.error(error.message ?? error);
    return { ok: false, jwt: null, provided: true };
  }
}

async function validateAppleIdCredentials() {
  logSection("Checking Apple ID authentication");
  const appleIdInfo = getFirstValue(["EXPO_APPLE_ID", "APPLE_ID"]);
  const passwordInfo = getFirstValue(["EXPO_APPLE_APP_SPECIFIC_PASSWORD", "APPLE_APP_SPECIFIC_PASSWORD"]);
  const teamIdInfo = getFirstValue(["EXPO_APPLE_TEAM_ID", "APPLE_TEAM_ID"]);

  if (!appleIdInfo && !passwordInfo && !teamIdInfo) {
    console.log("ℹ️  No Apple ID secrets provided.");
    return { ok: false, provided: false };
  }

  if (!appleIdInfo || !passwordInfo) {
    console.error("❌ Apple ID email or app-specific password is missing.");
    return { ok: false, provided: true };
  }

  const args = ["device:list", "--json", "--non-interactive"];
  if (teamIdInfo) {
    args.push("--apple-team-id", teamIdInfo.value);
  }

  try {
    const result = await runEasCommand(args, {
      env: {
        EXPO_APPLE_ID: appleIdInfo.value,
        EXPO_APPLE_APP_SPECIFIC_PASSWORD: passwordInfo.value,
        EXPO_APPLE_TEAM_ID: teamIdInfo?.value ?? "",
        APPLE_TEAM_ID: teamIdInfo?.value ?? "",
        CI: "1",
      },
    });

    const stdout = result.stdout?.trim();
    if (stdout) {
      try {
        const parsed = JSON.parse(stdout);
        const deviceCount = Array.isArray(parsed?.data) ? parsed.data.length : 0;
        console.log(`✅ Apple ID authentication succeeded. Retrieved ${deviceCount} registered device(s).`);
      } catch {
        console.log("✅ Apple ID authentication succeeded.");
      }
    } else {
      console.log("✅ Apple ID authentication succeeded.");
    }
    return { ok: true, provided: true };
  } catch (error) {
    console.error("❌ Failed to authenticate with Apple ID credentials using `eas device:list`.");
    if (error?.stdout) {
      console.error(error.stdout);
    }
    if (error?.stderr) {
      console.error(error.stderr);
    }
    return { ok: false, provided: true };
  }
}

async function validateAscAppId(jwt) {
  const appIdInfo = getFirstValue(["EXPO_ASC_APP_ID", "ASC_APP_ID"]);
  if (!appIdInfo) {
    console.log("ℹ️  No App Store Connect App ID provided.");
    return { ok: true, provided: false };
  }

  if (!jwt) {
    console.log("⚠️  Skipping App Store Connect App ID verification because API key validation failed.");
    return { ok: false, provided: true };
  }

  try {
    const response = await fetch(`https://api.appstoreconnect.apple.com/v1/apps/${appIdInfo.value}`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`❌ Unable to fetch App Store Connect app ${appIdInfo.value}. Status ${response.status}.`);
      if (body) {
        console.error(body);
      }
      return { ok: false, provided: true };
    }

    const json = await response.json();
    const name = json?.data?.attributes?.name ?? "unknown";
    console.log(`✅ App Store Connect app ${appIdInfo.value} resolved as "${name}".`);
    return { ok: true, provided: true };
  } catch (error) {
    console.error(`❌ Failed to validate App Store Connect app ${appIdInfo.value}.`);
    console.error(error.message ?? error);
    return { ok: false, provided: true };
  }
}

async function main() {
  let overallSuccess = true;

  logSection("Checking eas.json Configuration");
  if (env.GITHUB_WORKSPACE) {
    // GitHub Actions sets this env variable; ensure we run from repo root.
    process.chdir(env.GITHUB_WORKSPACE);
  }

  const fs = await import("node:fs/promises");
  try {
    await fs.access("eas.json");
    console.log("✅ eas.json found.");
  } catch {
    console.error("❌ eas.json not found.");
    overallSuccess = false;
  }

  const expoOk = await validateExpoToken();
  overallSuccess &&= expoOk;

  const apiKeyResult = await validateAscApiKey();
  if (apiKeyResult.provided) {
    overallSuccess &&= apiKeyResult.ok;
  }

  const appleIdResult = await validateAppleIdCredentials();
  if (appleIdResult.provided) {
    overallSuccess &&= appleIdResult.ok;
  }

  if (!apiKeyResult.provided && !appleIdResult.provided) {
    console.error(
      "❌ Neither App Store Connect API key nor Apple ID credentials were supplied. Provide one authentication method.",
    );
    overallSuccess = false;
  }

  const appIdResult = await validateAscAppId(apiKeyResult.jwt);
  if (appIdResult.provided) {
    overallSuccess &&= appIdResult.ok;
  }

  console.log("\n==========================================");
  if (overallSuccess) {
    console.log("✅ All secrets validated successfully.");
    console.log("==========================================");
    return;
  }

  console.error("❌ Secret validation failed. Review the errors above.");
  console.log("==========================================");
  process.exit(1);
}

await main();
