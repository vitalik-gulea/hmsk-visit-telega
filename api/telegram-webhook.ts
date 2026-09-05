import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRequiredEnv } from './_lib/env.js'
import { answerCallbackQuery, editMessageText } from './_lib/telegram.js'
import { appendAllowedUser } from './_lib/users-sheet.js'

interface TelegramCallbackQuery {
  id: string
  data?: string
  from: { id: number }
  message?: { message_id: number; chat: { id: number }; text?: string }
}

/** Re-derives the requester's name/username from the message text this same
 * bot sent (see access-request.ts) rather than from callback_data, which is
 * capped at 64 bytes by Telegram. */
function parseRequestMessage(text: string) {
  const nameLine = text.match(/^Имя: (.*)$/m)?.[1]?.trim() ?? ''
  const usernameLine = text.match(/^Username: (.*)$/m)?.[1]?.trim() ?? ''
  const [firstName = '', ...rest] = nameLine.split(' ')

  return {
    firstName,
    lastName: rest.join(' '),
    username: usernameLine.startsWith('@') ? usernameLine.slice(1) : '',
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = req.headers['x-telegram-bot-api-secret-token']
  if (secret !== getRequiredEnv('TELEGRAM_WEBHOOK_SECRET')) {
    res.status(401).json({ error: 'Invalid secret token' })
    return
  }

  const callbackQuery = req.body?.callback_query as TelegramCallbackQuery | undefined
  if (!callbackQuery?.data || !callbackQuery.message) {
    res.status(200).json({ ok: true })
    return
  }

  const adminChatId = getRequiredEnv('TELEGRAM_ADMIN_CHAT_ID')
  if (String(callbackQuery.from.id) !== adminChatId) {
    await answerCallbackQuery(callbackQuery.id, 'Только администратор может это подтвердить')
    res.status(200).json({ ok: true })
    return
  }

  const [action, idStr] = callbackQuery.data.split(':')
  const { chat, message_id: messageId, text = '' } = callbackQuery.message

  try {
    if (action === 'a') {
      const { firstName, lastName, username } = parseRequestMessage(text)
      await appendAllowedUser({ id: Number(idStr), firstName, lastName, username })
      await editMessageText(chat.id, messageId, `${text}\n\n✅ Доступ одобрен`)
      await answerCallbackQuery(callbackQuery.id, 'Доступ одобрен')
    } else if (action === 'd') {
      await editMessageText(chat.id, messageId, `${text}\n\n❌ Отклонено`)
      await answerCallbackQuery(callbackQuery.id, 'Отклонено')
    } else {
      await answerCallbackQuery(callbackQuery.id, 'Неизвестное действие')
    }
  } catch (error) {
    console.error(error)
    // Best-effort: the callback query itself may be why we're here (e.g. it
    // already expired), so this can fail too — never let it take down the
    // response to Telegram.
    await answerCallbackQuery(callbackQuery.id, 'Ошибка, попробуйте ещё раз').catch(() => {})
  }

  res.status(200).json({ ok: true })
}
