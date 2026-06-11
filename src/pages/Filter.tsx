import { motion, AnimatePresence } from "framer-motion";
import { useFilterStore } from "../store/filterStore";
import { DifficultyLevels, type DifficultyLevel } from "../db/types";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import FilterChipGroup from "../components/FilterChipGroup";
import MusclePicker from "../components/MusclePicker";


const DIFFICULTY_LABEL_VALUES = Object.keys(DifficultyLevels);

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

export default function Filter() {
  const {
    muscles, setMuscles,
    difficulty, setDifficulty,
    movementTypes, setMovementTypes,
    tools, setTools,
    reset,
    activeCount,
  } = useFilterStore();

  const toolValues = useLiveQuery(
    () => db.equipment.orderBy("name").toArray().then(eq => eq.map(e => e.name)),
    [], [] as string[]
  );
  const movementValues = useLiveQuery(
    () => db.movementTypes.orderBy("name").toArray().then(mt => mt.map(m => m.name)),
    [], [] as string[]
  );

  const count = activeCount();

  return (
    <div className="page-scroll">
      <div className="p-4 pb-24">
        {/* Header */}
        <h1 className="font-heading font-bold text-[32px] leading-none text-zinc-900 mb-6">Filter</h1>

        {/* Muscles */}
        <h2 className="font-heading font-semibold text-sm text-zinc-900 mb-3">Muscles</h2>
        <MusclePicker
          muscles={muscles}
          onChange={setMuscles}
          modelWidth={220}
        />

        {/* Difficulty */}
        <h2 className="font-heading font-semibold text-sm text-zinc-900 mb-3 mt-5">Difficulty</h2>
        <FilterChipGroup
          values={DIFFICULTY_LABEL_VALUES}
          selected={difficulty}
          onToggle={(label) => setDifficulty(toggle(difficulty, label as DifficultyLevel))}
        />

        {/* Movement Type */}
        <h2 className="font-heading font-semibold text-sm text-zinc-900 mb-3 mt-5">Move</h2>
        <FilterChipGroup
          values={movementValues}
          selected={movementTypes}
          onToggle={(mt) => setMovementTypes(toggle(movementTypes, mt))}
          searchable
        />

        {/* Tools */}
        <h2 className="font-heading font-semibold text-sm text-zinc-900 mb-3 mt-5">Tools</h2>
        <FilterChipGroup
          values={toolValues}
          selected={tools}
          onToggle={(tool) => setTools(toggle(tools, tool))}
          searchable
        />

        <div className="sticky bottom-24 flex justify-center mt-8">
          <AnimatePresence>
            {count > 0 && (
              <motion.button
                type="button"
                onClick={reset}
                initial={{ opacity: 0, y: 12, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="flex items-center gap-1 bg-zinc-800 text-white text-sm font-medium px-5 py-2 rounded-full"
              >
                Clear
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
