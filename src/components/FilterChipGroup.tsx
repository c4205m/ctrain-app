import { useRef, useLayoutEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Chip from './Chip'

interface FilterChipGroupProps<T extends string> {
  values: T[]
  selected: T[]
  onToggle: (value: T) => void
  row?: number
}

export default function FilterChipGroup<T extends string>({
  values,
  selected,
  onToggle,
  row = 4,
}: FilterChipGroupProps<T>) {
  const [expanded, setExpanded] = useState(false)
  const [collapsedHeight, setCollapsedHeight] = useState(0)
  const [fullHeight, setFullHeight] = useState(0)
  const [hasHiddenSelected, setHasHiddenSelected] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // useLayoutEffect fires before paint so measurements are taken before framer sets maxHeight
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chips = Array.from(container.children) as HTMLElement[]
    if (chips.length === 0) return

    const gap = parseFloat(getComputedStyle(container).rowGap) || 0
    const rowH = chips[0].offsetHeight
    const hiddenRowTop = row * (rowH + gap)
    const collapsed = row * rowH + (row - 1) * gap

    setCollapsedHeight(collapsed)
    setFullHeight(container.scrollHeight)

    const containerTop = container.getBoundingClientRect().top
    const hiddenSelected = chips.some((chip, i) => {
      const relativeTop = chip.getBoundingClientRect().top - containerTop
      return relativeTop >= hiddenRowTop && selected.includes(values[i])
    })
    setHasHiddenSelected(hiddenSelected)
  }, [values, selected, row])

  return (
    <div>
      <motion.div
        ref={containerRef}
        className="flex flex-wrap gap-2 overflow-hidden"
        animate={{ maxHeight: expanded ? fullHeight : collapsedHeight }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
      >
        {values.map((v) => (
          <button key={v} type="button" onClick={() => onToggle(v)}>
            <Chip variant={selected.includes(v) ? 'primary' : 'disabled'}>{v}</Chip>
          </button>
        ))}
      </motion.div>

      {fullHeight > collapsedHeight && <motion.button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        animate={{ color: !expanded && hasHiddenSelected ? '#f97316' : '#a1a1aa' }}
        transition={{ duration: 0.2 }}
        className="mt-2 flex items-center gap-0.5 text-xs cursor-pointer"
      >
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <ChevronDown size={13} />
        </motion.div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={expanded ? 'less' : 'more'}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            {expanded ? 'Show less' : 'Show more'}
          </motion.span>
        </AnimatePresence>
      </motion.button>}
    </div>
  )
}
