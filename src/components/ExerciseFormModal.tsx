import { useState, useEffect } from "react";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { db, deleteExercise, resetLogs, type Exercise } from "../db/db";
import { DifficultyLevels, type MuscleGroup, type DifficultyLevel } from "../db/types";
import Input from "./Input";
import SegmentedControl from "./SegmentedControl";
import MusclePicker from "./MusclePicker";
import FilterChipGroup from "./FilterChipGroup";
import Button from "./Button";

interface ExerciseFormModalProps {
  target: Exercise | "new" | null;
  isOpen: boolean;
  onClose: () => void;
}

interface FormState {
  name: string;
  difficulty: DifficultyLevel;
  muscles: MuscleGroup[];
  tools: string[];
  movementType: string[];
  url: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  difficulty: DifficultyLevels.Beginner,
  muscles: [],
  tools: [],
  movementType: [],
  url: "",
};

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

const DIFFICULTIES = Object.values(DifficultyLevels);

export default function ExerciseFormModal({ target, isOpen, onClose }: ExerciseFormModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [allTools, setAllTools] = useState<string[]>([]);
  const [allMovement, setAllMovement] = useState<string[]>([]);

  useEffect(() => {
    db.equipment.toArray().then((rows) => setAllTools(rows.map((r) => r.name)));
    db.movementTypes.toArray().then((rows) => setAllMovement(rows.map((r) => r.name)));
  }, []);

  useEffect(() => {
    if (target === "new" || target === null) {
      setForm(EMPTY_FORM);
    } else {
      setForm({
        name: target.name,
        difficulty: target.difficulty,
        muscles: target.muscles,
        tools: target.tools,
        movementType: target.movementType,
        url: target.url ?? "",
      });
    }
  }, [target]);

  const isEdit = target !== "new" && target !== null;

  async function handleSubmit() {
    if (!form.name.trim() || form.muscles.length === 0) return;
    onClose();
    try {
      const data = { ...form, url: form.url || undefined };
      if (isEdit) {
        await db.exercises.update((target as Exercise).id!, data);
      } else {
        await db.exercises.add({ id: crypto.randomUUID(), ...data });
      }
    } catch {
      toast.error("Failed to save exercise");
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    onClose();
    try {
      await deleteExercise((target as Exercise).id!);
    } catch {
      toast.error("Failed to delete exercise");
    }
  }

  async function handleResetLogs() {
    if (!isEdit) return;
    onClose();
    try {
      await resetLogs((target as Exercise).id!);
      toast.success("Logs reset");
    } catch {
      toast.error("Failed to reset logs");
    }
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && target !== null && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh]"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            <div className="px-6 pt-7 pb-2 shrink-0">
              <h2 className="text-lg font-bold text-zinc-900">
                {isEdit ? "Edit Exercise" : "Add Exercise"}
              </h2>
            </div>

            <div className="overflow-y-auto px-6 pb-4 space-y-5 flex-1">
              {/* Name */}
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
                  Name
                </div>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Romanian Deadlift"
                />
              </div>

              {/* Difficulty */}
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
                  Difficulty
                </div>
                <SegmentedControl
                  options={DIFFICULTIES}
                  selected={form.difficulty}
                  onChange={(d) => setForm((f) => ({ ...f, difficulty: d }))}
                />
              </div>

              {/* Muscles */}
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
                  Muscles
                </div>
                <MusclePicker
                  muscles={form.muscles}
                  onChange={(muscles) => setForm((f) => ({ ...f, muscles }))}
                />
              </div>

              {/* Equipment */}
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
                  Equipment
                </div>
                <FilterChipGroup
                  values={allTools}
                  selected={form.tools}
                  onToggle={(t) => setForm((f) => ({ ...f, tools: toggle(f.tools, t) }))}
                />
              </div>

              {/* Movement Type */}
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
                  Move
                </div>
                <FilterChipGroup
                  values={allMovement}
                  selected={form.movementType}
                  onToggle={(m) =>
                    setForm((f) => ({ ...f, movementType: toggle(f.movementType, m) }))
                  }
                />
              </div>

              {/* URL */}
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
                  Media (optional)
                </div>
                <Input
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://… or <iframe …/>"
                  type="text"
                />
              </div>

              {isEdit && (
                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="warning" fullWidth onClick={handleResetLogs}>
                    Reset Logs
                  </Button>
                  <Button variant="danger" fullWidth onClick={handleDelete}>
                    Delete Exercise
                  </Button>
                </div>
              )}
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 px-6 pb-6 pt-3 border-t border-zinc-100">
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  disabled={!form.name.trim() || form.muscles.length === 0}
                  onClick={handleSubmit}
                >
                  {isEdit ? "Save Changes" : "Add Exercise"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
