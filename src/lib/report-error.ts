/** Fire-and-forget: sends a frontend error to /api/log-error, which forwards it to the admin's Telegram. */
export function reportError(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, message, stack, url: location.href }),
  }).catch(() => {})
}

export function installGlobalErrorReporting() {
  window.addEventListener('error', (event) => {
    const error = event.error ?? event.message
    console.error('[window.onerror]', error)
    reportError('window.onerror', error)
  })

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[unhandledrejection]', event.reason)
    reportError('unhandledrejection', event.reason)
  })
}
