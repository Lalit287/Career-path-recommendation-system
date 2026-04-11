import { spawn } from 'node:child_process'

const HOST = process.env.SMOKE_TEST_HOST || 'http://localhost:3000'
const START_TIMEOUT_MS = 60000
const POLL_INTERVAL_MS = 1000
const USE_EXTERNAL_SERVER = process.env.SMOKE_TEST_EXTERNAL_SERVER === '1'

function formatResult(ok, message) {
  return `${ok ? 'PASS' : 'FAIL'} ${message}`
}

async function request(path, expectedStatuses, options = {}) {
  const url = `${HOST}${path}`
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      ...options,
    })

    const ok = expectedStatuses.includes(response.status)
    return {
      ok,
      message: `${path} -> ${response.status} (expected: ${expectedStatuses.join(', ')})`,
    }
  } catch (error) {
    return {
      ok: false,
      message: `${path} -> ERROR ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

async function waitForServer() {
  const start = Date.now()

  while (Date.now() - start < START_TIMEOUT_MS) {
    try {
      const response = await fetch(`${HOST}/`, { redirect: 'manual' })
      if (response.status >= 200 && response.status < 500) {
        return true
      }
    } catch {
      // Ignore while booting.
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  return false
}

async function run() {
  let serverProcess = null

  if (!USE_EXTERNAL_SERVER) {
    serverProcess = spawn('pnpm exec next start -p 3000', {
      env: process.env,
      shell: true,
      stdio: 'inherit',
    })
  }

  const serverReady = await waitForServer()
  if (!serverReady) {
    if (serverProcess) {
      serverProcess.kill()
    }
    console.error('FAIL Server did not become ready in time.')
    process.exit(1)
  }

  const checks = [
    () => request('/', [200]),
    () => request('/careers', [200, 307]),
    () => request('/guidance', [200, 307]),
    () => request('/recommend', [200, 307]),
    () => request('/compare', [200, 307]),
    () => request('/login', [200]),
    () => request('/signup', [200]),
    () => request('/api/careers/domains', [200]),
    () => request('/api/careers', [200]),
    () => request('/api/health/ai', [200]),
    () => request('/profile', [307]),
    () => request('/admin', [307]),
    () => request('/api/auth/me', [401]),
    () => request('/api/chat', [401]),
    () => request('/api/roadmap', [401]),
  ]

  const results = []
  for (const check of checks) {
    results.push(await check())
  }

  let failed = 0
  for (const result of results) {
    if (!result.ok) failed += 1
    console.log(formatResult(result.ok, result.message))
  }

  if (failed > 0) {
    if (serverProcess) {
      serverProcess.kill()
    }
    console.error(`Smoke test completed with ${failed} failure(s).`)
    process.exit(1)
  }

  if (serverProcess) {
    serverProcess.kill()
  }
  console.log('Smoke test completed successfully.')
}

run().catch((error) => {
  console.error('FAIL Unexpected smoke test error:', error)
  process.exit(1)
})
