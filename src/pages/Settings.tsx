import { ThemeToggle } from '../components/ThemeToggle'

export function Settings() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-xl font-semibold">Настройки</h1>
      <ThemeToggle />
    </div>
  )
}
