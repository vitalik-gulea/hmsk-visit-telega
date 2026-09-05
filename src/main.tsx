import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { DebugConsole } from './components/DebugConsole.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { installDebugLogCapture } from './lib/debug-log.ts'
import { installGlobalErrorReporting } from './lib/report-error.ts'
import '../global.css'

installDebugLogCapture()
installGlobalErrorReporting()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
    <DebugConsole />
  </StrictMode>,
)
