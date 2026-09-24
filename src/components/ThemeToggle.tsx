import { Chip, useTheme } from '@heroui/react'

const THEME_OPTIONS: { key: string; label: string }[] = [
  { key: 'system', label: '💻 Авто' },
  { key: 'light', label: '☀️ Светлая' },
  { key: 'dark', label: '🌙 Тёмная' },
]

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {THEME_OPTIONS.map(({ key, label }) => (
          <Chip
            key={key}
            role="button"
            tabIndex={0}
            color={theme === key ? 'accent' : 'default'}
            variant={theme === key ? 'primary' : 'soft'}
            className="cursor-pointer select-none"
            onClick={() => setTheme(key)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setTheme(key)
              }
            }}
          >
            {label}
          </Chip>
        ))}
      </div>

      {theme === 'system' && (
        <p className="text-sm text-foreground/60">
          Сейчас: {resolvedTheme === 'dark' ? 'тёмная' : 'светлая'} — по настройкам устройства
        </p>
      )}
    </div>
  )
}
