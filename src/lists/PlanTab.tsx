import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ClipboardList, Plus, Search, ArrowUpDown } from "lucide-react";
import Button from "../components/Button";
import Input from "../components/Input";
import EmptyState from "../components/EmptyState";
import PlanCard from "../components/PlanCard";
import { db, type Exercise, type Plan } from "../db/db";
import { estimateDuration } from "../utils/timeUtil";

type SortKey = "name" | "duration";
const SORT_KEYS: SortKey[] = ["name", "duration"];
const SORT_LABELS: Record<SortKey, string> = { name: "Name", duration: "Duration" };

interface PlansTabProps {
  onLog: (exercise: Exercise, pe: { sets: number; reps: number }) => void;
  onAdd: () => void;
  onStartWorkout: (plan: Plan) => void;
  onRequestPicker: (alreadySelected: string[], callback: (ids: string[]) => void) => void;
}

export default function PlansTab({ onLog, onAdd, onStartWorkout, onRequestPicker }: PlansTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortIdx, setSortIdx] = useState(0);

  const sort = SORT_KEYS[sortIdx];
  const plans = useLiveQuery(() => db.plans.toArray(), []) ?? [];
  const exercises = useLiveQuery(() => db.exercises.toArray(), []) ?? [];

  const filtered = plans
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : estimateDuration(b, exercises) - estimateDuration(a, exercises),
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
              placeholder="Search plans…"
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
          <Button variant="primary" aria-label="New Plan" onClick={onAdd} className="px-3">
            <Plus size={18} />
          </Button>
        </div>
        <p className="text-xs text-zinc-400 font-medium text-center pt-4">
          {filtered.length} plan{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          heading="No plans yet"
          subtext="Create a plan to organize your workouts"
          ctaLabel="New Plan"
          onCta={onAdd}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              exercises={exercises}
              isExpanded={expandedId === plan.id}
              isEditing={editingId === plan.id}
              onToggle={() => {
                if (editingId === plan.id) setEditingId(null);
                setExpandedId(expandedId === plan.id ? null : plan.id!);
              }}
              onEditRequest={() => setEditingId(plan.id!)}
              onExitEdit={() => setEditingId(null)}
              onLog={onLog}
              onStartWorkout={onStartWorkout}
              onRequestPicker={onRequestPicker}
            />
          ))}
        </div>
      )}
    </>
  );
}
