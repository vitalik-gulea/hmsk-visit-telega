import { getRequiredEnv } from './env.js'
import { sendTelegramMessage, type TelegramUser } from './telegram.js'
import { findPlayerGroup } from './roster.js'
import { isUserAllowed, ROLE_TRAINEE, type UserRole } from './users-sheet.js'

/**
 * Notifies the admin about a user who wants access. The role (and, for a
 * trainee, their name) is chosen by the user beforehand in the Mini App —
 * this just asks the admin to confirm or reject. callback_data only needs to
 * carry the id (`a:<id>` / `d:<id>`); the webhook re-derives everything else
 * from this same message's text, which keeps the payload far under
 * Telegram's 64-byte callback_data limit.
 */
export async function requestAccess(
  user: TelegramUser,
  role: UserRole,
  fullName?: string,
): Promise<{ alreadyAllowed: boolean }> {
  if (await isUserAllowed(user.id)) return { alreadyAllowed: true }

  const adminChatId = getRequiredEnv('TELEGRAM_ADMIN_CHAT_ID')
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Без имени'
  const username = user.username ? `@${user.username}` : '—'

  const lines = [
    'Запрос доступа к приложению',
    `Роль: ${role === ROLE_TRAINEE ? 'Тренирующийся' : 'Тренер'}`,
    `Имя: ${displayName}`,
  ]

  if (role === ROLE_TRAINEE) {
    const trimmedFullName = fullName?.trim() ?? ''
    lines.push(`ФИО в списке: ${trimmedFullName || 'не указано'}`)

    // Pre-resolves the trainee's group from the roster so the admin can see
    // (and sanity-check) it right in the approval message, instead of having
    // to go dig through the training spreadsheet by hand.
    const match = trimmedFullName ? await findPlayerGroup(trimmedFullName) : null
    lines.push(match ? `Группа: ${match.group} (в списке: «${match.name}»)` : 'Группа: не найдена автоматически')
  }

  lines.push(`Username: ${username}`, `ID: ${user.id}`)

  await sendTelegramMessage(adminChatId, lines.join('\n'), {
    inline_keyboard: [
      [
        { text: '✅ Одобрить', callback_data: `a:${user.id}` },
        { text: '❌ Отклонить', callback_data: `d:${user.id}` },
      ],
    ],
  })

  return { alreadyAllowed: false }
}
