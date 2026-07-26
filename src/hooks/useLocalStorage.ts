import { useState, useCallback } from 'react'
import { getItem, setItem } from '@/lib/storage'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    return getItem<T>(key, initialValue)
  })

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = value instanceof Function ? value(prev) : value
        setItem(key, newValue)
        return newValue
      })
    },
    [key],
  )

  return [storedValue, setValue] as const
}
