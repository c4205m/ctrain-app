import { useState } from "react";
import { Search, Plus, ArrowUpDown, Dumbbell } from "lucide-react";
import Input from "../components/Input";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import ExerciseCard from "../components/ExerciseCard";
import { filterExercises, sortExercises, type SortKey } from "../utils/filterUtil";
import { useFilterStore } from "../store/filterStore";
import { db, type Exercise } from "../db/db";
import { useLiveQuery } from "dexie-react-hooks";

interface ExerciseTabProps {
  onLog: (exercise: Exercise) => void;
  onEdit: (exercise: Exercise) => void;
  onAdd: () => void;
}

const SORT_KEYS: SortKey[] = ["name", "difficulty", "muscles"];
const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  difficulty: "Difficulty",
  muscles: "Muscles",
};

export default function ExerciseTab({ onLog, onEdit, onAdd}: ExerciseTabProps) {
  const [search, setSearch] = useState("");
  const [sortIdx, setSortIdx] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sort = SORT_KEYS[sortIdx];
  const filterStore = useFilterStore();
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? [];

  const filtered = sortExercises(
    filterExercises(exercises, filterStore).filter((ex) =>
      ex.name.toLowerCase().includes(search.toLowerCase()),
    ),
    sort,
  );

  function cycleSort() {
    setSortIdx((i) => (i + 1) % SORT_KEYS.length);
  }

  return (
    <>
      <div className="sticky top-0 z-10 py-4 bg-linear-to-b from-background from-80% to-transparent">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              icon={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises…"
            />
          </div>
          <Button
            variant="ghost"
            aria-label="Sort"
            onClick={cycleSort}
            className="px-3 gap-1 text-xs"
          >
            <ArrowUpDown size={14} /> {SORT_LABELS[sort]}
          </Button>
          <Button variant="primary" aria-label="Add" onClick={onAdd} className="px-3">
            <Plus size={18} />
          </Button>
        </div>
        <p className="text-xs text-zinc-400 font-m text-center pt-4">
          {filtered.length} exercise{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className={`overflow-auto snap-y snap-mandatory`}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            heading="No exercises found"
            subtext={search ? "Try a different search term" : "Tap + to add your first exercise"}
            ctaLabel={!search ? "Add Exercise" : undefined}
            onCta={!search ? onAdd : undefined}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((ex) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
								snap="snap-start"
                isExpanded={expandedId === ex.id}
                onToggle={() => setExpandedId(expandedId === ex.id ? null : ex.id!)}
                onLog={() => onLog(ex)}
                onEdit={() => onEdit(ex)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
