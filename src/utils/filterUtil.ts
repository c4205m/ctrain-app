import type { Exercise } from '../db/db'
import type { MuscleGroup, DifficultyLevel } from '../db/types'
import type { FilterMode } from '../store/filterStore'

export type SortKey = 'name' | 'difficulty' | 'muscles'

export interface FilterOptions {
  muscles: MuscleGroup[]
  difficulty: DifficultyLevel[]
  movementTypes: string[]
  tools: string[]
  filterMode: FilterMode
}

export const MUSCLE_ORDER: MuscleGroup[] = [
  'neck', 'trapezius', 'front-deltoids', 'back-deltoids', 'chest', 'upper-back',
  'biceps', 'triceps', 'forearm', 'abs', 'obliques', 'lower-back',
  'gluteal', 'quadriceps', 'hamstring', 'adductor', 'abductors',
  'calves', 'knees', 'head',
]

function matchesTool(ex: Exercise, tools: string[]): boolean {
  return tools.some(t => ex.tools.includes(t))
}

export function filterExercises(exercises: Exercise[], filters: FilterOptions): Exercise[] {
  const { muscles, difficulty, movementTypes, tools, filterMode } = filters
  const hasAny = muscles.length || difficulty.length || movementTypes.length || tools.length

  return exercises.filter(ex => {
    if (!hasAny) return true

    if (filterMode === 'additive') {
      return (
        (muscles.length > 0 && muscles.some(m => ex.muscles.includes(m))) ||
        (difficulty.length > 0 && difficulty.includes(ex.difficulty)) ||
        (movementTypes.length > 0 && movementTypes.some(m => ex.movementType.includes(m))) ||
        (tools.length > 0 && matchesTool(ex, tools))
      )
    }

    // intersection (default)
    if (muscles.length && !muscles.some(m => ex.muscles.includes(m))) return false
    if (difficulty.length && !difficulty.includes(ex.difficulty)) return false
    if (movementTypes.length && !movementTypes.some(m => ex.movementType.includes(m))) return false
    if (tools.length && !matchesTool(ex, tools)) return false
    return true
  })
}

export function sortExercises(exercises: Exercise[], sort: SortKey): Exercise[] {
  return [...exercises].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name)
    if (sort === 'difficulty') {
      const order = ['Beginner', 'Intermediate', 'Advanced']
      return order.indexOf(a.difficulty) - order.indexOf(b.difficulty)
    }
    if (sort === 'muscles') {
      const idxA = a.muscles[0] != null ? MUSCLE_ORDER.indexOf(a.muscles[0]) : -1
      const idxB = b.muscles[0] != null ? MUSCLE_ORDER.indexOf(b.muscles[0]) : -1
      return (idxA === -1 ? Infinity : idxA) - (idxB === -1 ? Infinity : idxB)
    }
    return 0
  })
}
