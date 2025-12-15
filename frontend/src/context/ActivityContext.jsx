import { createContext, useContext, useMemo, useState } from 'react'

const ActivityContext = createContext(null)

export function ActivityProvider({ children }){
  const [activityId, setActivityId] = useState(null)
  const [activityCode, setActivityCode] = useState('')
  const [activityName, setActivityName] = useState('')
  const value = useMemo(
    () => ({ activityId, setActivityId, activityCode, setActivityCode, activityName, setActivityName }),
    [activityId, activityCode, activityName]
  )
  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}

export function useActivity(){
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity must be used within ActivityProvider')
  return ctx
}
