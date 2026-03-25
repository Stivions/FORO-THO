'use client'

import { useState, useEffect, useCallback } from 'react'

export interface CategoryData {
  _id: string
  name: string
  slug: string
  icon: string
  description: string
  createdBy?: string
}

// Global listeners so all mounted instances refresh together
const listeners = new Set<() => void>()

export function notifyCategories() {
  listeners.forEach(fn => fn())
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [isLoading, setIsLoading]   = useState(true)

  const fetch_ = useCallback(() => {
    setIsLoading(true)
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    fetch_()
    listeners.add(fetch_)
    return () => { listeners.delete(fetch_) }
  }, [fetch_])

  const removeCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c._id !== id))
  }

  return { categories, isLoading, refetch: fetch_, removeCategory }
}

// kept for backwards compat
export function invalidateCategories() {
  notifyCategories()
}
