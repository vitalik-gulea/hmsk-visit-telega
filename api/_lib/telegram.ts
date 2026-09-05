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

/**
 * Best-effort error alert to the admin's Telegram chat. Never throws — a
 * failed notification (e.g. missing env vars) shouldn't mask the original
 * error or crash the handler that's already failing.
 */
export async function notifyAdminError(context: string, error: unknown): Promise<void> {
  console.error(`[${context}]`, error)
  const message = error instanceof Error ? error.message : String(error)

  try {
    const adminChatId = getRequiredEnv('TELEGRAM_ADMIN_CHAT_ID')
    await sendTelegramMessage(adminChatId, `⚠️ Ошибка в ${context}:\n${message}`)
  } catch (notifyError) {
    console.error('Failed to notify admin about error:', notifyError)
  }
}
