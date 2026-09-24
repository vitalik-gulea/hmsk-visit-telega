import { Navigate, useNavigate } from 'react-router-dom'
import { Card } from '@heroui/react'
import { useSelectedGroup } from '../context/selected-group'
import { ROLE_COACH } from '../lib/auth'
import { useAuth } from '../context/auth'

export function GroupMenuPage() {
  const { selectedGroup } = useSelectedGroup()
  const { state } = useAuth()
  const navigate = useNavigate()

  if (!selectedGroup) {
    return <Navigate to="/" replace />
  }

  const isCoach = state.status === 'authorized' && state.role === ROLE_COACH

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Что делаем?</h1>

      <div className="flex flex-col gap-3">
        {isCoach && (
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
        )}

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
            <Card.Title className="text-center text-base">
              {isCoach ? 'Получить % посещения' : 'Мой % посещения'}
            </Card.Title>
          </Card.Header>
        </Card>
      </div>
    </div>
  )
}
