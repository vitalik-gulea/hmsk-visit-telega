import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@heroui/react'
import { useSelectedGroup } from '../context/selected-group'
import { fetchSheets, getCachedSheets, TRAINING_SPREADSHEET_ID, type SheetInfo } from '../lib/sheets'

export function Home() {
  const [sheets, setSheets] = useState<SheetInfo[] | null>(() =>
    getCachedSheets(TRAINING_SPREADSHEET_ID),
  )
  const [error, setError] = useState<string | null>(null)
  const { setSelectedGroup } = useSelectedGroup()
  const navigate = useNavigate()

  useEffect(() => {
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
  }, [])

  function handleSelect(groupName: string) {
    setSelectedGroup(groupName)
    navigate('/calendar')
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
