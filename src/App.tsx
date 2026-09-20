import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider } from './context/auth'
import { SelectedGroupProvider } from './context/selected-group'
import { AuthGate } from './pages/AuthGate'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { GroupMenuPage } from './pages/GroupMenuPage'
import { CalendarPage } from './pages/CalendarPage'
import { RosterPage } from './pages/RosterPage'
import { AttendancePeriodPage } from './pages/AttendancePeriodPage'
import { AttendancePlayerPage } from './pages/AttendancePlayerPage'
import { AttendanceStatsPage } from './pages/AttendanceStatsPage'

function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <SelectedGroupProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="menu" element={<GroupMenuPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="roster" element={<RosterPage />} />
              <Route path="attendance" element={<AttendancePeriodPage />} />
              <Route path="attendance/player" element={<AttendancePlayerPage />} />
              <Route path="attendance/stats" element={<AttendanceStatsPage />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </SelectedGroupProvider>
      </AuthGate>
    </AuthProvider>
  )
}

export default App
