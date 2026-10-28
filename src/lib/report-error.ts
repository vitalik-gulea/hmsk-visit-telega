import { apiFetch } from './api'

/** Fire-and-forget: sends a frontend error to /api/log-error, which forwards it to the admin's Telegram. */
export function reportError(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  apiFetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Origin + path only: the URL hash carries the Telegram session's signed
    // initData (tgWebAppData), which must never end up in logs or chats.
    body: JSON.stringify({ context, message, stack, url: location.origin + location.pathname }),
  }).catch(() => {})
}

export function installGlobalErrorReporting() {
  window.addEventListener('error', (event) => {
    // A cross-origin script failure (e.g. Telegram's own injected scripts in
    // the WebView) surfaces as a bare "Script error." with no error object, no
    // file and no stack — nothing we can act on, so don't page the admin.
    if (!event.error && (event.message === 'Script error.' || !event.filename)) return

    const error = event.error ?? event.message
    console.error('[window.onerror]', error)
    reportError('window.onerror', error)
  })

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[unhandledrejection]', event.reason)
    reportError('unhandledrejection', event.reason)
  })
}
