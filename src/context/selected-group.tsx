import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const GROUP_STORAGE_KEY = 'hmsk-selected-group'
const DATE_STORAGE_KEY = 'hmsk-selected-date'
const DATE_LABEL_STORAGE_KEY = 'hmsk-selected-date-label'
const PERIOD_STORAGE_KEY = 'hmsk-selected-period'
const PERIOD_LABEL_STORAGE_KEY = 'hmsk-selected-period-label'
const PLAYER_STORAGE_KEY = 'hmsk-selected-player'

interface SelectedGroupContextValue {
  selectedGroup: string | null
  setSelectedGroup: (group: string | null) => void
  selectedDate: string | null
  selectedDateLabel: string | null
  setSelectedDate: (date: string | null, label: string | null) => void
  selectedPeriod: string | null
  selectedPeriodLabel: string | null
  setSelectedPeriod: (period: string | null, label: string | null) => void
  selectedPlayerName: string | null
  setSelectedPlayerName: (name: string | null) => void
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
  const [selectedPeriod, setSelectedPeriodState] = useState<string | null>(() =>
    readStorage(PERIOD_STORAGE_KEY),
  )
  const [selectedPeriodLabel, setSelectedPeriodLabelState] = useState<string | null>(() =>
    readStorage(PERIOD_LABEL_STORAGE_KEY),
  )
  const [selectedPlayerName, setSelectedPlayerNameState] = useState<string | null>(() =>
    readStorage(PLAYER_STORAGE_KEY),
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

  useEffect(() => {
    if (selectedPeriod) {
      localStorage.setItem(PERIOD_STORAGE_KEY, selectedPeriod)
    } else {
      localStorage.removeItem(PERIOD_STORAGE_KEY)
    }
    if (selectedPeriodLabel) {
      localStorage.setItem(PERIOD_LABEL_STORAGE_KEY, selectedPeriodLabel)
    } else {
      localStorage.removeItem(PERIOD_LABEL_STORAGE_KEY)
    }
  }, [selectedPeriod, selectedPeriodLabel])

  useEffect(() => {
    if (selectedPlayerName) {
      localStorage.setItem(PLAYER_STORAGE_KEY, selectedPlayerName)
    } else {
      localStorage.removeItem(PLAYER_STORAGE_KEY)
    }
  }, [selectedPlayerName])

  function setSelectedGroup(group: string | null) {
    setSelectedGroupState(group)
    // Switching group invalidates whatever was picked for the old one.
    setSelectedDateState(null)
    setSelectedDateLabelState(null)
    setSelectedPeriodState(null)
    setSelectedPeriodLabelState(null)
    setSelectedPlayerNameState(null)
  }

  function setSelectedDate(date: string | null, label: string | null) {
    setSelectedDateState(date)
    setSelectedDateLabelState(label)
  }

  function setSelectedPeriod(period: string | null, label: string | null) {
    setSelectedPeriodState(period)
    setSelectedPeriodLabelState(label)
    // A new period invalidates whichever player's stats were being viewed.
    setSelectedPlayerNameState(null)
  }

  function setSelectedPlayerName(name: string | null) {
    setSelectedPlayerNameState(name)
  }

  return (
    <SelectedGroupContext.Provider
      value={{
        selectedGroup,
        setSelectedGroup,
        selectedDate,
        selectedDateLabel,
        setSelectedDate,
        selectedPeriod,
        selectedPeriodLabel,
        setSelectedPeriod,
        selectedPlayerName,
        setSelectedPlayerName,
      }}
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
