import { Component, type ReactNode } from 'react'
import { reportError } from '../lib/report-error'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[react-error-boundary]', error)
    reportError('react-error-boundary', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background p-6 text-center text-foreground">
          <p>Что-то пошло не так.</p>
          <p className="text-foreground/60">Мы уже получили отчёт об ошибке. Попробуйте перезапустить приложение.</p>
        </div>
      )
    }

    return this.props.children
  }
}
