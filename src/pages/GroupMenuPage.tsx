import { Navigate, useNavigate } from 'react-router-dom'
import { Card } from '@heroui/react'
import { useSelectedGroup } from '../context/selected-group'

export function GroupMenuPage() {
  const { selectedGroup } = useSelectedGroup()
  const navigate = useNavigate()

  if (!selectedGroup) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Что делаем?</h1>

      <div className="flex flex-col gap-3">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => navigate('/calendar')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/calendar')
            }
          }}
          className="cursor-pointer active:scale-[0.97] transition-transform"
        >
          <Card.Header>
            <Card.Title className="text-center text-base">Заполнить расписание</Card.Title>
          </Card.Header>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => navigate('/attendance')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/attendance')
            }
          }}
          className="cursor-pointer active:scale-[0.97] transition-transform"
        >
          <Card.Header>
            <Card.Title className="text-center text-base">Получить % посещения</Card.Title>
          </Card.Header>
        </Card>
      </div>
    </div>
  )
}
