import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@heroui/react'
import { useSelectedGroup } from '../context/selected-group'
import { useAuth } from '../context/auth'
import { ROLE_TRAINEE } from '../lib/auth'
import { fetchSheets, getCachedSheets, TRAINING_SPREADSHEET_ID, type SheetInfo } from '../lib/sheets'

export function Home() {
  const { state } = useAuth()
  const [sheets, setSheets] = useState<SheetInfo[] | null>(() =>
    getCachedSheets(TRAINING_SPREADSHEET_ID),
  )
  const [error, setError] = useState<string | null>(null)
  const { setSelectedGroup } = useSelectedGroup()
  const navigate = useNavigate()

  // A trainee's group was already resolved from their roster name at signup
  // — send them straight into their own attendance instead of making them
  // pick from (and see) the full list of groups.
  const knownTraineeGroup =
    state.status === 'authorized' && state.role === ROLE_TRAINEE ? state.group : null

  useEffect(() => {
    if (knownTraineeGroup) {
      setSelectedGroup(knownTraineeGroup)
      navigate('/attendance', { replace: true })
    }
  }, [knownTraineeGroup, navigate, setSelectedGroup])

  useEffect(() => {
    if (knownTraineeGroup) return
    let cancelled = false

    fetchSheets(TRAINING_SPREADSHEET_ID)
      .then((result) => {
        if (!cancelled) setSheets(result)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [knownTraineeGroup])

  function handleSelect(groupName: string) {
    setSelectedGroup(groupName)
    navigate('/menu')
  }

  if (knownTraineeGroup) {
    return <p className="text-foreground/60">Загрузка...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Выберите группу</h1>

      {error && <p className="text-danger">Не удалось загрузить группы: {error}</p>}

      {!error && !sheets && <p className="text-foreground/60">Загрузка...</p>}

      {sheets && (
        <div className="grid grid-cols-2 gap-3">
          {sheets.map((sheet) => (
            <Card
              key={sheet.index}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(sheet.name)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleSelect(sheet.name)
                }
              }}
              className="cursor-pointer active:scale-[0.97] transition-transform"
            >
              <Card.Header>
                <Card.Title className="text-center text-base">{sheet.name}</Card.Title>
              </Card.Header>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
