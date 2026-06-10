import { useState, useMemo, useEffect, useRef, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Dumbbell, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, type Exercise } from "../db/db";
import { useFilterStore } from "../store/filterStore";
import { filterExercises } from "../utils/filterUtil";
import LogModal from "../components/LogModal";
import EmptyState from "../components/EmptyState";
import { CardStack } from "../components/CardStack";

const DICE_ICONS: LucideIcon[] = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

export default function Random() {
  const [deck, setDeck] = useState<Exercise[]>([]);
  const [logTarget, setLogTarget] = useState<Exercise | null>(null);
  const [diceIdx, setDiceIdx] = useState(0);

  const cardSize = useSyncExternalStore(
    (cb) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); },
    () => Math.max(0, Math.min(window.innerWidth, 430) - window.innerWidth / 2),
  );

  const filterStore = useFilterStore();
  const allExercises = useLiveQuery(() => db.exercises.toArray(), []) ?? [];

  const pool = useMemo(
    () => filterExercises(allExercises, filterStore),
    [allExercises, filterStore],
  );

  function shuffle() {
    setDeck([...pool].sort(() => Math.random() - 0.5).slice(0, 6));
    setDiceIdx(Math.floor(Math.random() * DICE_ICONS.length));
  }

  const hasShuffled = useRef(false);
  useEffect(() => {
    if (!hasShuffled.current && pool.length > 0) {
      hasShuffled.current = true;
      shuffle();
    }
  }, [pool]);

  return (
    <div className="page-scroll">
      <div className="p-4 pb-28 overflow-hidden">
        <h1 className="font-heading font-bold text-[32px] leading-none text-zinc-900 mb-6">Random</h1>
        {pool.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            heading="No exercises found"
            subtext={filterStore.activeCount() > 0 ? "Try adjusting your filters" : "Tap + to add your first exercise"}
          />
        ) : (
          <>
            <CardStack
              cards={deck}
              layouts={["stack", "grid"]}
              onCardClick={(x) => setLogTarget(x)}
              cardSize={cardSize}
            />

            {/* Shuffle Button */}
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="fixed bottom-24 left-0 right-0 flex flex-col items-center gap-1.5 pointer-events-none z-40"
              >
                <motion.button
                  type="button"
                  onClick={shuffle}
                  whileTap={{ scale: 0.82, rotate: 20 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className="w-15 h-15 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-200 cursor-pointer pointer-events-auto"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={diceIdx}
                      initial={{ rotate: -30, opacity: 0, scale: 0.7 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: 30, opacity: 0, scale: 0.7 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      {(() => {
                        const D = DICE_ICONS[diceIdx];
                        return <D size={36} className="text-white" />;
                      })()}
                    </motion.div>
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            </AnimatePresence>
          </>
        )}

        <LogModal
          exercise={logTarget}
          isOpen={logTarget !== null}
          onClose={() => setLogTarget(null)}
        />
      </div>
    </div>
  );
}
