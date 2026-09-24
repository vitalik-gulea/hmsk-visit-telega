import { getRequiredEnv } from './env.js'
import { sendTelegramMessage, type TelegramUser } from './telegram.js'
import { isUserAllowed } from './users-sheet.js'

/**
 * Notifies the admin about a user who wants access and asks which role to
 * grant them. callback_data only needs to carry a short role code and the id
 * (`a:c:<id>` for coach, `a:t:<id>` for trainee, `d:<id>` to reject) — the
 * webhook re-derives name/username from this same message's text, which keeps
 * the payload far under Telegram's 64-byte callback_data limit.
 */
export async function requestAccess(user: TelegramUser): Promise<{ alreadyAllowed: boolean }> {
  if (await isUserAllowed(user.id)) return { alreadyAllowed: true }

  const adminChatId = getRequiredEnv('TELEGRAM_ADMIN_CHAT_ID')
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Без имени'
  const username = user.username ? `@${user.username}` : '—'

  await sendTelegramMessage(
    adminChatId,
    `Запрос доступа к приложению\nИмя: ${displayName}\nUsername: ${username}\nID: ${user.id}\n\nКто это и какой доступ дать?`,
    {
      inline_keyboard: [
        [
          { text: '🏐 Тренер', callback_data: `a:c:${user.id}` },
          { text: '🙋 Тренирующийся', callback_data: `a:t:${user.id}` },
        ],
        [{ text: '❌ Отклонить', callback_data: `d:${user.id}` }],
      ],
    },
  )

  return { alreadyAllowed: false }
}
