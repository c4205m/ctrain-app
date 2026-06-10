import { useState } from "react";
import { useStopwatchStore } from "../store/stopwatchStore";
import ExerciseTab from "../lists/ExerciseTab";
import PlansTab from "../lists/PlanTab";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Exercise, type Plan } from "../db/db";
import LogModal from "../components/LogModal";
import ExerciseFormModal from "../components/ExerciseFormModal";
import AddPlanModal from "../components/AddPlanModal";
import ExercisePicker from "../components/ExercisePicker";
import SegmentedControl from "../components/SegmentedControl";

type Tab = "exercises" | "plans";

export default function List() {
  const [tab, setTab] = useState<Tab>("exercises");
  const { openWithSession } = useStopwatchStore();

  // Modal state
  const [logTarget, setLogTarget] = useState<Exercise | null>(null);
  const [logPrefill, setLogPrefill] = useState<{ sets: number; reps: number } | undefined>(undefined);
  const [exerciseFormTarget, setExerciseFormTarget] = useState<Exercise | "new" | null>(null);
  const [addPlanOpen, setAddPlanOpen] = useState(false);
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [pickerCallback, setPickerCallback] = useState<((ids: string[]) => void) | null>(null);
  const [pickerAlreadySelected, setPickerAlreadySelected] = useState<string[]>([]);

  const allExercises = useLiveQuery(() => db.exercises.toArray(), []) ?? [];

  function handleRequestPicker(alreadySelected: string[], callback: (ids: string[]) => void) {
    setPickerAlreadySelected(alreadySelected);
    setPickerCallback(() => callback);
    setExercisePickerOpen(true);
  }

  return (
    <div className="page-scroll">
      <div className="p-4 pb-24">
        <h1 className="font-heading font-bold text-[32px] leading-none text-zinc-900 mb-4">List</h1>

        {/* Tab switcher */}
        <SegmentedControl
          options={["exercises", "plans"]}
          selected={tab}
          onChange={setTab}
        />

        {tab === "exercises" ? (
          <ExerciseTab
            onLog={setLogTarget}
            onEdit={(ex) => setExerciseFormTarget(ex)}
            onAdd={() => setExerciseFormTarget("new")}
          />
        ) : (
          <PlansTab
            onLog={(ex, pe) => { setLogTarget(ex); setLogPrefill({ sets: pe.sets, reps: pe.reps }); }}
            onStartWorkout={(plan: Plan) => openWithSession({ plan, exercises: allExercises })}
            onAdd={() => setAddPlanOpen(true)}
            onRequestPicker={handleRequestPicker}
          />
        )}

        {/* Modals */}
        <LogModal
          exercise={logTarget}
          isOpen={logTarget !== null}
          onClose={() => { setLogTarget(null); setLogPrefill(undefined); }}
          prefill={logPrefill}
        />
        <ExerciseFormModal
          target={exerciseFormTarget}
          isOpen={exerciseFormTarget !== null}
          onClose={() => setExerciseFormTarget(null)}
        />
        <AddPlanModal isOpen={addPlanOpen} onClose={() => setAddPlanOpen(false)} />
        <ExercisePicker
          isOpen={exercisePickerOpen}
          exercises={allExercises}
          alreadySelected={pickerAlreadySelected}
          onConfirm={(ids) => {
            pickerCallback?.(ids);
            setExercisePickerOpen(false);
          }}
          onClose={() => setExercisePickerOpen(false)}
        />
      </div>
    </div>
  );
}
