import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const GROUP_STORAGE_KEY = 'hmsk-selected-group'
const DATE_STORAGE_KEY = 'hmsk-selected-date'
const DATE_LABEL_STORAGE_KEY = 'hmsk-selected-date-label'

interface SelectedGroupContextValue {
  selectedGroup: string | null
  setSelectedGroup: (group: string | null) => void
  selectedDate: string | null
  selectedDateLabel: string | null
  setSelectedDate: (date: string | null, label: string | null) => void
}

const SelectedGroupContext = createContext<SelectedGroupContextValue | null>(null)

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(key)
}

export function SelectedGroupProvider({ children }: { children: ReactNode }) {
  const [selectedGroup, setSelectedGroupState] = useState<string | null>(() =>
    readStorage(GROUP_STORAGE_KEY),
  )
  const [selectedDate, setSelectedDateState] = useState<string | null>(() =>
    readStorage(DATE_STORAGE_KEY),
  )
  const [selectedDateLabel, setSelectedDateLabelState] = useState<string | null>(() =>
    readStorage(DATE_LABEL_STORAGE_KEY),
  )

  useEffect(() => {
    if (selectedGroup) {
      localStorage.setItem(GROUP_STORAGE_KEY, selectedGroup)
    } else {
      localStorage.removeItem(GROUP_STORAGE_KEY)
    }
  }, [selectedGroup])

  useEffect(() => {
    if (selectedDate) {
      localStorage.setItem(DATE_STORAGE_KEY, selectedDate)
    } else {
      localStorage.removeItem(DATE_STORAGE_KEY)
    }
    if (selectedDateLabel) {
      localStorage.setItem(DATE_LABEL_STORAGE_KEY, selectedDateLabel)
    } else {
      localStorage.removeItem(DATE_LABEL_STORAGE_KEY)
    }
  }, [selectedDate, selectedDateLabel])

  function setSelectedGroup(group: string | null) {
    setSelectedGroupState(group)
    // Switching group invalidates whichever date was picked for the old one.
    setSelectedDateState(null)
    setSelectedDateLabelState(null)
  }

  function setSelectedDate(date: string | null, label: string | null) {
    setSelectedDateState(date)
    setSelectedDateLabelState(label)
  }

  return (
    <SelectedGroupContext.Provider
      value={{ selectedGroup, setSelectedGroup, selectedDate, selectedDateLabel, setSelectedDate }}
    >
      {children}
    </SelectedGroupContext.Provider>
  )
}

export function useSelectedGroup() {
  const context = useContext(SelectedGroupContext)
  if (!context) {
    throw new Error('useSelectedGroup must be used within a SelectedGroupProvider')
  }
  return context
}
