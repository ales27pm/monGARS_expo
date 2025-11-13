#!/usr/bin/env node

const { spawn } = require('node:child_process');

const DEFAULT_JEST_VERSION = process.env.JEST_CLI_VERSION || '30.2.0';

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
      ...options,
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('exit', (code, signal) => {
      if (signal) {
        const exitError = new Error(`Command "${command}" exited with signal ${signal}`);
        exitError.exitCode = null;
        exitError.signal = signal;
        reject(exitError);
        return;
      }

      resolve(code ?? 0);
    });
  });
}

async function runLocalJest(cliArgs) {
  const jestBinary = require.resolve('jest/bin/jest');
  const nodeArgs = [jestBinary, ...cliArgs];
  return run(process.execPath, nodeArgs);
}

async function runNpxJest(cliArgs) {
  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const npxArgs = [
    '--yes',
    '--package',
    `jest@${DEFAULT_JEST_VERSION}`,
    'jest',
    ...cliArgs,
  ];
  return run(npxCommand, npxArgs, { shell: false });
}

async function main() {
  const cliArgs = process.argv.slice(2);

  try {
    const exitCode = await runLocalJest(cliArgs);
    process.exit(exitCode);
  } catch (error) {
    if (error?.code !== 'MODULE_NOT_FOUND') {
      console.warn('[run-jest-cli] Failed to execute bundled Jest CLI, falling back to npx.', error);
    } else {
      console.warn('[run-jest-cli] Local Jest CLI not found; using npx to download jest on demand.');
    }

    try {
      const exitCode = await runNpxJest(cliArgs);
      process.exit(exitCode);
    } catch (fallbackError) {
      console.error('[run-jest-cli] Unable to execute Jest via npx.', fallbackError);
      const exitCode = typeof fallbackError?.exitCode === 'number' ? fallbackError.exitCode : 1;
      process.exit(exitCode);
    }
  }
}

main();
