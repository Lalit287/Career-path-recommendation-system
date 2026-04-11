type WindowState = {
  windowStartMs: number
  count: number
}

const WINDOW_MS = 60_000
const providerWindows = new Map<string, WindowState>()
const providerCooldownUntil = new Map<string, number>()
const providerFailureStreak = new Map<string, number>()
const providerQueues = new Map<string, Promise<void>>()

export function isProviderCoolingDown(providerId: string, now = Date.now()): boolean {
  const until = providerCooldownUntil.get(providerId) ?? 0
  return until > now
}

export function tryAcquireProviderSlot(
  providerId: string,
  maxRequestsPerMinute: number,
  now = Date.now()
): boolean {
  const state = providerWindows.get(providerId)

  if (!state || now - state.windowStartMs >= WINDOW_MS) {
    providerWindows.set(providerId, { windowStartMs: now, count: 1 })
    return true
  }

  if (state.count >= maxRequestsPerMinute) {
    return false
  }

  state.count += 1
  return true
}

export function noteProviderSuccess(providerId: string): void {
  providerFailureStreak.set(providerId, 0)
}

export function noteProviderFailure(params: {
  providerId: string
  statusCode?: number
  cooldownMs: number
  failureThreshold: number
}): void {
  const { providerId, statusCode, cooldownMs, failureThreshold } = params

  // Only treat throttle/temporary-unavailable statuses as circuit-breaker signals.
  if (statusCode !== 429 && statusCode !== 503) {
    return
  }

  const nextStreak = (providerFailureStreak.get(providerId) ?? 0) + 1
  providerFailureStreak.set(providerId, nextStreak)

  if (nextStreak >= failureThreshold) {
    providerCooldownUntil.set(providerId, Date.now() + cooldownMs)
    providerFailureStreak.set(providerId, 0)
  }
}

export async function runInProviderQueue<T>(
  providerId: string,
  task: () => Promise<T>
): Promise<T> {
  const previous = providerQueues.get(providerId) ?? Promise.resolve()

  const nextTask = previous.catch(() => undefined).then(task)
  providerQueues.set(
    providerId,
    nextTask.then(() => undefined, () => undefined)
  )

  return nextTask
}
