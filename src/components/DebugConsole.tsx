import { useEffect, useState } from 'react'
import { subscribeDebugLog, type LogEntry } from '../lib/debug-log'

/** Floating "🐞" button that opens an in-app log/error console — no devtools needed. */
export function DebugConsole() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => subscribeDebugLog(setEntries), [])

  const errorCount = entries.filter((entry) => entry.level === 'error').length

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-lg shadow-lg"
      >
        🐞
        {errorCount > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-danger px-1.5 text-[10px] leading-4 text-white">
            {errorCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
          <div className="flex items-center justify-between border-b border-border p-3">
            <span className="font-semibold">Логи и ошибки</span>
            <button type="button" onClick={() => setOpen(false)} className="text-accent">
              Закрыть
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {entries.length === 0 && <p className="text-foreground/60">Пока пусто.</p>}

            {entries
              .slice()
              .reverse()
              .map((entry, i) => (
                <pre
                  key={i}
                  className={
                    'mb-2 whitespace-pre-wrap break-words rounded-lg p-2 text-xs ' +
                    (entry.level === 'error' ? 'bg-danger/10 text-danger' : 'bg-surface')
                  }
                >
                  {new Date(entry.timestamp).toLocaleTimeString()} [{entry.level}] {entry.message}
                </pre>
              ))}
          </div>
        </div>
      )}
    </>
  )
}
