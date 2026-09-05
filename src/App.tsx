import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SelectedGroupProvider } from './context/selected-group'
import { Home } from './pages/Home'
import { Settings } from './pages/Settings'
import { CalendarPage } from './pages/CalendarPage'
import { RosterPage } from './pages/RosterPage'

function App() {
  return (
    <SelectedGroupProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="roster" element={<RosterPage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </SelectedGroupProvider>
  )
}

export default App
