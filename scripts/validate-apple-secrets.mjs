#!/usr/bin/env node
import { execFile as execFileCb } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import crypto from "node:crypto";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

const env = process.env;

function formatErrorDetails(error) {
  if (!error || typeof error !== "object") {
    return String(error);
  }

  const fragments = [];
  if (error.name && error.message) {
    fragments.push(`${error.name}: ${error.message}`);
  } else if (error.message) {
    fragments.push(error.message);
  } else if (error.toString !== Object.prototype.toString) {
    fragments.push(String(error));
  }

  if (error.code) {
    fragments.push(`code=${error.code}`);
  }
  if (error.signal) {
    fragments.push(`signal=${error.signal}`);
  }
  if (error.status) {
    fragments.push(`status=${error.status}`);
  }
  if (error.cause) {
    fragments.push(`cause=${formatErrorDetails(error.cause)}`);
  }

  if (error.stack) {
    fragments.push(`stack=${error.stack}`);
  }

  return fragments.join(" | ");
}

function logErrorDetails(prefix, error) {
  const message = formatErrorDetails(error);
  if (message) {
    console.error(`${prefix}${message.includes("\n") ? "\n" : ""}${message}`);
  } else {
    console.error(prefix);
  }
}

function redactSecretPreview(secret) {
  if (typeof secret !== "string" || secret.length === 0) {
    return "(empty)";
  }
  if (secret.length <= 8) {
    return `${secret[0]}***${secret[secret.length - 1]}`;
  }
  return `${secret.slice(0, 4)}…${secret.slice(-4)}`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

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
    if (error?.stderr) {
      console.error(error.stderr);
    }
    if (error?.stdout) {
      console.error(error.stdout);
    }
    logErrorDetails(`❌ Failed to execute eas ${args.join(" ")}: `, error);
    throw error;
  }
}

async function runOpenssl(args, options = {}) {
  try {
    return await execFile("openssl", args, options);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        "The `openssl` binary is not available in PATH. Install OpenSSL so the P12 certificate can be inspected.",
      );
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

async function fetchExpoWhoami(token) {
  try {
    const response = await fetchWithTimeout("https://exp.host/--/api/v2/auth/whoami", {
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") ?? "unknown";
      let bodyText = "";
      try {
        bodyText = await response.text();
      } catch (bodyError) {
        bodyText = `<<failed to read body: ${formatErrorDetails(bodyError)}>>`;
      }
      const summary = bodyText ? bodyText.slice(0, 500) : "(no body)";
      const error = new Error(`HTTP ${response.status} while calling Expo whoami. content-type=${contentType}. body=${summary}`);
      error.status = response.status;
      throw error;
    }

    const json = await response.json();
    const user = json?.data?.user ?? json?.user ?? null;
    if (!user) {
      throw new Error("Response did not include user information.");
    }

    return {
      username: user.username ?? "unknown user",
      ownerSlug: user.ownerSlug ?? user.username ?? null,
    };
  } catch (error) {
    throw new Error(`Expo whoami API request failed: ${error.message ?? error}`);
  }
}

function buildExpoAuthEnv(token) {
  if (!token) {
    return {};
  }
  return {
    EXPO_TOKEN: token,
    EAS_ACCESS_TOKEN: token,
    EXPO_CLI_TOKEN: token,
  };
}

async function validateExpoToken() {
  logSection("Checking Expo (EAS) authentication");
  const tokenInfo = getFirstValue(["EXPO_TOKEN", "EAS_ACCESS_TOKEN", "EXPO_CLI_TOKEN"]);
  if (!tokenInfo) {
    console.error("❌ EXPO_TOKEN is missing.");
    return false;
  }

  console.log(
    `ℹ️  Using ${tokenInfo.name} (length=${tokenInfo.value.length}, preview=${redactSecretPreview(tokenInfo.value)}).`,
  );

  try {
    const { stdout } = await runEasCommand(["whoami", "--json", "--non-interactive"], {
      env: buildExpoAuthEnv(tokenInfo.value),
    });
    const info = JSON.parse(stdout);
    console.log(`✅ Authenticated as ${info?.user?.username ?? "unknown user"}`);
    if (info?.user?.ownerSlug) {
      console.log(`   Owner: ${info.user.ownerSlug}`);
    }
    return true;
  } catch (error) {
    console.error("⚠️  Failed to verify EXPO_TOKEN with `eas whoami`. Trying direct API request...");
    logErrorDetails("   CLI error: ", error);
  }

  try {
    const info = await fetchExpoWhoami(tokenInfo.value);
    console.log(`✅ Authenticated as ${info.username}`);
    if (info.ownerSlug) {
      console.log(`   Owner: ${info.ownerSlug}`);
    }
    return true;
  } catch (apiError) {
    console.error("❌ Failed to verify EXPO_TOKEN with both EAS CLI and Expo API.");
    logErrorDetails("   API error: ", apiError);
    if (apiError?.status === 404) {
      console.error("   The Expo API returned 404. Ensure the token is an active EAS access token and not scoped to a deleted account.");
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

function parseCertificateDetails(rawOutput) {
  const details = {};
  for (const line of rawOutput.split(/\r?\n/)) {
    if (!line) {
      continue;
    }
    const [key, ...rest] = line.split("=");
    if (!key || rest.length === 0) {
      continue;
    }
    const value = rest.join("=").trim();
    switch (key.trim().toLowerCase()) {
      case "subject":
        details.subject = value;
        break;
      case "issuer":
        details.issuer = value;
        break;
      case "serial":
        details.serial = value.toUpperCase();
        break;
      case "notafter":
        details.notAfter = value;
        break;
      default:
        break;
    }
  }
  return details;
}

function extractTeamIdFromSubject(subject) {
  if (!subject) {
    return null;
  }
  const match = subject.match(/\(([A-Z0-9]{10})\)/);
  return match ? match[1] : null;
}

async function extractP12CertificateInfo(p12Base64, password) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "validate-p12-"));
  const p12Path = path.join(tempDir, "certificate.p12");
  const passwordPath = path.join(tempDir, "password.txt");
  const certPath = path.join(tempDir, "certificate.pem");

  try {
    const normalized = p12Base64.replace(/\s+/g, "");
    const buffer = Buffer.from(normalized, "base64");
    if (!buffer.length) {
      throw new Error("Decoded P12 certificate is empty. Confirm the base64 string is valid.");
    }

    await writeFile(p12Path, buffer);
    await writeFile(passwordPath, password ?? "");

    await runOpenssl([
      "pkcs12",
      "-in",
      p12Path,
      "-passin",
      `file:${passwordPath}`,
      "-clcerts",
      "-nokeys",
      "-out",
      certPath,
    ]);

    const { stdout } = await runOpenssl([
      "x509",
      "-in",
      certPath,
      "-noout",
      "-subject",
      "-issuer",
      "-serial",
      "-enddate",
    ]);

    return parseCertificateDetails(stdout);
  } catch (error) {
    if (error?.stderr) {
      console.error(error.stderr);
    }
    throw error;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function validateP12Certificate(apiKeyResult) {
  logSection("Checking iOS Distribution Certificate (P12)");
  const p12Info = getFirstValue([
    "APPLE_CERTIFICATE",
    "IOS_P12_BASE64",
    "EXPO_IOS_DIST_P12",
    "EXPO_IOS_DIST_P12_BASE64",
  ]);
  const passwordInfo = getFirstValue(["APPLE_CERTIFICATE_PASSWORD", "IOS_P12_PASSWORD", "EXPO_IOS_DIST_P12_PASSWORD"]);

  if (!p12Info && !passwordInfo) {
    console.log("ℹ️  No P12 certificate secrets provided.");
    return { ok: false, provided: false };
  }

  if (!p12Info || !passwordInfo) {
    console.error("❌ Provide both the base64-encoded P12 certificate and its password.");
    return { ok: false, provided: true };
  }

  if (!apiKeyResult?.jwt) {
    console.error(
      "❌ Cannot verify the P12 certificate with App Store Connect because API key credentials are missing or invalid.",
    );
    return { ok: false, provided: true };
  }

  try {
    const certificate = await extractP12CertificateInfo(p12Info.value, passwordInfo.value);
    const serial = certificate.serial?.replace(/^serial=/i, "")?.replace(/:/g, "");
    if (!serial) {
      console.error("❌ Unable to read the certificate serial number from the P12 file.");
      return { ok: false, provided: true };
    }

    const expiryString = certificate.notAfter;
    if (!expiryString) {
      console.error("❌ Unable to determine the certificate expiration date.");
      return { ok: false, provided: true };
    }

    const expiryDate = new Date(expiryString);
    if (Number.isNaN(expiryDate.getTime())) {
      console.error(`❌ Failed to parse certificate expiration date: ${expiryString}`);
      return { ok: false, provided: true };
    }

    const now = new Date();
    if (expiryDate <= now) {
      console.error(`❌ Certificate expired on ${expiryDate.toUTCString()}.`);
      return { ok: false, provided: true };
    }

    const daysUntilExpiry = Math.round((expiryDate - now) / (1000 * 60 * 60 * 24));
    const subject = certificate.subject?.replace(/^subject=/i, "");
    const teamId = extractTeamIdFromSubject(subject ?? "");
    console.log(
      `✅ Extracted certificate serial ${serial.toUpperCase()} (team ${teamId ?? "unknown"}) valid until ${expiryDate.toUTCString()} (${daysUntilExpiry} day(s) remaining).`,
    );

    const url = new URL("https://api.appstoreconnect.apple.com/v1/certificates");
    url.searchParams.set("filter[serialNumber]", serial.toUpperCase());
    url.searchParams.set("limit", "1");

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKeyResult.jwt}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `❌ App Store Connect request for certificate serial ${serial.toUpperCase()} failed with status ${response.status}.`,
      );
      if (body) {
        console.error(body);
      }
      return { ok: false, provided: true };
    }

    const json = await response.json();
    const certificates = Array.isArray(json?.data) ? json.data : [];
    if (certificates.length === 0) {
      console.error(
        `❌ No App Store Connect certificate with serial ${serial.toUpperCase()} was found. Upload the correct certificate to ASC.`,
      );
      return { ok: false, provided: true };
    }

    const certificateRecord = certificates[0];
    const attributes = certificateRecord?.attributes ?? {};
    console.log(
      `✅ App Store Connect recognizes the certificate as "${attributes.name ?? "unknown"}" (${attributes.certificateType ?? "unknown type"}).`,
    );

    if (attributes.expirationDate) {
      const ascExpiry = new Date(attributes.expirationDate);
      if (Number.isNaN(ascExpiry.getTime())) {
        console.warn(`⚠️  App Store Connect returned an unparseable expiration date: ${attributes.expirationDate}.`);
      } else if (ascExpiry <= now) {
        console.error(`❌ App Store Connect reports the certificate expired on ${ascExpiry.toUTCString()}.`);
        return { ok: false, provided: true };
      }
    }

    return { ok: true, provided: true };
  } catch (error) {
    console.error("❌ Failed to validate the P12 certificate with App Store Connect.");
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

  try {
    await access("eas.json");
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

  const p12Result = await validateP12Certificate(apiKeyResult);
  if (p12Result.provided) {
    overallSuccess &&= p12Result.ok;
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
