import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Input from './Input'
import Button from './Button'
import Toggle from './Toggle'
import { useFilterStore } from '../store/filterStore'
import { filterExercises } from '../utils/filterUtil'
import type { Exercise } from '../db/db'

interface ExercisePickerProps {
  isOpen: boolean
  exercises: Exercise[]
  alreadySelected: string[]
  onConfirm: (ids: string[]) => void
  onClose: () => void
}

export default function ExercisePicker({ isOpen, exercises, alreadySelected, onConfirm, onClose }: ExercisePickerProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [showAll, setShowAll] = useState(false)
  const filterStore = useFilterStore()

  const scoped = showAll ? exercises : filterExercises(exercises, filterStore)
  const filtered = scoped.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  )

  function toggleSelect(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function handleConfirm() {
    onConfirm(selected)
    setSelected([])
    setSearch('')
    onClose()
  }

  function handleClose() {
    setSelected([])
    setSearch('')
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />
          <motion.div
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh]"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          >
            <div className="px-6 pt-7 pb-3 shrink-0">
              <h2 className="text-lg font-bold text-zinc-900 mb-3">Add Exercises</h2>
              <Input
                icon={<Search size={16} />}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search exercises…"
              />
              {filterStore.activeCount() > 0 && (
                <label className="flex items-center justify-between mt-3 cursor-pointer">
                  <span className="text-sm font-medium text-zinc-800">Show all</span>
                  <Toggle checked={showAll} onChange={setShowAll} />
                </label>
              )}
            </div>

            <div className="overflow-y-auto flex-1 px-6 space-y-1">
              {filtered.map(ex => {
                const isAlready = alreadySelected.includes(ex.id!)
                const isPicked = selected.includes(ex.id!)
                return (
                  <button
                    key={ex.id}
                    data-testid={`picker-row-${ex.id}`}
                    type="button"
                    disabled={isAlready}
                    onClick={() => toggleSelect(ex.id!)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                      ${isPicked ? 'bg-orange-50 border border-orange-200' : 'bg-zinc-50 border border-transparent hover:bg-zinc-100'}`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">{ex.name}</div>
                      {ex.muscles.length > 0 && (
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {ex.muscles.map(m => (
                            <span key={m} className="text-xs text-zinc-400">{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-2
                      ${isPicked ? 'bg-orange-500 border-orange-500' : 'border-zinc-300'}`}>
                      {isPicked && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="px-6 py-4 shrink-0 flex gap-2 border-t border-zinc-100">
              <Button variant="ghost" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                disabled={selected.length === 0}
                onClick={handleConfirm}
              >
                Add{selected.length > 0 ? ` (${selected.length})` : ''}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
