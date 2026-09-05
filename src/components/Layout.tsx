import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSelectedGroup } from '../context/selected-group'
import { Button } from '@heroui/react'

export function Layout() {
  const { selectedGroup, selectedDateLabel } = useSelectedGroup()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-4 py-3">
        {!isHome && (
          <Button variant="ghost" size="sm" onPress={() => navigate(-1)} className="self-start">
            ←
          </Button>
        )}
        {!isHome ? (
          <Link to="/" className="min-w-0 truncate font-semibold">
            <span className="text-accent">{selectedGroup}</span>
            {selectedDateLabel && (
              <>
                {' · '}
                <span className="text-accent">{selectedDateLabel}</span>
              </>
            )}
          </Link>
        ) : (
          <span className="font-semibold">ХМСК Посещение</span>
        )}
      </header>

      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
