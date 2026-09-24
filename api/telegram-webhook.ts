import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRequiredEnv } from './_lib/env.js'
import { answerCallbackQuery, editMessageText, notifyAdminError, sendTelegramMessage } from './_lib/telegram.js'
import { appendAllowedUser, ROLE_COACH, ROLE_TRAINEE, type UserRole } from './_lib/users-sheet.js'

interface TelegramCallbackQuery {
  id: string
  data?: string
  from: { id: number }
  message?: { message_id: number; chat: { id: number }; text?: string }
}

interface ParsedRequest {
  firstName: string
  lastName: string
  username: string
  role: UserRole
  fullName: string
  group: string
}

/** Re-derives the requester's name/role/username from the message text this
 * same bot sent (see access-request.ts) rather than from callback_data, which
 * is capped at 64 bytes by Telegram. */
function parseRequestMessage(text: string): ParsedRequest {
  const nameLine = text.match(/^Имя: (.*)$/m)?.[1]?.trim() ?? ''
  const usernameLine = text.match(/^Username: (.*)$/m)?.[1]?.trim() ?? ''
  const roleLine = text.match(/^Роль: (.*)$/m)?.[1]?.trim() ?? ''
  const fullNameLine = text.match(/^ФИО в списке: (.*)$/m)?.[1]?.trim() ?? ''
  const groupLine = text.match(/^Группа: (.*)$/m)?.[1]?.trim() ?? ''
  const [firstName = '', ...rest] = nameLine.split(' ')

  return {
    firstName,
    lastName: rest.join(' '),
    username: usernameLine.startsWith('@') ? usernameLine.slice(1) : '',
    role: roleLine === 'Тренирующийся' ? ROLE_TRAINEE : ROLE_COACH,
    fullName: fullNameLine,
    group: groupLine,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
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
        const { firstName, lastName, username, role, fullName, group } = parseRequestMessage(text)
        await appendAllowedUser({ id: Number(idStr), firstName, lastName, username, role, fullName, group })

        const userMessage =
          role === ROLE_TRAINEE
            ? `✅ Ваш запрос на доступ одобрен!\nГруппа: ${group}\nИмя в списке: ${fullName}\n\nОткройте приложение ещё раз, чтобы посмотреть свою посещаемость.`
            : '✅ Ваш запрос на доступ одобрен!\n\nОткройте приложение ещё раз — доступ тренера уже активен.'

        // Best-effort: the user may have blocked the bot or never opened a
        // chat with it, which would make this fail — that shouldn't stop the
        // approval itself from going through, just gets flagged in the admin
        // chat so they know to follow up another way.
        const notifyFailed = await sendTelegramMessage(Number(idStr), userMessage)
          .then(() => false)
          .catch(async (error) => {
            await notifyAdminError('telegram-webhook notify approved user', error)
            return true
          })

        await editMessageText(
          chat.id,
          messageId,
          `${text}\n\n✅ Доступ одобрен${notifyFailed ? ' (не удалось уведомить пользователя)' : ''}`,
        )
        await answerCallbackQuery(callbackQuery.id, 'Доступ одобрен')
      } else if (action === 'd') {
        await sendTelegramMessage(Number(idStr), '❌ Ваш запрос на доступ отклонён.').catch(async (error) => {
          await notifyAdminError('telegram-webhook notify rejected user', error)
        })
        await editMessageText(chat.id, messageId, `${text}\n\n❌ Отклонено`)
        await answerCallbackQuery(callbackQuery.id, 'Отклонено')
      } else {
        await answerCallbackQuery(callbackQuery.id, 'Неизвестное действие')
      }
    } catch (error) {
      await notifyAdminError('telegram-webhook callback', error)
      // Best-effort: the callback query itself may be why we're here (e.g. it
      // already expired), so this can fail too — never let it take down the
      // response to Telegram.
      await answerCallbackQuery(callbackQuery.id, 'Ошибка, попробуйте ещё раз').catch(() => {})
    }

    res.status(200).json({ ok: true })
  } catch (error) {
    await notifyAdminError('telegram-webhook', error)
    if (!res.headersSent) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }
}
