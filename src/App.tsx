import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useTheme } from '@heroui/react'
import { Layout } from './components/Layout'
import { AuthProvider, useAuth } from './context/auth'
import { SelectedGroupProvider } from './context/selected-group'
import { AuthGate } from './pages/AuthGate'
import { Home } from './pages/Home'
import { GroupMenuPage } from './pages/GroupMenuPage'
import { CalendarPage } from './pages/CalendarPage'
import { RosterPage } from './pages/RosterPage'
import { AttendancePeriodPage } from './pages/AttendancePeriodPage'
import { AttendancePlayerPage } from './pages/AttendancePlayerPage'
import { AttendanceStatsPage } from './pages/AttendanceStatsPage'
import { ROLE_COACH } from './lib/auth'

// Filling the schedule/roster is a coach-only action — a trainee who
// somehow lands on these routes (deep link, back button) is bounced home
// rather than shown the UI, on top of GroupMenuPage already hiding the entry
// point.
function RequireCoach({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const isCoach = state.status === 'authorized' && state.role === ROLE_COACH
  return isCoach ? <>{children}</> : <Navigate to="/" replace />
}

function App() {
  // No manual light/dark switch — the app always follows the OS/device
  // preference, which this hook keeps applied to the document.
  useTheme()

  return (
    <AuthProvider>
      <AuthGate>
        <SelectedGroupProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="menu" element={<GroupMenuPage />} />
              <Route
                path="calendar"
                element={
                  <RequireCoach>
                    <CalendarPage />
                  </RequireCoach>
                }
              />
              <Route
                path="roster"
                element={
                  <RequireCoach>
                    <RosterPage />
                  </RequireCoach>
                }
              />
              <Route path="attendance" element={<AttendancePeriodPage />} />
              <Route path="attendance/player" element={<AttendancePlayerPage />} />
              <Route path="attendance/stats" element={<AttendanceStatsPage />} />
            </Route>
          </Routes>
        </SelectedGroupProvider>
      </AuthGate>
    </AuthProvider>
  )
}

export default App
