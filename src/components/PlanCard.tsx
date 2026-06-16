import { useState, useEffect } from "react";
import { ChevronDown, Plus, GripVertical, Trash2, Pencil, Trash, Save, Share2 } from "lucide-react";
import { Reorder, useDragControls, motion, useMotionValue, useTransform, animate } from "framer-motion";
import Button from "../components/Button";
import NumericStepperGroup from "../components/NumericStepper";
import { updatePlan, deletePlan, type Plan, type Exercise } from "../db/db";
import { toast } from "sonner";
import Chip from "./Chip";
import { slugToTitle, capitalize, MUSCLE_COLOR } from "../utils/displayUtil";
import { estimateDuration } from "../utils/timeUtil";
import { buildPlanShareUrl, shareUrl, SHARE_MAX_EXERCISES } from "../utils/share";

const DELETE_THRESHOLD = -100;

type PlanExercise = Plan["exercises"][number];

const EFFORT_LABEL: Record<string, string> = { rep: "reps", distance: "m", duration: "s" };

interface DraggableRowProps {
  pe: PlanExercise;
  exName: string;
  idx: number;
  setType?: string;
  onUpdateSets: (v: number) => void;
  onUpdateReps: (v: number) => void;
  onRemove: () => void;
}

interface PlanCardProps {
  plan: Plan;
  exercises: Exercise[];
  isExpanded: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onEditRequest?: () => void;
  onExitEdit?: () => void;
  onLog: (exercise: Exercise, pe: PlanExercise) => void;
  onStartWorkout: (plan: Plan) => void;
  onRequestPicker: (alreadySelected: string[], callback: (ids: string[]) => void) => void;
}

function DraggableRow({ pe, exName, setType, onUpdateSets, onUpdateReps, onRemove }: DraggableRowProps) {
  const dragControls = useDragControls();
  const xPos = useMotionValue(0);
  const deleteOpacity = useTransform(xPos, [0, DELETE_THRESHOLD], [0, 1]);

  function handleDragEnd() {
    if (xPos.get() <= DELETE_THRESHOLD) {
      onRemove();
    } else {
      animate(xPos, 0, { type: "spring", stiffness: 400, damping: 35 });
    }
  }

  return (
    <Reorder.Item
      value={pe}
      dragListener={false}
      dragControls={dragControls}
      className="relative overflow-hidden select-none"
    >
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4"
      >
        <Trash2 size={16} className="text-white" />
      </motion.div>
      <motion.div
        style={{ x: xPos }}
        drag="x"
        dragConstraints={{ left: DELETE_THRESHOLD * 1.2, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className="relative flex items-center gap-2 bg-white px-1 py-1"
      >
        <div
          className="p-3 -m-1 text-zinc-300 cursor-grab active:cursor-grabbing shrink-0 touch-none"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <GripVertical size={18} />
        </div>
        <div className="flex-1 text-sm font-semibold text-zinc-900 truncate">{exName}</div>
        <NumericStepperGroup
          separator="×"
          steppers={[
            { value: pe.sets, onChange: onUpdateSets, min: 1, max: 20, label: "Sets" },
            { value: pe.reps, onChange: onUpdateReps, min: 1, max: 100, label: capitalize(EFFORT_LABEL[setType ?? "rep"] ?? "reps") },
          ]}
        />
      </motion.div>
    </Reorder.Item>
  );
}

export default function PlanCard({
  plan,
  exercises,
  isExpanded,
  isEditing,
  onToggle,
  onEditRequest,
  onLog,
  onStartWorkout,
  onRequestPicker,
  onExitEdit,
}: PlanCardProps) {
  const [draft, setDraft] = useState<PlanExercise[]>(plan.exercises);

  useEffect(() => { setDraft(plan.exercises) }, [plan.exercises, isEditing]);

  const durationMins = Math.ceil(estimateDuration(plan, exercises) / 60);
  const validCount = plan.exercises.filter((pe) => exercises.some((e) => e.id === pe.exerciseId)).length;

  function removeExercise(idx: number) {
    setDraft((d) => d.filter((_, i) => i !== idx));
  }

  function updateSets(idx: number, sets: number) {
    setDraft((d) => d.map((pe, i) => (i === idx ? { ...pe, sets } : pe)));
  }

  function updateReps(idx: number, reps: number) {
    setDraft((d) => d.map((pe, i) => (i === idx ? { ...pe, reps } : pe)));
  }

  function handlePickerCallback(ids: string[]) {
    const currentIds = new Set(draft.map((pe) => pe.exerciseId));
    const newEntries = ids
      .filter((id) => !currentIds.has(id))
      .map((id) => ({ exerciseId: id, sets: 3, reps: 10 }));
    setDraft((d) => [...d, ...newEntries]);
  }

  function openPicker() {
    onRequestPicker(
      draft.map((pe) => pe.exerciseId),
      handlePickerCallback,
    );
  }

  function handleSave() {
    onExitEdit?.();
    updatePlan({ ...plan, exercises: draft }).catch(() => toast.error("Failed to save plan"));
  }

  function handleCancel() {
    setDraft(plan.exercises);
    onExitEdit?.();
  }

  function handleDelete() {
    onToggle();
    deletePlan(plan.id!).catch(() => toast.error("Failed to delete plan"));
  }

  async function handleShare() {
    if (plan.exercises.length > SHARE_MAX_EXERCISES) {
      toast.error(`Plans over ${SHARE_MAX_EXERCISES} exercises can't be shared as a link`);
      return;
    }
    try {
      const result = await shareUrl(buildPlanShareUrl(plan, exercises), plan.name);
      if (result === "copied") toast.success("Link copied");
    } catch {
      // user dismissed the share sheet
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shrink-0 w-full h-full">
      {/* Collapsed header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
      >
        <div className="flex-1">
          <div className="font-semibold text-zinc-900">{plan.name}</div>
          {plan.description && (
            <div className="text-xs text-zinc-500 mt-0.5">{plan.description}</div>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-zinc-400">{validCount} exercises</span>
            <span className="text-xs text-zinc-300"></span>
            <span className="text-xs text-zinc-400">~{durationMins} min</span>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`text-zinc-400 shrink-0 mt-0.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded detail mode */}
      {isExpanded && !isEditing && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 space-y-2">
          {draft.map((pe) => {
            const ex = exercises.find((e) => e.id === pe.exerciseId);
            if (!ex) return null;
            return (
              <div key={pe.exerciseId} className="flex items-center justify-between py-1">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">{ex.name}</div>
                  <div className="text-xs text-zinc-400">{pe.sets} sets × {pe.reps} {EFFORT_LABEL[ex.latestLog?.setType ?? "rep"] ?? "Reps"}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ex.muscles.map((m) => (
                      <Chip
                        key={m}
                        variant="custom"
                        size="sm"
                        style={{ backgroundColor: MUSCLE_COLOR[m], color: "#fff", border: "none" }}
                      >
                        {slugToTitle(m)}
                      </Chip>
                    ))}
                  </div>
                </div>
                <Button
                  variant="success"
                  className="text-xs py-1.5 px-3"
                  aria-label="+Log"
                  onClick={() => onLog(ex, pe)}
                >
                  +Log
                </Button>
              </div>
            );
          })}
          <div className="flex gap-2 pt-2">
            <Button
              variant="primary"
              aria-label="Start Workout"
              onClick={() => onStartWorkout(plan)}
              className="flex-1 text-xs py-2"
            >
              Start Workout
            </Button>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              aria-label="Edit"
              onClick={onEditRequest}
              className="flex-1 text-xs py-2"
            >
              <Pencil size={14} /> Edit
            </Button>
            <Button
              variant="info"
              aria-label="Share"
              onClick={handleShare}
              className="flex-1 text-xs py-2"
            >
              <Share2 size={14} /> Share
            </Button>
            <Button
              variant="danger"
              aria-label="Delete"
              onClick={handleDelete}
              className="flex-1 text-xs py-2"
            >
              <Trash size={14} /> Delete
            </Button>
          </div>
        </div>
      )}

      {/* Edit mode */}
      {isExpanded && isEditing && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 space-y-2">
          <Reorder.Group axis="y" values={draft} onReorder={setDraft} className="space-y-2">
            {draft.map((pe, idx) => {
              const ex = exercises.find((e) => e.id === pe.exerciseId);
              return (
                <DraggableRow
                  key={pe.exerciseId}
                  pe={pe}
                  exName={ex?.name ?? pe.exerciseId}
                  setType={ex?.latestLog?.setType}
                  idx={idx}
                  onUpdateSets={(v) => updateSets(idx, v)}
                  onUpdateReps={(v) => updateReps(idx, v)}
                  onRemove={() => removeExercise(idx)}
                />
              );
            })}
          </Reorder.Group>

          <button
            type="button"
            onClick={openPicker}
            className="w-full flex items-center justify-center 
              gap-1.5 py-2.5 border-2 border-dashed border-zinc-200 
              rounded-xl text-sm font-medium text-zinc-400 
              hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add exercise…
          </button>

          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              aria-label="Cancel"
              onClick={handleCancel}
              className="flex-1 text-xs py-2"
            >
              Cancel
            </Button>
          
            <Button
              variant="primary"
              className="flex-1 text-xs py-2"
              aria-label="Save Plan"
              onClick={handleSave}
            >
              <Save size={14}/> Save Plan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
