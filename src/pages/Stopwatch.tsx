import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList } from "lucide-react";
import { useStopwatchStore, type PlanSession } from "../store/stopwatchStore";
import LogModal from "../components/LogModal";
import type { Exercise } from "../db/db";
import { useWakeLock } from "../utils/useWakeLock";

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centis).padStart(2, "0")}`;
}

function formatLapTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const centis = Math.floor((ms % 1000) / 10);
  return `${mins > 0 ? `${mins}:` : ""}${String(secs).padStart(mins > 0 ? 2 : 1, "0")}.${String(centis).padStart(2, "0")}`;
}

// Top padding while no laps recorded must clear the close button (top-4 + h-9 + gap)
const CLOSE_BTN_CLEARANCE = 64;

interface StopwatchProps {
  onClose?: () => void;
}

export default function Stopwatch({ onClose }: StopwatchProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    running, laps, currentLabel, isComplete, exIdx, setsDone,
    lapStartBase, session,
    getElapsed, start, pause, reset, recordLap, addExerciseDoneMarker,
    setCurrentLabel, setIsComplete, selectExercise, incrementSetDone, setSession,
  } = useStopwatchStore();

  // Sync session from location.state on mount only
  useEffect(() => {
    const locSession = (location.state as { session?: PlanSession } | null)?.session ?? null;
    if (locSession) setSession(locSession);
  }, []);

  const isPlanMode = !!session;

  useWakeLock(running);

  // Local display state — RAF updates this while mounted; store holds truth
  const [displayElapsed, setDisplayElapsed] = useState(() => getElapsed());

  useEffect(() => {
    if (!running) {
      setDisplayElapsed(getElapsed());
      return;
    }
    let rafId: number;
    const tick = () => {
      setDisplayElapsed(getElapsed());
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [running]);

  const currentLapElapsed = displayElapsed - lapStartBase;

  const planExercises = session?.plan.exercises ?? [];
  const planEx = planExercises[exIdx];
  const planExercise = session?.exercises.find((e) => e.id === planEx?.exerciseId);
  const totalSets = planEx?.sets ?? 1;
  const currentSet = (setsDone[exIdx] ?? 0) + 1;

  const exerciseName = (pe: { exerciseId: string }) =>
    session?.exercises.find((e) => e.id === pe.exerciseId)?.name ?? "Exercise";
  // Untouched exercises first (plan order), then partially-done ones — partials are
  // deferred to the end unless the user explicitly taps them
  const isPartial = (i: number) => (setsDone[i] ?? 0) > 0;
  const remaining = planExercises
    .map((pe, i) => ({ pe, i }))
    .filter(({ pe, i }) => i !== exIdx && (setsDone[i] ?? 0) < pe.sets);
  const upNext = [...remaining.filter(({ i }) => !isPartial(i)), ...remaining.filter(({ i }) => isPartial(i))];

  const isRest = currentLabel === "Rest";
  const clockColor = displayElapsed > 0
    ? (isRest ? "text-blue-500" : "text-orange-500")
    : "text-zinc-900";

  const [logTarget, setLogTarget] = useState<Exercise | null>(null);
  const [logPrefill, setLogPrefill] = useState<{ sets?: number; reps?: number; duration?: number } | undefined>(undefined);

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);
  // Set durations per plan-exercise index — survives switching exercises mid-way
  const setDurationsRef = useRef<Record<number, number[]>>({});

  const topContentRef = useRef<HTMLDivElement>(null);
  const [centerPad, setCenterPad] = useState(() => Math.round(window.innerHeight * 0.35));

  useLayoutEffect(() => {
    if (!topContentRef.current) return;
    const h = topContentRef.current.scrollHeight + 16; // pb-4
    setCenterPad(Math.max(CLOSE_BTN_CLEARANCE, Math.round((window.innerHeight - h) / 2)));
  }, [isPlanMode, isComplete]);

  function handleReset() {
    reset();
    setDisplayElapsed(0);
    setDurationsRef.current = {};
    if (isPlanMode) {
      if (onClose) onClose();
      else navigate("/dev/stopwatch", { replace: true, state: null });
    }
  }

  function avgDuration(idx: number): number | undefined {
    const ms = setDurationsRef.current[idx];
    if (!ms || ms.length === 0) return undefined;
    return Math.round(((ms.reduce((a, b) => a + b, 0) / ms.length) / 1000) * 100) / 100;
  }

  function handleFinishWorkout() {
    // Record the in-flight lap so its time isn't lost
    if (getElapsed() > lapStartBase) recordLap(currentLabel);
    planExercises.forEach((pe, i) => {
      const done = setsDone[i] ?? 0;
      if (done >= 1 && done < pe.sets) {
        addExerciseDoneMarker({
          label: exerciseName(pe),
          exerciseId: pe.exerciseId,
          sets: done,
          reps: pe.reps,
          duration: avgDuration(i),
        });
      }
    });
    pause();
    setIsComplete(true);
  }

  function handleLap(type: "Work" | "Rest") {
    if (!running) {
      start(type);
      return;
    }

    let lapLabel = currentLabel;
    let exerciseDoneMarker: { label: string; exerciseId?: string; sets?: number; reps?: number; duration?: number } | null = null;

    if (isPlanMode && currentLabel === "Work") {
      const isLastSet = currentSet >= totalSets;
      const name = planExercise?.name ?? "Exercise";
      lapLabel = `${name} • Set ${currentSet}`;

      const thisSetMs = getElapsed() - lapStartBase;
      (setDurationsRef.current[exIdx] ??= []).push(thisSetMs);
      incrementSetDone(exIdx);

      if (isLastSet) {
        exerciseDoneMarker = {
          label: name,
          exerciseId: planEx?.exerciseId,
          sets: planEx?.sets,
          reps: planEx?.reps,
          duration: avgDuration(exIdx),
        };

        // setsDone in closure is pre-increment; current exercise just finished.
        // Untouched exercises first — partials wait until the end.
        const candidates = planExercises
          .map((pe, i) => ({ pe, i }))
          .filter(({ pe, i }) => i !== exIdx && (setsDone[i] ?? 0) < pe.sets);
        const next =
          candidates.find(({ i }) => (setsDone[i] ?? 0) === 0) ?? candidates[0];
        if (!next) {
          pause();
          setIsComplete(true);
        } else {
          selectExercise(next.i);
        }
      }
    }

    recordLap(lapLabel);
    if (exerciseDoneMarker) addExerciseDoneMarker(exerciseDoneMarker);
    setCurrentLabel(type);
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
      <motion.div
        className="px-4 pb-4 shrink-0"
        animate={{ paddingTop: laps.length === 0 ? centerPad : CLOSE_BTN_CLEARANCE }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <div ref={topContentRef}>
          {/* Plan context */}
          {isPlanMode && !isComplete && (
            <div className="flex flex-col items-center mb-3">
              <span className="text-base font-semibold text-zinc-900">
                {planExercise?.name ?? "Exercise"}
              </span>
              <span className="text-xs text-zinc-400">
                Set {currentSet} of {totalSets}
              </span>
            </div>
          )}

          {isComplete && (
            <div className="flex flex-col items-center mb-3">
              <span className="text-base font-semibold text-zinc-900">Workout Complete</span>
              <span className="text-xs text-zinc-400">{formatTime(displayElapsed)} total</span>
            </div>
          )}

          {/* Timer display */}
          <motion.div
            className="flex flex-col items-center gap-1 mb-8 cursor-pointer"
            onClick={() => {
              if (didLongPressRef.current) { didLongPressRef.current = false; return; }
              if (displayElapsed === 0) return;
              if (running) pause(); else start();
            }}
            onPointerDown={() => {
              didLongPressRef.current = false;
              longPressRef.current = setTimeout(() => { didLongPressRef.current = true; handleReset(); }, 600);
            }}
            onPointerUp={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
            onPointerLeave={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
            whileTap={{ scale: 0.97 }}
            style={{ willChange: "transform" }}
          >
            <span className={`font-mono text-6xl font-semibold tabular-nums tracking-tight ${clockColor}`}>
              {displayElapsed > 0 ? formatTime(currentLapElapsed) : formatTime(0)}
            </span>
            {displayElapsed > 0 && (
              <span className="text-sm font-mono tabular-nums text-zinc-400">
                {currentLabel} • {formatTime(displayElapsed)}
              </span>
            )}
          </motion.div>

          {/* Controls */}
          {!isComplete && (
            <div className="flex gap-3 mb-6">
              <motion.button
                type="button"
                onClick={() => handleLap("Work")}
                whileTap={{ scale: 0.95 }}
                style={{ willChange: "transform" }}
                className="flex-1 bg-orange-500 text-white font-semibold py-4 rounded-2xl text-base"
              >
                Work
              </motion.button>
              <motion.button
                type="button"
                onClick={() => handleLap("Rest")}
                whileTap={{ scale: 0.95 }}
                style={{ willChange: "transform" }}
                className="flex-1 bg-blue-500 text-white font-semibold py-4 rounded-2xl text-base"
              >
                Rest
              </motion.button>
            </div>
          )}

          {/* Up next */}
          {isPlanMode && !isComplete && (
            <div className="mb-4">
              {upNext.length > 0 && (
                <>
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                    Up next
                  </span>
                  <div className="flex gap-2 overflow-x-auto mt-1.5 -mx-4 px-4 pb-1">
                    <AnimatePresence initial={false}>
                      {upNext.map(({ pe, i }) => (
                        <motion.button
                          key={i}
                          type="button"
                          layout
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          style={{ willChange: "transform" }}
                          onClick={() => selectExercise(i)}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer ${
                            isPartial(i) ? "bg-amber-50" : "bg-zinc-100"
                          }`}
                        >
                          <span className={`text-xs font-medium ${isPartial(i) ? "text-amber-700" : "text-zinc-700"}`}>
                            {exerciseName(pe)}
                          </span>
                          <span className={`text-[10px] font-mono tabular-nums ${isPartial(i) ? "text-amber-500" : "text-zinc-400"}`}>
                            {setsDone[i] ?? 0}/{pe.sets}
                          </span>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                </>
              )}
              {displayElapsed > 0 && (
                <button
                  type="button"
                  onClick={handleFinishWorkout}
                  className="mt-2 text-xs font-medium text-zinc-400 underline underline-offset-2 cursor-pointer"
                >
                  Finish workout
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Lap list — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-24">
        <AnimatePresence initial={false}>
          {(() => {
            let setNumber = laps.filter((l) => l.kind !== "exercise-done").length;
            return laps.map((lap, i) => {
              if (lap.kind === "exercise-done") {
                return (
                  <motion.div
                    key={laps.length - i}
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="flex items-center justify-between gap-3 my-2 px-3 py-2.5 rounded-xl bg-orange-50 border border-orange-100"
                  >
                    <span className="text-sm font-semibold text-zinc-900 truncate">{lap.label} finished</span>
                    <button
                      type="button"
                      onClick={() => {
                        const exercise = session?.exercises.find((e) => e.id === lap.exerciseId);
                        if (!exercise) return;
                        setLogTarget(exercise);
                        setLogPrefill({ sets: lap.sets, reps: lap.reps, duration: lap.duration });
                      }}
                      className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-orange-500 shrink-0 shadow-sm cursor-pointer"
                      aria-label="Log exercise"
                    >
                      <ClipboardList size={14} />
                    </button>
                  </motion.div>
                );
              }

              const lapNumber = setNumber--;
              return (
                <motion.div
                  key={laps.length - i}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="flex items-center justify-between py-3 border-b border-zinc-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${lap.label === "Rest" ? "bg-blue-500" : "bg-orange-500"}`} />
                    <span className="text-sm font-semibold text-zinc-900 truncate">{lap.label}</span>
                    <span className="text-xs text-zinc-400 shrink-0">Lap {lapNumber}</span>
                  </div>
                  <span className="font-mono text-sm text-zinc-700 tabular-nums">{formatLapTime(lap.ms ?? 0)}</span>
                </motion.div>
              );
            });
          })()}
        </AnimatePresence>
      </div>

      <LogModal
        exercise={logTarget}
        isOpen={logTarget !== null}
        onClose={() => { setLogTarget(null); setLogPrefill(undefined); }}
        prefill={logPrefill}
      />
    </div>
  );
}
