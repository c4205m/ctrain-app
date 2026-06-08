import { useState } from "react"
import { motion, AnimatePresence, LayoutGroup, type PanInfo } from "framer-motion"
import { Grid3X3, Layers, LayoutList } from "lucide-react"
import type { Exercise } from "../db/db"
import ExerciseCardCompact from "./ExerciseCardCompact"


export type LayoutMode = "stack" | "grid" | "list"

export interface CardStackProps {
  cards?: Exercise[]
  className?: string
  layouts?: LayoutMode[]
  defaultLayout?: LayoutMode
  onCardClick?: (card: Exercise) => void
  cardSize?: number
  stackFrequency?: number
}

const layoutIcons = {
  stack: Layers,
  grid: Grid3X3,
  list: LayoutList,
}

const SWIPE_THRESHOLD = 50

export function CardStack({
  cards = [],
  className,
  layouts = ["stack", "grid", "list"],
  defaultLayout = "stack",
  onCardClick,
  cardSize = 192,
  stackFrequency = 1.4,
}: CardStackProps) {
  const [layout, setLayout] = useState<LayoutMode>(defaultLayout)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [rotations, setRotations] = useState<Record<string, number>>(
    () => Object.fromEntries(cards.map((c) => [c.id, (Math.random() - 0.5) * 6]))
  )

  // const [deckKey, setDeckKey] = useState(() => cards.map(c => c.id).join(","))

  const randomizeRotations = () => setRotations(Object.fromEntries(cards.map((c) => [c.id, (Math.random() - 0.5) * 6])))

  // useEffect(() => {
  //   setActiveIndex(0)
  //   setRotations(Object.fromEntries(cards.map((c) => [c.id, (Math.random() - 0.5) * 6])))
  //   setDeckKey(cards.map(c => c.id).join(","))
  // }, [cards])

  if (!cards || cards.length === 0) {
    return null
  }

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info
    const swipe = Math.abs(offset.x) * velocity.x

    if (offset.x < -SWIPE_THRESHOLD || swipe < -1000) {
      setActiveIndex((prev) => (prev + 1) % cards.length)
      randomizeRotations()
    } else if (offset.x > SWIPE_THRESHOLD || swipe > 1000) {
      setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length)
      randomizeRotations()
    }
    setIsDragging(false)
  }

  const getStackOrder = () => {
    const reordered = []
    for (let i = 0; i < cards.length; i++) {
      const index = (activeIndex + i) % cards.length
      reordered.push({ ...cards[index], stackPosition: i })
    }
    return reordered.reverse()
  }

  const stackOffset = Math.round(stackFrequency * window.innerHeight ** 1.9 / 1e4)
  const getLayoutStyles = (stackPosition: number, cardId: string) => {
    switch (layout) {
      case "stack":
        return {
          top: stackPosition * -stackOffset + (cards.length - 1) * stackOffset,
          left: 0,
          zIndex: cards.length - stackPosition,
          rotate: (stackPosition - 1) * (rotations[cardId] ?? (Math.random() - 0.5) * 6),
        }
      case "grid":
        return {
          top: 0,
          left: 0,
          zIndex: 1,
          rotate: 0,
        }
      case "list":
        return {
          top: 0,
          left: 0,
          zIndex: 1,
          rotate: 0,
        }
    }
  }

  const stackHeight = (cards.length - 1) * stackOffset + cardSize

  const containerStyles = {
    stack: "relative mx-auto",
    grid: "grid grid-cols-2 gap-3",
    list: "flex flex-col gap-3",
  }

  const containerInlineStyle = layout === "stack"
    ? { width: cardSize, height: stackHeight }
    : undefined

  const displayCards = layout === "stack" ? getStackOrder() : cards.map((c, i) => ({ ...c, stackPosition: i }))

  return (
    <div className={`space-y-4 ${className ? `${className}` : ""}`}>
      {/* Layout Toggle */}
      {layouts.length > 1 && (
        <div className="flex items-center justify-center gap-1 rounded-lg bg-secondary/50 p-1 w-fit mx-auto">
          {layouts.map((mode) => {
            const Icon = layoutIcons[mode]
            return (
              <button
                key={mode}
                onClick={() => setLayout(mode)}
                className={`rounded-md p-2 transition-all ${layout === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                aria-label={`Switch to ${mode} layout`}
              >
                <Icon className="h-4 w-4" />
              </button>
            )
          })}
        </div>
      )}

      {/* Cards Container */}
      {/* <LayoutGroup key={`${deckKey}-${layout}`}> */}
      <LayoutGroup key={`${layout}`}>
        <motion.div layout className={containerStyles[layout]} style={containerInlineStyle}>
          <AnimatePresence mode="popLayout">
            {displayCards.map((card) => {
              const styles = getLayoutStyles(card.stackPosition, card.id ?? card.name)
              const isTopCard = layout === "stack" && card.stackPosition === 0

              const cardKey = card.id ?? card.name
              return (
                <motion.div
                  key={cardKey}
                  layoutId={cardKey}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x: 0,
                    ...styles,
                  }}
                  exit={{ opacity: 0, scale: 0.8, x: -200 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                  drag={isTopCard ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={handleDragEnd}
                  whileDrag={{ scale: 1.02, cursor: "grabbing" }}
                  className={`${
                    layout === "stack"
                      ? "absolute"
                      : layout === "grid"
                        ? "w-full aspect-square overflow-hidden"
                        : "w-full"
                  }`}
                  style={layout === "stack" ? { width: cardSize, height: cardSize } : undefined}
                >
                  <ExerciseCardCompact
                    exercise={card}
                    hideCollapsedChips={!isTopCard && layout === "stack"}
                    className={`${
                      layout === "stack"
                        ? "shadow-orange-100 shadow-2xl"
                        : layout === "grid"
                          ? "w-full aspect-square overflow-hidden"
                          : "w-full"
                    } flex flex-col justify-start`}
                    style={layout === "stack" ? { width: cardSize, height: cardSize } : undefined}
                    onTap={() => {
                      if (isDragging || (!isTopCard && layout === "stack")) return
                      onCardClick?.(card)
                    }}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>
    </div>
  )
}
