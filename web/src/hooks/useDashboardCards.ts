import { useState, useEffect, useCallback } from 'react'

export interface DashboardCard {
  id: string
  card_type: string
  config: Record<string, unknown>
  title?: string
}

interface UseDashboardCardsOptions {
  storageKey: string
  defaultCards?: DashboardCard[]
}

export function useDashboardCards({ storageKey, defaultCards = [] }: UseDashboardCardsOptions) {
  const [cards, setCards] = useState<DashboardCard[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : defaultCards
    } catch {
      return defaultCards
    }
  })

  // Save to localStorage when cards change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(cards))
  }, [cards, storageKey])

  const addCard = useCallback((cardType: string, config: Record<string, unknown> = {}, title?: string) => {
    const newCard: DashboardCard = {
      id: `${cardType}-${Date.now()}`,
      card_type: cardType,
      config,
      title,
    }
    setCards(prev => [...prev, newCard])
    return newCard.id
  }, [])

  const removeCard = useCallback((cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId))
  }, [])

  const updateCardConfig = useCallback((cardId: string, config: Record<string, unknown>) => {
    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, config: { ...c.config, ...config } } : c
    ))
  }, [])

  const replaceCards = useCallback((newCards: DashboardCard[]) => {
    setCards(newCards)
  }, [])

  const clearCards = useCallback(() => {
    setCards([])
  }, [])

  return {
    cards,
    addCard,
    removeCard,
    updateCardConfig,
    replaceCards,
    clearCards,
  }
}
