import { useRef, useLayoutEffect, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Chip from './Chip'
import Input from './Input'
import { useSettingsStore } from '../store/settingsStore'

interface FilterChipGroupProps<T extends string> {
  values: T[]
  selected: T[]
  onToggle: (value: T) => void
  row?: number
  searchable?: boolean
}

export default function FilterChipGroup<T extends string>({
  values,
  selected,
  onToggle,
  row = 4,
  searchable = false,
}: FilterChipGroupProps<T>) {
  const chipSearchEnabled = useSettingsStore((s) => s.chipSearchEnabled)
  const showSearch = searchable && chipSearchEnabled
  const [expanded, setExpanded] = useState(false)
  const [query, setQuery] = useState('')
  const [collapsedHeight, setCollapsedHeight] = useState(0)
  const [fullHeight, setFullHeight] = useState(0)
  const [hasHiddenSelected, setHasHiddenSelected] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const searching = showSearch && query.trim().length > 0
  const visible = searching
    ? values.filter((v) => v.toLowerCase().includes(query.trim().toLowerCase()))
    : values

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
      return relativeTop >= hiddenRowTop && selected.includes(visible[i])
    })
    setHasHiddenSelected(hiddenSelected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, selected, row, query])

  return (
    <div>
      {showSearch && (
        <Input
          icon={<Search size={14} />}
          inputSize="sm"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          wrapperClassName="mb-2"
        />
      )}

      <motion.div
        ref={containerRef}
        className="flex flex-wrap gap-2 overflow-hidden"
        animate={{ maxHeight: expanded || searching ? fullHeight : collapsedHeight }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
      >
        {visible.map((v) => (
          <button key={v} type="button" onClick={() => onToggle(v)}>
            <Chip variant={selected.includes(v) ? 'primary' : 'disabled'}>{v}</Chip>
          </button>
        ))}
      </motion.div>

      {searching && visible.length === 0 && (
        <p className="text-xs text-zinc-400 mt-1">No matches.</p>
      )}

      {!searching && fullHeight > collapsedHeight && <motion.button
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
