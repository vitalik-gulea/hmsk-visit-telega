import { getRequiredEnv } from './env.js'
import { sendTelegramMessage, type TelegramUser } from './telegram.js'
import { getGroupPlayerNames } from './roster.js'
import { isUserAllowed, ROLE_TRAINEE, type UserRole } from './users-sheet.js'

/**
 * Notifies the admin about a user who wants access. The role is chosen by the
 * user beforehand in the Mini App, and a trainee also picks their exact group
 * and name from the same roster the app already shows everyone else — this
 * just asks the admin to confirm or reject. callback_data only needs to carry
 * the id (`a:<id>` / `d:<id>`); the webhook re-derives everything else from
 * this same message's text, which keeps the payload far under Telegram's
 * 64-byte callback_data limit.
 */
export async function requestAccess(
  user: TelegramUser,
  role: UserRole,
  fullName?: string,
  group?: string,
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
    const trimmedGroup = group?.trim() ?? ''

    // The name and group were picked from the app's own roster list, not
    // typed freely — but the request still travels over a public API, so
    // this re-checks the pick actually exists before trusting it. This gates
    // what a trainee is later allowed to see, so a spoofed pick would be a
    // privacy leak, not just a UX glitch.
    const players = trimmedGroup ? await getGroupPlayerNames(trimmedGroup) : []
    if (!trimmedFullName || !trimmedGroup || !players.includes(trimmedFullName)) {
      throw new Error('Выбранные группа и игрок не найдены в таблице учёта')
    }

    lines.push(`ФИО в списке: ${trimmedFullName}`, `Группа: ${trimmedGroup}`)
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
