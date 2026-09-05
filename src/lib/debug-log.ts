export interface LogEntry {
  level: 'log' | 'warn' | 'error'
  message: string
  timestamp: number
}

type Listener = (entries: LogEntry[]) => void

const MAX_ENTRIES = 200
let entries: LogEntry[] = []
const listeners = new Set<Listener>()

function formatArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) return arg.stack ?? arg.message
      if (typeof arg === 'string') return arg
      try {
        return JSON.stringify(arg)
      } catch {
        return String(arg)
      }
    })
    .join(' ')
}

function push(level: LogEntry['level'], args: unknown[]) {
  entries = [...entries, { level, message: formatArgs(args), timestamp: Date.now() }].slice(-MAX_ENTRIES)
  for (const listener of listeners) listener(entries)
}

/** Subscribes to captured log entries; returns an unsubscribe function. */
export function subscribeDebugLog(listener: Listener): () => void {
  listeners.add(listener)
  listener(entries)
  return () => listeners.delete(listener)
}

let installed = false

/** Mirrors console.log/warn/error into an in-memory buffer the DebugConsole reads. */
export function installDebugLogCapture() {
  if (installed) return
  installed = true

  const originalLog = console.log.bind(console)
  const originalWarn = console.warn.bind(console)
  const originalError = console.error.bind(console)

  console.log = (...args: unknown[]) => {
    originalLog(...args)
    push('log', args)
  }

  console.warn = (...args: unknown[]) => {
    originalWarn(...args)
    push('warn', args)
  }

  console.error = (...args: unknown[]) => {
    originalError(...args)
    push('error', args)
  }
}
