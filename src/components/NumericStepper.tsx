import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion'

const ITEM_H = 44
const VISIBLE = 5
const WINDOW_H = ITEM_H * VISIBLE

// single picker (internal)
interface PickerProps {
  value: number
  min: number
  max: number
  label?: string
  onChange: (v: number) => void
}

function Picker({ value, min, max, label, onChange }: PickerProps) {
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  const count = numbers.length
  const y = useMotionValue(valueToY(value, min))
  const dragRef = useRef(false)
  const [current, setCurrent] = useState(value)

  function valueToY(v: number, minimum: number) {
    return -(v - minimum) * ITEM_H
  }

  function yToValue(yVal: number): number {
    const idx = Math.round(-yVal / ITEM_H)
    return min + Math.max(0, Math.min(count - 1, idx))
  }

  function snapTo(v: number) {
    animate(y, valueToY(v, min), { type: 'spring', stiffness: 400, damping: 35 })
    setCurrent(v)
    onChange(v)
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="text-xs font-medium text-zinc-400">{label}</span>}
      <div className="relative overflow-hidden" style={{ height: WINDOW_H, width: 80 }}>
        <motion.div
          drag="y"
          dragConstraints={{ top: -(count - 1) * ITEM_H, bottom: 0 }}
          dragElastic={0.15}
          onDragStart={() => { dragRef.current = true }}
          onDragEnd={(_, info) => {
            dragRef.current = false
            snapTo(yToValue(y.get() + info.velocity.y * 0.08))
          }}
          className="absolute left-0 right-0 cursor-grab active:cursor-grabbing"
          style={{ y, top: ITEM_H * 2 }}
        >
          {numbers.map((n) => {
            const isSelected = n === current
            return (
              <div
                key={n}
                style={{ height: ITEM_H }}
                className="flex items-center justify-center"
                onPointerUp={() => { if (!dragRef.current) snapTo(n) }}
              >
                <motion.span
                  animate={{
                    scale: isSelected ? 1.3 : 0.85,
                    color: isSelected ? '#18181b' : '#a1a1aa',
                    fontWeight: isSelected ? 700 : 400,
                  }}
                  transition={{ duration: 0.12 }}
                  className="text-2xl select-none"
                >
                  {n}
                </motion.span>
              </div>
            )
          })}
        </motion.div>

        <div className="absolute inset-x-3 border-t border-zinc-200 pointer-events-none" style={{ top: ITEM_H * 2 }} />
        <div className="absolute inset-x-3 border-t border-zinc-200 pointer-events-none" style={{ top: ITEM_H * 3 }} />
        <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: ITEM_H * 2, background: 'linear-gradient(to bottom, white, transparent)' }} />
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: ITEM_H * 2, background: 'linear-gradient(to top, white, transparent)' }} />
      </div>
    </div>
  )
}

// public
export interface StepperConfig {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  label?: string
}

interface NumericStepperGroupProps {
  steppers: StepperConfig[]
  separator?: React.ReactNode
}

export default function NumericStepperGroup({ steppers, separator }: NumericStepperGroupProps) {
  const [open, setOpen] = useState(false)
  // draft mirrors each stepper's value; committed only on Done
  const [drafts, setDrafts] = useState(steppers.map(s => s.value))

  function openModal() {
    setDrafts(steppers.map(s => s.value))
    setOpen(true)
  }

  function confirm() {
    drafts.forEach((v, i) => steppers[i].onChange(v))
    setOpen(false)
  }

  function dismiss() {
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="flex items-center gap-2 cursor-pointer"
      >
        {steppers.map((s, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="flex flex-col items-center">
              <span className="text-2xl font-bold text-zinc-900">{s.value}</span>
              {s.label && <span className="text-xs text-zinc-400">{s.label}</span>}
            </span>
            {separator && i < steppers.length - 1 && (
              <span className="text-zinc-300 text-lg">{separator}</span>
            )}
          </span>
        ))}
      </button>

      {/* modal */}
      {createPortal(
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={dismiss}
            />

            <motion.div
              className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl px-10 py-12 shadow-2xl"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              <div className="flex items-center justify-center gap-3 mb-5">
                {steppers.map((s, i) => (
                  <span key={i} className="flex items-center gap-3">
                    <Picker
                      value={drafts[i]}
                      min={s.min}
                      max={s.max}
                      label={s.label}
                      onChange={(v) => setDrafts(d => d.map((x, j) => j === i ? v : x))}
                    />
                    {separator && i < steppers.length - 1 && (
                      <span className="text-zinc-300 text-xl mt-4">{separator}</span>
                    )}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={dismiss}
                  className="flex-1 bg-zinc-100 text-zinc-600 font-semibold py-3 rounded-2xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  className="flex-1 bg-zinc-900 text-white font-semibold py-3 rounded-2xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      , document.body)}
    </>
  )
}
