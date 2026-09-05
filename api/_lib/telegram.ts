import { createHmac } from 'node:crypto'
import { getRequiredEnv } from './env.js'

export interface TelegramUser {
  id: number
  firstName: string
  lastName: string
  username: string
}

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60

/**
 * Validates Telegram Mini App initData per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * Returns the authenticated user, or null if the signature is invalid/stale.
 */
export function verifyInitData(initData: string): TelegramUser | null {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = createHmac('sha256', 'WebAppData').update(getRequiredEnv('TELEGRAM_BOT_TOKEN')).digest()
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  if (computedHash !== hash) return null

  const authDate = Number(params.get('auth_date'))
  if (!authDate || Date.now() / 1000 - authDate > MAX_INIT_DATA_AGE_SECONDS) return null

  const userJson = params.get('user')
  if (!userJson) return null

  const raw = JSON.parse(userJson) as {
    id: number
    first_name?: string
    last_name?: string
    username?: string
  }

  return {
    id: raw.id,
    firstName: raw.first_name ?? '',
    lastName: raw.last_name ?? '',
    username: raw.username ?? '',
  }
}

async function callTelegramApi(method: string, body: Record<string, unknown>): Promise<unknown> {
  const botToken = getRequiredEnv('TELEGRAM_BOT_TOKEN')
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Telegram API error (${method}): ${await response.text()}`)
  }
  return response.json()
}

export function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: unknown) {
  return callTelegramApi('sendMessage', { chat_id: chatId, text, reply_markup: replyMarkup })
}

export function answerCallbackQuery(callbackQueryId: string, text: string) {
  return callTelegramApi('answerCallbackQuery', { callback_query_id: callbackQueryId, text })
}

export function editMessageText(chatId: string | number, messageId: number, text: string) {
  return callTelegramApi('editMessageText', { chat_id: chatId, message_id: messageId, text })
}

const originalConsoleError = console.error.bind(console)
const originalConsoleWarn = console.warn.bind(console)

function formatLogArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) return arg.stack ?? arg.message
      if (typeof arg === 'string') return arg
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
}

/**
 * Sends one message to the admin's Telegram chat and waits for it to finish.
 * Vercel functions freeze right after the response is sent, so anything
 * fire-and-forget (an un-awaited fetch) risks being cut off mid-request —
 * callers that need reliable delivery must `await` this before responding.
 */
async function sendAdminLog(text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (!botToken || !adminChatId) return

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: adminChatId, text: text.slice(0, 4000) }),
    })
    if (!response.ok) originalConsoleError('Failed to deliver admin log:', await response.text())
  } catch (err) {
    // Use the original console.error — the patched one below would recurse.
    originalConsoleError('Failed to deliver admin log:', err)
  }
}

/** Reports an error to the admin's Telegram chat. Always await this before responding. */
export async function notifyAdminError(context: string, error: unknown): Promise<void> {
  const detail = error instanceof Error ? (error.stack ?? error.message) : formatLogArgs([error])
  originalConsoleError(`[${context}]`, error)
  await sendAdminLog(`⚠️ Ошибка в ${context}:\n${detail}`)
}

let consoleForwardingInstalled = false

/**
 * Mirrors every `console.error`/`console.warn` call to the admin's Telegram
 * chat, on top of the normal stdout/stderr output (which Vercel still
 * captures in its function logs). This is a best-effort safety net for
 * errors we didn't explicitly wrap with `notifyAdminError` — since nothing
 * awaits it, delivery can still be cut off if the handler responds
 * immediately after logging with nothing else to await.
 */
// Node prints its own runtime notices (experimental features, deprecations)
// via console.error/warn, prefixed like "(node:1234) ...". Not app errors —
// skip forwarding those so the admin chat isn't spammed with Node internals.
const NODE_RUNTIME_NOTICE = /^\(node:\d+\)/

export function installConsoleForwarding(): void {
  if (consoleForwardingInstalled) return
  consoleForwardingInstalled = true

  console.error = (...args: unknown[]) => {
    originalConsoleError(...args)
    const text = formatLogArgs(args)
    if (!NODE_RUNTIME_NOTICE.test(text)) void sendAdminLog(`⚠️ error: ${text}`)
  }

  console.warn = (...args: unknown[]) => {
    originalConsoleWarn(...args)
    const text = formatLogArgs(args)
    if (!NODE_RUNTIME_NOTICE.test(text)) void sendAdminLog(`⚡ warn: ${text}`)
  }
}

installConsoleForwarding()
