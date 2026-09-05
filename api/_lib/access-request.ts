import { getRequiredEnv } from './env.js'
import { sendTelegramMessage, type TelegramUser } from './telegram.js'
import { isUserAllowed } from './users-sheet.js'

/**
 * Notifies the admin about a user who wants access, with inline Approve/Reject
 * buttons. callback_data only needs to carry the id (`a:<id>` / `d:<id>`) —
 * the webhook re-derives name/username from this same message's text, which
 * keeps the payload far under Telegram's 64-byte callback_data limit.
 */
export async function requestAccess(user: TelegramUser): Promise<{ alreadyAllowed: boolean }> {
  if (await isUserAllowed(user.id)) return { alreadyAllowed: true }

  const adminChatId = getRequiredEnv('TELEGRAM_ADMIN_CHAT_ID')
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Без имени'
  const username = user.username ? `@${user.username}` : '—'

  await sendTelegramMessage(
    adminChatId,
    `Запрос доступа к приложению\nИмя: ${displayName}\nUsername: ${username}\nID: ${user.id}`,
    {
      inline_keyboard: [
        [
          { text: '✅ Одобрить', callback_data: `a:${user.id}` },
          { text: '❌ Отклонить', callback_data: `d:${user.id}` },
        ],
      ],
    },
  )

  return { alreadyAllowed: false }
}
