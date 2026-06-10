import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { db, updatePlansForExercise, type Exercise, type Log } from "../db/db";
import Button from "./Button";
import { toast } from "sonner";
import SegmentedControl from "./SegmentedControl";
import Input from "./Input";

interface LogModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  prefill?: { sets?: number; reps?: number; duration?: number };
}

const SET_TYPES: Log["setType"][] = ["rep", "distance", "duration"];

function volumeOf(log: Log): number {
  if (log.setType !== "rep") return log.sets * log.effortPerSet;
  const w = log.bodyweight ? Math.max(log.weight, 1) : log.weight;
  return log.sets * log.effortPerSet * w;
}
const SET_TYPE_LABELS: Record<Log["setType"], string> = {
  rep: "Reps",
  distance: "Distance (m)",
  duration: "Duration (s)",
};

export default function LogModal({ exercise, isOpen, onClose, prefill }: LogModalProps) {
  const isSetTypeLocked = exercise?.latestLog != null;
  const [sets, setSets] = useState(3);
  const [effort, setEffort] = useState(10);
  const [setType, setSetType] = useState<Log["setType"]>("rep");
  const [setDuration, setSetDuration] = useState<number | "">("");
  const [weight, setWeight] = useState(0);
  const [bodyweight, setBodyweight] = useState(false);
  const [userWeight, setUserWeight] = useState(0);

  useEffect(() => {
    db.user.toArray().then((users) => {
      if (users[0]) setUserWeight(users[0].weight);
    });
  }, []);

  useEffect(() => {
    if (!exercise) return;
    const log = exercise.latestLog;
    const resolvedSetType = log?.setType ?? "rep";
    setSets(prefill?.sets ?? log?.sets ?? 3);
    setEffort(resolvedSetType === "duration" && prefill?.duration != null ? prefill.duration : prefill?.reps ?? log?.effortPerSet ?? 10);
    setSetType(resolvedSetType);
    setSetDuration(
      resolvedSetType !== "duration" && prefill?.duration != null
        ? prefill.duration
        : log?.setType !== "duration" && log?.duration ? log.duration : ""
    );
    setWeight(log?.weight ?? 0);
    setBodyweight(log?.bodyweight ?? false);
  }, [exercise, prefill]);

  function handleSave() {
    if (!exercise?.id) return;
    const newLog: Log = {
      date: new Date().toISOString(),
      sets,
      setType,
      effortPerSet: effort,
      ...(setType === "duration"
        ? { duration: effort }
        : setDuration !== ""
          ? { duration: setDuration }
          : {}),
      weight: bodyweight ? userWeight : weight,
      bodyweight,
    };
    const newVolume = volumeOf(newLog);
    const bestVolume = exercise.highestLog ? volumeOf(exercise.highestLog) : -1;
    onClose();
    db.exercises.update(exercise.id, {
      latestLog: newLog,
      ...(newVolume > bestVolume ? { highestLog: newLog } : {}),
    })
      .then(() => updatePlansForExercise(exercise.id!))
      .catch(() => toast.error("Failed to save log"));
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && exercise && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            layout="size"
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl px-6 py-8 shadow-2xl"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            <h2 className="text-lg font-bold text-zinc-900 mb-0.5">{exercise.name}</h2>
            <p className="text-xs text-zinc-400 mb-6">Log a set</p>

            <div className="space-y-4">
              <SegmentedControl
                options={SET_TYPES}
                selected={setType}
                onChange={setSetType}
                disabled={isSetTypeLocked}
              />
              {isSetTypeLocked && (
                <p className="text-xs text-zinc-400 -mt-2">Reset logs to change type</p>
              )}

              <div className="flex gap-3">
                <Input
                  label="Sets"
                  type="number"
                  inputMode="numeric"
                  value={sets}
                  min={1}
                  max={20}
                  onChange={(e) => setSets(Number(e.target.value))}
                  wrapperClassName="flex-1"
                />
                <Input
                  label={SET_TYPE_LABELS[setType]}
                  type="number"
                  inputMode={setType === "rep" ? "numeric" : "decimal"}
                  value={effort}
                  min={0.01}
                  max={setType === "duration" ? 3600 : setType === "distance" ? 99999 : 100}
                  step={setType === "rep" ? 1 : 0.01}
                  onChange={(e) => {
                    const raw = parseFloat(e.target.value);
                    setEffort(setType === "rep" ? Math.round(raw) : Math.round(raw * 100) / 100);
                  }}
                  wrapperClassName="flex-1"
                />
              </div>

            </div>

            <AnimatePresence initial={false}>
              {setType !== "duration" && (
                <motion.div
                  key="set-duration"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <Input
                    label="Set Duration (s)"
                    hint="— optional"
                    type="number"
                    inputMode="decimal"
                    value={setDuration}
                    min={0.01}
                    max={3600}
                    step={0.01}
                    placeholder="e.g. 45"
                    onChange={(e) =>
                      setSetDuration(
                        e.target.value === ""
                          ? ""
                          : Math.round(parseFloat(e.target.value) * 100) / 100,
                      )
                    }
                    wrapperClassName="pt-4"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4 mt-4">

              <Input
                label="Weight (kg)"
                type="number"
                inputMode="decimal"
                value={bodyweight ? userWeight : weight}
                disabled={bodyweight}
                onChange={(e) => setWeight(Number(e.target.value))}
              />

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bodyweight}
                  onChange={(e) => setBodyweight(e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-zinc-600">Bodyweight</span>
              </label>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={handleSave}>
                Save Log
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
