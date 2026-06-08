import { create } from 'zustand'
import type { MuscleGroup, DifficultyLevel } from '../db/types'

export type FilterMode = 'intersection' | 'additive'

interface FilterState {
  muscles: MuscleGroup[]
  difficulty: DifficultyLevel[]
  movementTypes: string[]
  tools: string[]
  filterMode: FilterMode
  setMuscles: (v: MuscleGroup[]) => void
  setDifficulty: (v: DifficultyLevel[]) => void
  setMovementTypes: (v: string[]) => void
  setTools: (v: string[]) => void
  setFilterMode: (v: FilterMode) => void
  reset: () => void
  activeCount: () => number
}

export const useFilterStore = create<FilterState>((set, get) => ({
  muscles: [],
  difficulty: [],
  movementTypes: [],
  tools: [],
  filterMode: 'intersection',
  setMuscles: (v) => set({ muscles: v }),
  setDifficulty: (v) => set({ difficulty: v }),
  setMovementTypes: (v) => set({ movementTypes: v }),
  setTools: (v) => set({ tools: v }),
  setFilterMode: (v) => set({ filterMode: v }),
  reset: () => set({ muscles: [], difficulty: [], movementTypes: [], tools: [] }),
  activeCount: () => {
    const s = get()
    return s.muscles.length + s.difficulty.length + s.movementTypes.length + s.tools.length
  },
}))
