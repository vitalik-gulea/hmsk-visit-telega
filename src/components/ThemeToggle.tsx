import { Switch, useTheme } from '@heroui/react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Switch
      isSelected={resolvedTheme === 'dark'}
      onChange={(isSelected) => setTheme(isSelected ? 'dark' : 'light')}
    >
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        {resolvedTheme === 'dark' ? '🌙 Тёмная' : '☀️ Светлая'}
      </Switch.Content>
    </Switch>
  )
}
