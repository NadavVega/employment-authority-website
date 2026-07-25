import { spawn } from 'node:child_process';

const databaseUrl =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL or DATABASE_URL is required for the startup smoke test',
  );
}

const startupScript = process.argv[2] ?? 'dev';
if (startupScript !== 'dev' && startupScript !== 'start') {
  throw new Error('Startup smoke script must be dev or start');
}

const port = Number(process.env.SMOKE_TEST_PORT ?? 3217);
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn('npm', ['run', startupScript], {
  cwd: process.cwd(),
  detached: process.platform !== 'win32',
  env: {
    ...process.env,
    NODE_ENV: 'test',
    PORT: String(port),
    LOG_LEVEL: 'silent',
    REQUEST_BODY_LIMIT: '1mb',
    CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
    DATABASE_URL: databaseUrl,
    DATABASE_SSL: 'disable',
    DB_POOL_MAX: '2',
    DB_CONNECTION_TIMEOUT_MS: '1000',
    DB_IDLE_TIMEOUT_MS: '1000',
    DB_STATEMENT_TIMEOUT_MS: '5000',
    DB_IDLE_IN_TRANSACTION_TIMEOUT_MS: '5000',
    DB_READINESS_TIMEOUT_MS: '1000',
    FIREBASE_PROJECT_ID: 'backend-v2-smoke-test-project',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
child.stdout.on('data', (chunk) => {
  output = boundedOutput(output, chunk);
});
child.stderr.on('data', (chunk) => {
  output = boundedOutput(output, chunk);
});

try {
  await waitForHealthyProcess(child, `${baseUrl}/api/v1/health`);
  await expectJson(`${baseUrl}/api/v1/health`, 200, { status: 'ok' });
  await expectJson(`${baseUrl}/api/v1/health/ready`, 200, {
    status: 'ready',
  });
  process.stdout.write(
    `Backend V2 ${startupScript} startup smoke test passed.\n`,
  );
} catch (error) {
  const detail = error instanceof Error ? error.message : 'Unknown smoke error';
  throw new Error(`${detail}\n${output}`.trim(), { cause: error });
} finally {
  await stopProcess(child);
}

function boundedOutput(existing, chunk) {
  return `${existing}${String(chunk)}`.slice(-8_000);
}

async function waitForHealthyProcess(processHandle, url) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(
        `Development process exited early with code ${processHandle.exitCode}`,
      );
    }

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) {
        return;
      }
    } catch {
      // The Nest compiler/server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error('Timed out waiting for the development server');
}

async function expectJson(url, expectedStatus, expectedBody) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(2_000),
  });
  const body = await response.json();
  if (
    response.status !== expectedStatus ||
    JSON.stringify(body) !== JSON.stringify(expectedBody)
  ) {
    throw new Error(`Unexpected smoke response from ${new URL(url).pathname}`);
  }
}

async function stopProcess(processHandle) {
  if (processHandle.exitCode !== null || processHandle.pid === undefined) {
    return;
  }

  if (process.platform === 'win32') {
    processHandle.kill('SIGTERM');
  } else {
    process.kill(-processHandle.pid, 'SIGTERM');
  }

  await Promise.race([
    new Promise((resolve) => processHandle.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);

  if (processHandle.exitCode === null) {
    if (process.platform === 'win32') {
      processHandle.kill('SIGKILL');
    } else {
      process.kill(-processHandle.pid, 'SIGKILL');
    }
  }
}
